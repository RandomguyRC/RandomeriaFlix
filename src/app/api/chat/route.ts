import { NextRequest, NextResponse } from "next/server";
import { readSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 200;

export async function GET(request: NextRequest) {
  const session = await readSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const profileSlug = searchParams.get("profileSlug");

  if (!profileSlug) {
    return NextResponse.json({ error: "profileSlug required" }, { status: 400 });
  }

  const profile = await prisma.profile.findUnique({
    where: { slug: profileSlug },
  });

  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  const chatImport = await prisma.chatImport.findFirst({
    where: { profileId: profile.id },
    orderBy: { createdAt: "desc" },
  });

  if (!chatImport) {
    return NextResponse.json({ error: "No chat import found" }, { status: 404 });
  }

  const limit = Math.min(parseInt(searchParams.get("limit") || String(DEFAULT_LIMIT), 10), MAX_LIMIT);
  const beforeSortOrder = searchParams.get("beforeSortOrder");
  const afterSortOrder = searchParams.get("afterSortOrder");

  const totalCount = await prisma.chatMessage.count({
    where: { importId: chatImport.id },
  });

  const where = {
    importId: chatImport.id,
    ...(beforeSortOrder ? { sortOrder: { lt: parseInt(beforeSortOrder, 10) } } : {}),
    ...(afterSortOrder ? { sortOrder: { gt: parseInt(afterSortOrder, 10) } } : {}),
  };

  const descendingMessages = await prisma.chatMessage.findMany({
    where,
    orderBy: { sortOrder: "desc" },
    take: limit,
    include: {
      attachments: {
        include: { asset: true },
        orderBy: { id: "asc" },
      },
    },
  });

  const messages = descendingMessages.reverse();
  const oldestSortOrder = messages[0]?.sortOrder ?? null;
  const newestSortOrder = messages[messages.length - 1]?.sortOrder ?? null;

  const [olderCount, newerCount, bgSetting, bgYSetting] = await Promise.all([
    oldestSortOrder === null ? 0 : prisma.chatMessage.count({ where: { importId: chatImport.id, sortOrder: { lt: oldestSortOrder } } }),
    newestSortOrder === null ? 0 : prisma.chatMessage.count({ where: { importId: chatImport.id, sortOrder: { gt: newestSortOrder } } }),
    prisma.siteSetting.findUnique({ where: { key: "chatBackground" } }),
    prisma.siteSetting.findUnique({ where: { key: "chatBackgroundY" } }),
  ]);

  return NextResponse.json({
    messages: messages.map((msg) => ({
      id: msg.id,
      sortOrder: msg.sortOrder,
      dateLabel: msg.dateLabel,
      sender: msg.rawSender || "System",
      senderType: msg.systemEvent ? "system" : msg.isMine ? "random" : "cherry",
      text: msg.body || "",
      attachments: msg.attachments.map((attachment) => ({
        id: attachment.id,
        kind: attachment.asset?.kind || attachment.kind,
        originalRef: attachment.originalRef,
        assetId: attachment.assetId,
        url: attachment.assetId ? `/api/media/${attachment.assetId}` : null,
        downloadUrl: attachment.assetId ? `/api/media/${attachment.assetId}` : null,
        mimeType: attachment.asset?.mimeType || null,
        originalName: attachment.asset?.originalName || attachment.originalRef || "Attachment",
        sizeBytes: attachment.asset?.sizeBytes || null,
      })),
    })),
    importTitle: chatImport.title,
    chatBackground: bgSetting?.value || null,
    chatBackgroundY: bgYSetting?.value || "50",
    totalCount,
    hasOlder: olderCount > 0,
    hasNewer: newerCount > 0,
    oldestSortOrder,
    newestSortOrder,
  });
}
