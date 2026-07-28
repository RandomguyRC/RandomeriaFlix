import { NextRequest, NextResponse } from "next/server";
import { createWriteStream } from "fs";
import { mkdir, readFile, rm, writeFile, stat, rename, copyFile } from "fs/promises";
import { join } from "path";
import { pipeline } from "stream/promises";
import { Readable } from "stream";
import { nanoid } from "nanoid";
import { readSession } from "@/lib/auth";
import {
  isAllowedMimeType,
  resolveMimeType,
  createMediaAssetFromStoredFile,
} from "@/lib/media";
import heicConvert from "heic-convert";

export const runtime = "nodejs";
export const maxDuration = 300;

// Max size for a single chunk request. Kept small on purpose: on a flaky
// connection (e.g. college wifi) a smaller request is far more likely to
// finish before the connection drops, and if it doesn't, we only lose this
// one chunk instead of the whole file.
const MAX_CHUNK_SIZE = 12 * 1024 * 1024; // 12MB
const MAX_TOTAL_SIZE = 2048 * 1024 * 1024; // 2GB — matches MAX_FILE_SIZE in lib/media.ts

const TMP_DIR = join(process.cwd(), "data", "tmp", "media-uploads");

type Manifest = {
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

function uploadDirFor(uploadId: string): string {
  return join(TMP_DIR, safeUploadId(uploadId));
}

async function readManifest(uploadId: string): Promise<Manifest> {
  const manifestPath = join(uploadDirFor(uploadId), "manifest.json");
  const raw = await readFile(manifestPath, "utf8");
  return JSON.parse(raw) as Manifest;
}

async function writeManifest(manifest: Manifest) {
  const dir = uploadDirFor(manifest.uploadId);
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, "manifest.json"), JSON.stringify(manifest, null, 2));
}

async function cleanupUpload(uploadId: string) {
  await rm(uploadDirFor(uploadId), { recursive: true, force: true }).catch(() => undefined);
}

function isHeicFilename(name: string): boolean {
  const lower = name.toLowerCase();
  return lower.endsWith(".heic") || lower.endsWith(".heif");
}

export async function POST(request: NextRequest) {
  const session = await readSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action") || "chunk";
    const uploadId = safeUploadId(searchParams.get("uploadId") || nanoid());

    if (action === "start") {
      const body = await request.json();
      const totalSize = Number(body.totalSize || 0);
      const filename = String(body.filename || "upload.bin");
      const mimeType = String(body.mimeType || "application/octet-stream");

      if (!totalSize || totalSize > MAX_TOTAL_SIZE) {
        return NextResponse.json(
          { error: `File is too large. Max size is ${MAX_TOTAL_SIZE / 1024 / 1024}MB` },
          { status: 400 }
        );
      }
      if (!isAllowedMimeType(mimeType, filename)) {
        return NextResponse.json({ error: `File type ${mimeType} is not allowed` }, { status: 400 });
      }

      const dir = uploadDirFor(uploadId);
      await rm(dir, { recursive: true, force: true }).catch(() => undefined);
      await mkdir(dir, { recursive: true });

      const manifest: Manifest = {
        uploadId,
        filename,
        mimeType,
        totalSize,
        receivedBytes: 0,
        nextChunkIndex: 0,
        filePath: join(dir, "upload.tmp"),
      };
      await writeManifest(manifest);

      return NextResponse.json({ ok: true, uploadId, nextChunkIndex: 0 });
    }

    if (action === "chunk") {
      const manifest = await readManifest(uploadId);
      const chunkIndex = Number(searchParams.get("chunkIndex"));

      // Chunk already applied (e.g. client retried after a response got lost
      // in transit) — report success without writing it twice.
      if (chunkIndex < manifest.nextChunkIndex) {
        return NextResponse.json({
          ok: true,
          receivedBytes: manifest.receivedBytes,
          nextChunkIndex: manifest.nextChunkIndex,
          complete: manifest.receivedBytes === manifest.totalSize,
        });
      }
      if (chunkIndex !== manifest.nextChunkIndex) {
        return NextResponse.json(
          { error: "Unexpected chunk order", nextChunkIndex: manifest.nextChunkIndex },
          { status: 409 }
        );
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

    if (action === "finish") {
      const manifest = await readManifest(uploadId);
      if (manifest.receivedBytes !== manifest.totalSize) {
        return NextResponse.json(
          { error: "Upload is incomplete", receivedBytes: manifest.receivedBytes },
          { status: 400 }
        );
      }

      let finalPath = manifest.filePath;
      let finalName = manifest.filename;
      let finalMime = manifest.mimeType;

      // HEIC images need converting before we hand them to the media library.
      if (isHeicFilename(manifest.filename)) {
        try {
          const buffer = await readFile(manifest.filePath);
          const outputBuffer = await heicConvert({ buffer, format: "JPEG", quality: 0.92 });
          finalName = manifest.filename.replace(/\.(heic|heif)$/i, ".jpg");
          finalMime = "image/jpeg";
          finalPath = join(uploadDirFor(uploadId), finalName);
          await writeFile(finalPath, outputBuffer);
        } catch (err) {
          console.error("HEIC conversion failed:", err);
          await cleanupUpload(uploadId);
          return NextResponse.json(
            { error: "Failed to convert HEIC image. Try converting to JPEG first." },
            { status: 400 }
          );
        }
      }

      const resolvedMime = resolveMimeType(finalMime, finalName);
      if (!isAllowedMimeType(resolvedMime, finalName)) {
        await cleanupUpload(uploadId);
        return NextResponse.json({ error: `File type ${resolvedMime} is not allowed` }, { status: 400 });
      }

      // Move the assembled file into the real uploads dir under its own
      // storage name, then register it as a MediaAsset.
      const ext = finalName.split(".").pop() || "bin";
      const storageFilename = `${nanoid()}.${ext}`;
      const uploadsDir = join(process.cwd(), "data/uploads");
      await mkdir(uploadsDir, { recursive: true });
      const destPath = join(uploadsDir, storageFilename);

      // rename() is an instant metadata-only move as long as both paths are
      // on the same filesystem (they are — both under data/ in this repo).
      // Falls back to a streamed copy if that's ever not the case (e.g.
      // TMP_DIR mounted on a different volume).
      try {
        await rename(finalPath, destPath);
      } catch {
        await copyFile(finalPath, destPath);
      }

      const stats = await stat(destPath);
      const result = await createMediaAssetFromStoredFile({
        storagePath: storageFilename,
        originalName: finalName,
        mimeType: resolvedMime,
      });

      await cleanupUpload(uploadId);

      return NextResponse.json({
        id: result.id,
        storagePath: result.storagePath,
        originalName: finalName,
        mimeType: resolvedMime,
        sizeBytes: stats.size,
      });
    }

    if (action === "abort") {
      await cleanupUpload(uploadId);
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    console.error("Chunked media upload error:", error);
    const message = error instanceof Error ? error.message : "Upload failed";
    return NextResponse.json({ error: message || "Upload failed" }, { status: 500 });
  }
}
