import { NextResponse } from "next/server";
import { startExport, getExportStatus } from "@/lib/export-job";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const status = getExportStatus();

  if (status.state === "zipping" || status.state === "finalizing") {
    return NextResponse.json({ ok: true, alreadyRunning: true, status });
  }

  if (status.state === "ready") {
    // A previous zip is sitting there ready — let the client just download it.
    return NextResponse.json({ ok: true, alreadyReady: true, status });
  }

  try {
    await startExport();
    return NextResponse.json({ ok: true, status: getExportStatus() });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Could not start export";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
