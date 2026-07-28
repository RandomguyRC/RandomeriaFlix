import { NextRequest, NextResponse } from "next/server";
import { readSession } from "@/lib/auth";
import * as callSignal from "@/lib/call-signal";
import type { Role } from "@/lib/call-signal";

// POST /api/live-chat/call/signal  { kind: "offer" | "answer" | "candidate", data }
export async function POST(request: NextRequest) {
  const session = await readSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const role = session.role as Role;

  const body = await request.json().catch(() => null);
  const kind = body?.kind as string;

  if (kind !== "offer" && kind !== "answer" && kind !== "candidate") {
    return NextResponse.json({ error: "invalid kind" }, { status: 400 });
  }

  callSignal.relaySignal(role, kind, body?.data);
  return NextResponse.json({ ok: true });
}
