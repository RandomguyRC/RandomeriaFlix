import { NextRequest, NextResponse } from "next/server";
import { readSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

// GET /api/live-chat?after=<ISO timestamp>
// Returns messages newer than `after`. Omit `after` to get the last 100 messages (initial load).
export async function GET(request: NextRequest) {
  const session = await readSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const after = searchParams.get("after");

  const messages = await prisma.liveChatMessage.findMany({
    where: after ? { createdAt: { gt: new Date(after) } } : undefined,
    orderBy: { createdAt: "asc" },
    take: after ? undefined : 100,
    ...(after
      ? {}
      : {
          orderBy: { createdAt: "desc" },
        }),
  });

  // When doing the initial load (no `after`) we fetched newest-first to apply `take`,
  // so flip it back to chronological order before returning.
  const ordered = after ? messages : messages.reverse();

  // Mark the other person's messages as read whenever this user polls/loads the chat.
  const otherSender = session.role === "admin" ? "viewer" : "admin";
  await prisma.liveChatMessage.updateMany({
    where: { sender: otherSender, readAt: null },
    data: { readAt: new Date() },
  });

  return NextResponse.json({ messages: ordered, role: session.role });
}

// POST /api/live-chat  { content: string }
export async function POST(request: NextRequest) {
  const session = await readSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const content = typeof body?.content === "string" ? body.content.trim() : "";

  if (!content) {
    return NextResponse.json({ error: "content required" }, { status: 400 });
  }
  if (content.length > 4000) {
    return NextResponse.json({ error: "message too long" }, { status: 400 });
  }

  const message = await prisma.liveChatMessage.create({
    data: {
      sender: session.role, // "admin" | "viewer"
      content,
    },
  });

  return NextResponse.json({ message });
}
