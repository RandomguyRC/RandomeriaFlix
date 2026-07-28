import { NextRequest, NextResponse } from "next/server";
import { readSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { touch } from "@/lib/presence";
import * as callSignal from "@/lib/call-signal";
import type { Role } from "@/lib/call-signal";

// GET /api/live-chat/call/poll?after=<seq>
// Fast poll (client calls this every ~500ms) — separate from the normal
// 2s chat poll because call signaling (ringing, SDP, ICE candidates) needs
// much lower latency. Only runs while a call is ringing or active.
export async function GET(request: NextRequest) {
  const session = await readSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const role = session.role as Role;

  touch(role); // being on a call also counts as an online heartbeat

  const { searchParams } = new URL(request.url);
  const after = parseInt(searchParams.get("after") || "0", 10) || 0;

  // Opportunistically expire a call nobody answered, and log it as missed.
  const timedOut = callSignal.checkRingTimeout();
  if (timedOut) {
    await prisma.liveChatMessage.create({
      data: {
        sender: timedOut.callerRole,
        kind: "CALL",
        callType: timedOut.callType,
        callOutcome: "no_answer",
        callDurationMs: 0,
      },
    });
  }

  // Opportunistically recover a call stuck "active" forever (client never
  // reported its hangup — failed camera grab, crash, lost connection, etc).
  const staleActive = callSignal.checkStaleActive();
  if (staleActive) {
    await prisma.liveChatMessage.create({
      data: {
        sender: staleActive.callerRole,
        kind: "CALL",
        callType: staleActive.callType,
        callOutcome: "completed",
        callDurationMs: staleActive.durationMs,
      },
    });
  }

  const signals = callSignal.pullSignals(role, after);
  const lastSeq = signals.length ? signals[signals.length - 1].seq : after;

  return NextResponse.json({
    state: callSignal.getState(),
    signals,
    lastSeq,
  });
}
