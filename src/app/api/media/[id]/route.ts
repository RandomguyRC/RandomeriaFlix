import { NextRequest, NextResponse } from "next/server";
import { statSync, createReadStream } from "fs";
import { join } from "path";
import { prisma } from "@/lib/db";
import { readSession } from "@/lib/auth";

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
    const range = request.headers.get("range");

    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunkSize = end - start + 1;

      const stream = createReadStream(filePath, { start, end });

      // Convert Node stream to Web ReadableStream with proper error handling
      const webStream = new ReadableStream({
        start(controller) {
          stream.on("data", (chunk) => {
            try {
              controller.enqueue(new Uint8Array(chunk));
            } catch {
              // Controller already closed (client disconnected) — stop cleanly
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
        },
      });
    }

    // Full file — stream it
    const stream = createReadStream(filePath);

    const webStream = new ReadableStream({
      start(controller) {
        stream.on("data", (chunk) => {
          try {
            controller.enqueue(new Uint8Array(chunk));
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
      },
    });
  } catch {
    return NextResponse.json({ error: "File not found on disk" }, { status: 404 });
  }
}
