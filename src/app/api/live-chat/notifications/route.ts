import { NextRequest, NextResponse } from "next/server";
import { readSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

// GET /api/live-chat/notifications?after=<ISO timestamp>
// Returns only the OTHER person's messages sent after `after`.
// Deliberately has no side effects (doesn't touch presence or read receipts) —
// this is polled site-wide in the background, not just while the chat is open,
// so it must stay cheap and must not falsely mark you "online" in the chat itself.
export async function GET(request: NextRequest) {
  const session = await readSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = session.role as "admin" | "viewer";
  const otherRole = role === "admin" ? "viewer" : "admin";

  const { searchParams } = new URL(request.url);
  const after = searchParams.get("after");

  const messages = await prisma.liveChatMessage.findMany({
    where: {
      sender: otherRole,
      ...(after ? { createdAt: { gt: new Date(after) } } : {}),
    },
    orderBy: { createdAt: "asc" },
    take: 20,
  });

  return NextResponse.json({ messages });
}
