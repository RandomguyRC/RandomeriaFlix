import { NextRequest, NextResponse } from "next/server";
import { readSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

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

  // Pagination support
  const page = parseInt(searchParams.get("page") || "0");
  const limit = parseInt(searchParams.get("limit") || "100");
  const offset = page * limit;

  const totalCount = await prisma.chatMessage.count({
    where: { importId: chatImport.id },
  });

  const messages = await prisma.chatMessage.findMany({
    where: { importId: chatImport.id },
    orderBy: { sortOrder: "asc" },
    skip: offset,
    take: limit,
  });

  // Fetch chat background settings
  const [bgSetting, bgYSetting] = await Promise.all([
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
      text: msg.body,
    })),
    importTitle: chatImport.title,
    chatBackground: bgSetting?.value || null,
    chatBackgroundY: bgYSetting?.value || "50",
    totalCount,
    hasMore: offset + limit < totalCount,
    page,
  });
}
