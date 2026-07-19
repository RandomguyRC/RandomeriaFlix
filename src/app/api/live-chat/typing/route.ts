import { NextRequest, NextResponse } from "next/server";
import { readSession } from "@/lib/auth";
import { setTyping } from "@/lib/presence";

// POST /api/live-chat/typing  { typing: boolean }
export async function POST(request: NextRequest) {
  const session = await readSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const typing = Boolean(body?.typing);

  setTyping(session.role as "admin" | "viewer", typing);

  return NextResponse.json({ ok: true });
}
