import { createReadStream, statSync } from "fs";
import { Readable } from "stream";
import { getExportStatus, getExportFilePath, finalizeDownload } from "@/lib/export-job";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const status = getExportStatus();
  const filePath = getExportFilePath();

  if (status.state !== "ready" || !filePath) {
    return new Response(JSON.stringify({ error: "No export ready. Start one first." }), {
      status: 409,
      headers: { "Content-Type": "application/json" },
    });
  }

  const stats = statSync(filePath);
  const nodeStream = createReadStream(filePath);

  // Whether the download finishes normally or the connection drops, clean
  // up the zip from disk either way so it never lingers.
  nodeStream.on("close", () => {
    finalizeDownload();
  });
  nodeStream.on("error", () => {
    finalizeDownload();
  });

  const webStream = Readable.toWeb(nodeStream) as ReadableStream;

  return new Response(webStream, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${status.fileName ?? "randomeriaflix-export.zip"}"`,
      "Content-Length": String(stats.size),
    },
  });
}
