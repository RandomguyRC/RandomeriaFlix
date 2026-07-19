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
    return NextResponse.json({ dates: [] });
  }

  // Get all unique date labels from ALL messages (not just paginated)
  const allMessages = await prisma.chatMessage.findMany({
    where: { importId: chatImport.id },
    select: { dateLabel: true },
    orderBy: { sortOrder: "asc" },
  });

  const dateSet = new Set<string>();
  for (const msg of allMessages) {
    if (msg.dateLabel) {
      // Extract date part (DD/MM/YY)
      const datePart = msg.dateLabel.split(" ")[0];
      if (datePart) dateSet.add(datePart);
    }
  }

  // Also return total message count
  const totalCount = allMessages.length;

  return NextResponse.json({
    dates: Array.from(dateSet).sort(),
    totalMessages: totalCount,
  });
}
