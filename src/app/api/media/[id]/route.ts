import { NextRequest, NextResponse } from "next/server";
import { statSync, createReadStream } from "fs";
import { join } from "path";
import crypto from "crypto";
import sharp from "sharp";
import { prisma } from "@/lib/db";
import { readSession } from "@/lib/auth";

/** Serve images with long-lived cache (they're immutable once uploaded). */
const IMMUTABLE_CACHE = "public, max-age=31536000, immutable";

/** Serve videos and audio with shorter cache — still long, but allow revalidation. */
const STREAMING_CACHE = "public, max-age=86400, must-revalidate";

function isImageKind(kind: string) {
  return kind === "IMAGE";
}

function isStreamingKind(kind: string) {
  return kind === "VIDEO" || kind === "AUDIO";
}

function makeEtag(...parts: (string | number)[]): string {
  return crypto.createHash("md5").update(parts.join("-")).digest("hex").slice(0, 16);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await readSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const asset = await prisma.mediaAsset.findUnique({ where: { id } });
  if (!asset) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const filePath = join(process.cwd(), "data", "uploads", asset.storagePath);

  try {
    const stats = statSync(filePath);
    const fileSize = stats.size;
    const mtimeMs = stats.mtimeMs;

    // ETag from file size and mtime — content-addressed, cheap to compute.
    const etag = makeEtag(fileSize, mtimeMs);

    // Honour If-None-Match — browser can skip the full response.
    const ifNoneMatch = request.headers.get("if-none-match");
    if (ifNoneMatch === etag) {
      return new Response(null, { status: 304 });
    }

    const isImage = isImageKind(asset.kind);
    const isStreaming = isStreamingKind(asset.kind);
    const cacheControl = isImage
      ? IMMUTABLE_CACHE
      : isStreaming
        ? STREAMING_CACHE
        : "public, max-age=3600";

    // ── On-the-fly image resizing via ?w= width parameter ────────────
    // MovieCards and other thumbnails request small widths instead of
    // downloading huge originals.  Sharp handles the resize server-side.
    // Resized output is converted to WebP with no disk I/O.
    const resizeWidth = request.nextUrl.searchParams.get("w");
    if (resizeWidth && isImage) {
      const width = parseInt(resizeWidth, 10);
      if (width > 0 && width < 4000) {
        const resizedEtag = makeEtag(fileSize, mtimeMs, "w", width);

        const ifNoneMatchResized = request.headers.get("if-none-match");
        if (ifNoneMatchResized === resizedEtag) {
          return new Response(null, { status: 304 });
        }

        const buffer = await sharp(filePath)
          .rotate() // auto-applies EXIF orientation so the pixel data is physically rotated
          .resize({ width, withoutEnlargement: true })
          .webp({ quality: 80 })
          .toBuffer();

        return new Response(buffer as unknown as BodyInit, {
          headers: {
            "Content-Type": "image/webp",
            "Cache-Control": IMMUTABLE_CACHE,
            "ETag": resizedEtag,
            "Content-Length": String(buffer.length),
          },
        });
      }
      // Invalid width — fall through and serve the original
    }

    const range = request.headers.get("range");

    // ── Range request (used by video/audio players) ───────────────────
    if (range && isStreaming) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunkSize = end - start + 1;

      const stream = createReadStream(filePath, { start, end });

      const webStream = new ReadableStream({
        start(controller) {
          stream.on("data", (chunk: Buffer) => {
            try {
              controller.enqueue(new Uint8Array(chunk.buffer, chunk.byteOffset, chunk.byteLength));
            } catch {
              stream.destroy();
            }
          });
          stream.on("end", () => {
            try { controller.close(); } catch { /* already closed */ }
          });
          stream.on("error", (err) => {
            try { controller.error(err); } catch { /* already closed */ }
          });
        },
      });

      return new Response(webStream, {
        status: 206,
        headers: {
          "Content-Range": `bytes ${start}-${end}/${fileSize}`,
          "Accept-Ranges": "bytes",
          "Content-Length": String(chunkSize),
          "Content-Type": asset.mimeType,
          "Cache-Control": cacheControl,
          "ETag": etag,
        },
      });
    }

    // ── Full file — stream it ─────────────────────────────────────────
    // For images we pipe through sharp's .rotate() to bake EXIF orientation
    // into pixel data — browsers handle EXIF inconsistently.  Videos/audio
    // stream the original bytes directly for proper range-request support.
    if (isImage) {
      const buffer = await sharp(filePath)
        .rotate()
        .jpeg({ quality: 92 })
        .toBuffer();

      return new Response(buffer as unknown as BodyInit, {
        headers: {
          "Content-Type": asset.mimeType,
          "Cache-Control": cacheControl,
          "ETag": etag,
          "Content-Length": String(buffer.length),
        },
      });
    }

    const stream = createReadStream(filePath);

    const webStream = new ReadableStream({
      start(controller) {
        stream.on("data", (chunk: Buffer) => {
          try {
            controller.enqueue(new Uint8Array(chunk.buffer, chunk.byteOffset, chunk.byteLength));
          } catch {
            stream.destroy();
          }
        });
        stream.on("end", () => {
          try { controller.close(); } catch { /* already closed */ }
        });
        stream.on("error", (err) => {
          try { controller.error(err); } catch { /* already closed */ }
        });
      },
    });

    return new Response(webStream, {
      headers: {
        "Content-Length": String(fileSize),
        "Content-Type": asset.mimeType,
        "Accept-Ranges": "bytes",
        "Cache-Control": cacheControl,
        "ETag": etag,
      },
    });
  } catch {
    return NextResponse.json({ error: "File not found on disk" }, { status: 404 });
  }
}
