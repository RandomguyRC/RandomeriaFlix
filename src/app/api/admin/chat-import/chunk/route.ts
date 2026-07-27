import { NextRequest, NextResponse } from "next/server";
import { createWriteStream } from "fs";
import { mkdir, readFile, rm, writeFile } from "fs/promises";
import { join } from "path";
import { pipeline } from "stream/promises";
import { Readable } from "stream";
import { readSession } from "@/lib/auth";
import { importChatFromStoredFile, ImportFields, MAX_CHAT_UPLOAD_SIZE, TMP_DIR, UploadedChatFile } from "@/lib/chat-import";
import { detectSenders } from "@/lib/whatsapp-parser";
import yauzl from "yauzl";
import { basename, extname } from "path";

export const runtime = "nodejs";
export const maxDuration = 300;

const CHUNK_DIR = join(TMP_DIR, "chunks");
const MAX_CHUNK_SIZE = 64 * 1024 * 1024;

type ChunkManifest = ImportFields & {
  uploadId: string;
  filename: string;
  mimeType: string;
  totalSize: number;
  receivedBytes: number;
  nextChunkIndex: number;
  filePath: string;
};

function safeUploadId(uploadId: string): string {
  if (!/^[a-zA-Z0-9_-]{8,80}$/.test(uploadId)) throw new Error("Invalid upload id");
  return uploadId;
}

async function readManifest(uploadId: string): Promise<ChunkManifest> {
  const manifestPath = join(CHUNK_DIR, safeUploadId(uploadId), "manifest.json");
  const raw = await readFile(manifestPath, "utf8");
  return JSON.parse(raw) as ChunkManifest;
}

async function writeManifest(manifest: ChunkManifest) {
  const uploadDir = join(CHUNK_DIR, safeUploadId(manifest.uploadId));
  await mkdir(uploadDir, { recursive: true });
  await writeFile(join(uploadDir, "manifest.json"), JSON.stringify(manifest, null, 2));
}

async function cleanupUpload(uploadId: string) {
  await rm(join(CHUNK_DIR, safeUploadId(uploadId)), { recursive: true, force: true }).catch(() => undefined);
}

/**
 * Read text from the first .txt entry inside a lazy-opened zip.
 */
async function readPartialZipText(zipPath: string): Promise<string | null> {
  return new Promise((resolve) => {
    yauzl.open(zipPath, { lazyEntries: true, autoClose: true }, (err, zipfile) => {
      if (err || !zipfile) { resolve(null); return; }

      let resolved = false;
      // Track the best .txt entry found so far, preferring _chat.txt / whatsapp-named
      // files over any other .txt files that might be bundled in the zip.
      let bestEntry: yauzl.Entry | null = null;
      let bestIsPreferred = false;

      function readEntryText(entry: yauzl.Entry) {
        zipfile.openReadStream(entry, (err2, stream) => {
          if (err2 || !stream) {
            if (!resolved) { resolved = true; resolve(null); }
            return;
          }

          const chunks: Buffer[] = [];
          let collected = 0;
          const maxBytes = 512 * 1024; // 512KB sample

          stream.on("data", (chunk: Buffer) => {
            if (collected >= maxBytes) return;
            const part = typeof chunk === "string" ? Buffer.from(chunk) : chunk;
            const remaining = maxBytes - collected;
            if (remaining <= 0) return;
            chunks.push(part.length > remaining ? Buffer.from(part.buffer, part.byteOffset, remaining) : part);
            collected += chunks[chunks.length - 1].length;
          });

          stream.on("end", () => {
            if (!resolved) {
              resolved = true;
              resolve(Buffer.concat(chunks).toString("utf8"));
            }
          });

          stream.on("error", () => {
            if (!resolved) { resolved = true; resolve(null); }
          });
        });
      }

      zipfile.readEntry();
      zipfile.on("entry", (entry) => {
        if (resolved) return;
        if (/\/$/.test(entry.fileName)) { zipfile.readEntry(); return; }
        const name = basename(entry.fileName);
        const ext = extname(name).toLowerCase();
        if (ext !== ".txt") { zipfile.readEntry(); return; }

        const isPreferred = name === "_chat.txt" || name.toLowerCase().includes("whatsapp");

        if (isPreferred) {
          // Found the canonical WhatsApp export file — use it immediately.
          bestEntry = entry;
          bestIsPreferred = true;
          readEntryText(entry);
          return;
        }

        if (!bestEntry) {
          bestEntry = entry;
        }
        zipfile.readEntry();
      });

      // If we never found a preferred entry, fall back to the first .txt we saw.
      zipfile.on("end", () => {
        if (resolved) return;
        if (bestEntry && !bestIsPreferred) {
          readEntryText(bestEntry);
        } else {
          resolved = true;
          resolve(null);
        }
      });

      zipfile.on("error", () => {
        if (!resolved) { resolved = true; resolve(null); }
      });
    });
  });
}

async function detectFromZip(filePath: string): Promise<string[]> {
  const text = await readPartialZipText(filePath);
  if (!text) throw new Error("Could not read chat text from zip");
  return detectSenders(text);
}


async function detectFromTextFile(filePath: string): Promise<string[]> {
  const buffer = await readFile(filePath, { encoding: "utf8" });
  const sample = buffer.slice(0, 1024 * 1024);
  return detectSenders(sample);
}

export async function POST(request: NextRequest) {
  const session = await readSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const uploadId = safeUploadId(searchParams.get("uploadId") || "");
    const action = searchParams.get("action") || "chunk";

    if (action === "start") {
      const body = await request.json();
      const totalSize = Number(body.totalSize || 0);
      if (!totalSize || totalSize > MAX_CHAT_UPLOAD_SIZE) {
        return NextResponse.json({ error: "Chat export is too large. Max size is 5GB." }, { status: 400 });
      }

      const uploadDir = join(CHUNK_DIR, uploadId);
      await rm(uploadDir, { recursive: true, force: true }).catch(() => undefined);
      await mkdir(uploadDir, { recursive: true });

      const manifest: ChunkManifest = {
        uploadId,
        filename: String(body.filename || "chat-export.zip"),
        mimeType: String(body.mimeType || "application/octet-stream"),
        totalSize,
        receivedBytes: 0,
        nextChunkIndex: 0,
        filePath: join(uploadDir, "upload.tmp"),
        profileId: String(body.profileId || ""),
        title: String(body.title || ""),
        myNames: "",
        friendNames: "",
      };

      if (!manifest.profileId || !manifest.title) {
        return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
      }

      await writeManifest(manifest);
      return NextResponse.json({ ok: true, nextChunkIndex: 0 });
    }

    if (action === "chunk") {
      const manifest = await readManifest(uploadId);
      const chunkIndex = Number(searchParams.get("chunkIndex"));
      if (chunkIndex !== manifest.nextChunkIndex) {
        return NextResponse.json({ error: "Unexpected chunk order", nextChunkIndex: manifest.nextChunkIndex }, { status: 409 });
      }
      if (!request.body) return NextResponse.json({ error: "Missing chunk body" }, { status: 400 });

      const contentLength = Number(request.headers.get("content-length") || 0);
      if (!contentLength || contentLength > MAX_CHUNK_SIZE) {
        return NextResponse.json({ error: "Invalid chunk size" }, { status: 400 });
      }
      if (manifest.receivedBytes + contentLength > manifest.totalSize) {
        return NextResponse.json({ error: "Upload exceeds declared size" }, { status: 400 });
      }

      await pipeline(
        Readable.fromWeb(request.body as unknown as Parameters<typeof Readable.fromWeb>[0]),
        createWriteStream(manifest.filePath, { flags: "a" })
      );

      manifest.receivedBytes += contentLength;
      manifest.nextChunkIndex += 1;
      await writeManifest(manifest);

      return NextResponse.json({
        ok: true,
        receivedBytes: manifest.receivedBytes,
        nextChunkIndex: manifest.nextChunkIndex,
        complete: manifest.receivedBytes === manifest.totalSize,
      });
    }

    if (action === "detect") {
      const manifest = await readManifest(uploadId);
      if (manifest.receivedBytes !== manifest.totalSize) {
        return NextResponse.json({ error: "Upload is incomplete", receivedBytes: manifest.receivedBytes }, { status: 400 });
      }

      const isZip = manifest.filename.toLowerCase().endsWith(".zip");
      const senders = isZip ? await detectFromZip(manifest.filePath) : await detectFromTextFile(manifest.filePath);

      if (!senders || senders.length === 0) {
        // Clean up uploaded file — no point keeping it if we can't detect senders
        await cleanupUpload(uploadId);
        return NextResponse.json({ error: "Could not detect any senders in the chat" }, { status: 400 });
      }

      return NextResponse.json({ ok: true, senders });
    }

    if (action === "finish") {
      const manifest = await readManifest(uploadId);
      if (manifest.receivedBytes !== manifest.totalSize) {
        return NextResponse.json({ error: "Upload is incomplete", receivedBytes: manifest.receivedBytes }, { status: 400 });
      }

      const myNames = searchParams.get("myNames") || manifest.myNames;
      const friendNames = searchParams.get("friendNames") || manifest.friendNames;
      if (!myNames) {
        return NextResponse.json({ error: "Missing myNames — who are you?" }, { status: 400 });
      }

      const file: UploadedChatFile = {
        path: manifest.filePath,
        filename: manifest.filename,
        mimeType: manifest.mimeType,
        size: manifest.totalSize,
      };
      const fields: ImportFields = {
        profileId: manifest.profileId,
        title: manifest.title,
        myNames,
        friendNames,
      };

      try {
        const result = await importChatFromStoredFile(fields, file);
        await cleanupUpload(uploadId);
        return NextResponse.json({ success: true, ...result });
      } catch (err) {
        await cleanupUpload(uploadId);
        throw err;
      }
    }

    return NextResponse.json({ error: "Unknown chunk action" }, { status: 400 });
  } catch (error) {
    console.error("Chunked chat import error:", error);
    const message = error instanceof Error ? error.message : "Import failed";
    return NextResponse.json({ error: message || "Import failed" }, { status: 500 });
  }
}
