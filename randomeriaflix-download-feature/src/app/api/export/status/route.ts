import { NextResponse } from "next/server";
import { getExportStatus } from "@/lib/export-job";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(getExportStatus());
}
