import { NextRequest, NextResponse } from "next/server";
import { readSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const contentSchema = z.object({
  profileId: z.string().min(1),
  type: z.enum(["PHOTO", "VIDEO", "AUDIO"]),
  title: z.string().min(1),
  description: z.string().optional(),
  dateLabel: z.string().optional(),
  tags: z.string().optional(),
  mood: z.string().optional(),
  isFeatured: z.boolean().optional(),
  isPublished: z.boolean().optional(),
  isReel: z.boolean().optional(),
  videoRotation: z.number().optional(),
  mainAssetId: z.string().min(1),
  thumbnailAssetId: z.string().optional(),
  musicAssetId: z.string().optional(),
  musicStartMs: z.number().optional(),
  musicDurationMs: z.number().optional(),
  categoryId: z.string().optional(),
  detailCropX: z.number().optional(),
  detailCropY: z.number().optional(),
  thumbCropX: z.number().optional(),
  thumbCropY: z.number().optional(),
  aspectMode: z.enum(["auto", "portrait", "landscape"]).optional(),
  detailZoom: z.number().optional(),
});

// GET - list all content items
export async function GET(request: NextRequest) {
  const session = await readSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const profileId = searchParams.get("profileId");

  const where = profileId ? { profileId } : {};

  // Exclude reels from content library
  const items = await prisma.contentItem.findMany({
    where: { ...where, isReel: false },
    include: {
      mainAsset: true,
      thumbnailAsset: true,
      musicAsset: true,
      profile: { select: { id: true, name: true, slug: true } },
      placements: { include: { category: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(items);
}

// POST - create content item
export async function POST(request: NextRequest) {
  const session = await readSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const data = contentSchema.parse(body);

    const item = await prisma.contentItem.create({
      data: {
        profileId: data.profileId,
        type: data.type,
        title: data.title,
        description: data.description,
        dateLabel: data.dateLabel,
        tags: data.tags,
        mood: data.mood,
        isFeatured: data.isFeatured ?? false,
        isPublished: data.isPublished ?? true,
        isReel: data.isReel ?? false,
        videoRotation: data.videoRotation ?? 0,
        mainAssetId: data.mainAssetId,
        thumbnailAssetId: data.thumbnailAssetId,
        musicAssetId: data.musicAssetId,
        musicStartMs: data.musicStartMs ?? 0,
        musicDurationMs: data.musicDurationMs ?? 15000,
        detailCropX: data.detailCropX ?? 50,
        detailCropY: data.detailCropY ?? 50,
        thumbCropX: data.thumbCropX ?? 50,
        thumbCropY: data.thumbCropY ?? 50,
        aspectMode: data.aspectMode ?? "auto",
        detailZoom: data.detailZoom ?? 1,
        sortOrder: 0,
      },
      include: {
        mainAsset: true,
        thumbnailAsset: true,
        musicAsset: true,
      },
    });

    // If categoryId provided, create placement
    if (data.categoryId) {
      const maxSort = await prisma.contentPlacement.aggregate({
        where: { categoryId: data.categoryId },
        _max: { sortOrder: true },
      });

      await prisma.contentPlacement.create({
        data: {
          contentItemId: item.id,
          categoryId: data.categoryId,
          sortOrder: (maxSort._max.sortOrder ?? 0) + 10,
        },
      });
    }

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error("Create content error:", error);
    return NextResponse.json({ error: "Failed to create content" }, { status: 500 });
  }
}
