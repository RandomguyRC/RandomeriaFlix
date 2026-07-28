import { NextRequest, NextResponse } from "next/server";
import { readSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { touch, getStatus } from "@/lib/presence";
import { notifyNewMessage } from "@/lib/notify";

// GET /api/live-chat?after=<ISO timestamp>
// Returns messages newer than `after`. Omit `after` to get the last 100 messages (initial load).
export async function GET(request: NextRequest) {
  const session = await readSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = session.role as "admin" | "viewer";
  const otherRole = role === "admin" ? "viewer" : "admin";

  // Every poll = a heartbeat: this user is actively looking at the chat right now.
  touch(role);

  const { searchParams } = new URL(request.url);
  const after = searchParams.get("after");

  const messages = await prisma.liveChatMessage.findMany({
    where: after ? { createdAt: { gt: new Date(after) } } : undefined,
    orderBy: { createdAt: "asc" },
    take: after ? undefined : 100,
    include: { attachment: true },
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
  await prisma.liveChatMessage.updateMany({
    where: { sender: otherRole, readAt: null },
    data: { readAt: new Date() },
  });

  // Let the client know how far the PARTNER has read into OUR messages, so
  // "seen" ticks on our own sent bubbles update live even without a new
  // message arriving (polling with `after` only returns brand-new rows).
  const lastReadOfMine = await prisma.liveChatMessage.findFirst({
    where: { sender: role, readAt: { not: null } },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });

  return NextResponse.json({
    messages: ordered,
    role: session.role,
    partnerStatus: getStatus(otherRole),
    readUpTo: lastReadOfMine?.createdAt ?? null,
  });
}

// POST /api/live-chat
// Text message:  { content: string }
// Media message: { kind: "IMAGE" | "VIDEO" | "AUDIO", attachmentId: string, content?: string, durationMs?: number }
export async function POST(request: NextRequest) {
  const session = await readSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const kind =
    body?.kind === "IMAGE" || body?.kind === "VIDEO" || body?.kind === "AUDIO" ? body.kind : "TEXT";

  if (kind === "TEXT") {
    const content = typeof body?.content === "string" ? body.content.trim() : "";

    if (!content) {
      return NextResponse.json({ error: "content required" }, { status: 400 });
    }
    if (content.length > 4000) {
      return NextResponse.json({ error: "message too long" }, { status: 400 });
    }

    const message = await prisma.liveChatMessage.create({
      data: {
        sender: session.role,
        kind: "TEXT",
        content,
      },
      include: { attachment: true },
    });

    notifyNewMessage(session.role as "admin" | "viewer", content).catch(() => {});

    return NextResponse.json({ message });
  }

  // Media message — photo, video, or voice note. The file itself was already
  // uploaded via /api/live-chat/media; this just attaches the resulting
  // MediaAsset id to a new chat message.
  const attachmentId = typeof body?.attachmentId === "string" ? body.attachmentId : null;
  if (!attachmentId) {
    return NextResponse.json({ error: "attachmentId required" }, { status: 400 });
  }

  const asset = await prisma.mediaAsset.findUnique({ where: { id: attachmentId } });
  if (!asset) {
    return NextResponse.json({ error: "attachment not found" }, { status: 404 });
  }

  const caption = typeof body?.content === "string" ? body.content.trim().slice(0, 4000) : "";
  const durationMs = Number.isFinite(body?.durationMs) ? Math.max(0, Math.round(body.durationMs)) : null;

  const message = await prisma.liveChatMessage.create({
    data: {
      sender: session.role,
      kind,
      content: caption || null,
      attachmentId,
      durationMs,
    },
    include: { attachment: true },
  });

  const kindLabel = kind === "IMAGE" ? "📷 Photo" : kind === "VIDEO" ? "🎥 Video" : "🎤 Voice note";
  notifyNewMessage(session.role as "admin" | "viewer", caption ? `${kindLabel}: ${caption}` : kindLabel).catch(
    () => {}
  );

  return NextResponse.json({ message });
}
