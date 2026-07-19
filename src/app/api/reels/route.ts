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

  const items = await prisma.contentItem.findMany({
    where: {
      profileId: profile.id,
      isReel: true,
      isPublished: true,
    },
    include: {
      mainAsset: true,
      thumbnailAsset: true,
      _count: {
        select: {
          reelLikes: true,
          reelComments: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  // Check which reels the current user has liked
  const reelIds = items.map((i) => i.id);
  const userLikes = await prisma.reelLike.findMany({
    where: {
      contentId: { in: reelIds },
      sessionId: session.userId,
    },
  });
  const likedIds = new Set(userLikes.map((l) => l.contentId));

  const reels = items.map((item) => ({
    id: item.id,
    title: item.title,
    type: item.type,
    description: item.description,
    dateLabel: item.dateLabel,
    mood: item.mood,
    tags: item.tags,
    mainAsset: { id: item.mainAsset.id, mimeType: item.mainAsset.mimeType },
    thumbnailAsset: item.thumbnailAsset ? { id: item.thumbnailAsset.id } : null,
    likeCount: item._count.reelLikes,
    commentCount: item._count.reelComments,
    liked: likedIds.has(item.id),
  }));

  return NextResponse.json(reels);
}
