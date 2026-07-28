import { NextRequest, NextResponse } from "next/server";
import { readSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { notifyNewMessage } from "@/lib/notify";
import * as callSignal from "@/lib/call-signal";
import type { CallType, Role } from "@/lib/call-signal";

async function logCall(opts: {
  starterRole: Role;
  callType: CallType;
  outcome: "completed" | "missed" | "rejected" | "cancelled" | "no_answer";
  durationMs: number;
}) {
  await prisma.liveChatMessage.create({
    data: {
      sender: opts.starterRole,
      kind: "CALL",
      callType: opts.callType,
      callOutcome: opts.outcome,
      callDurationMs: opts.durationMs,
    },
  });
}

// POST /api/live-chat/call  { action: "invite" | "accept" | "reject" | "cancel" | "hangup", callType? }
export async function POST(request: NextRequest) {
  const session = await readSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const role = session.role as Role;

  const body = await request.json().catch(() => null);
  const action = body?.action as string;

  switch (action) {
    case "invite": {
      const callType: CallType = body?.callType === "video" ? "video" : "audio";
      const result = callSignal.invite(role, callType);
      if (!result.ok) {
        return NextResponse.json({ error: result.reason }, { status: 409 });
      }
      // Fire-and-forget: ping the other party's Telegram/email so they know
      // to open the app even if they're not currently looking at it.
      const label = callType === "video" ? "video call" : "audio call";
      notifyNewMessage(role, `📞 Incoming ${label} — open the app to answer`).catch(() => {});
      return NextResponse.json({ ok: true });
    }
    case "accept": {
      callSignal.accept(role);
      return NextResponse.json({ ok: true });
    }
    case "reject": {
      const info = callSignal.reject(role);
      if (info) await logCall({ starterRole: info.callerRole, callType: info.callType, outcome: "rejected", durationMs: 0 });
      return NextResponse.json({ ok: true });
    }
    case "cancel": {
      const info = callSignal.cancel(role);
      if (info) await logCall({ starterRole: info.callerRole, callType: info.callType, outcome: "cancelled", durationMs: 0 });
      return NextResponse.json({ ok: true });
    }
    case "hangup": {
      const info = callSignal.hangup(role);
      if (info) {
        await logCall({
          starterRole: info.callerRole,
          callType: info.callType,
          outcome: info.wasActive ? "completed" : "cancelled",
          durationMs: info.durationMs,
        });
      }
      return NextResponse.json({ ok: true });
    }
    default:
      return NextResponse.json({ error: "unknown action" }, { status: 400 });
  }
}
