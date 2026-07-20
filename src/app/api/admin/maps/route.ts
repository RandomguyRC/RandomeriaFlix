import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { readSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

const placeSchema = z.object({
  profileId: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  iconEmoji: z.string().trim().min(1).max(8).optional(),
  color: z.string().optional(),
  thumbnailContentId: z.string().optional().nullable(),
  isPublished: z.boolean().optional(),
  contentIds: z.array(z.string()).optional(),
});

export async function GET(request: NextRequest) {
  const session = await readSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const profileId = searchParams.get("profileId");
  if (!profileId) {
    return NextResponse.json({ error: "profileId is required" }, { status: 400 });
  }

  const [config, places] = await Promise.all([
    prisma.mapConfig.findUnique({ where: { profileId } }),
    prisma.mapPlace.findMany({
      where: { profileId },
      include: {
        media: {
          include: {
            contentItem: {
              include: {
                mainAsset: { select: { id: true, mimeType: true } },
                thumbnailAsset: { select: { id: true } },
              },
            },
          },
          orderBy: { sortOrder: "asc" },
        },
      },
      orderBy: { sortOrder: "asc" },
    }),
  ]);

  return NextResponse.json({
    config: config ?? { defaultLat: 22.9734, defaultLng: 78.6569, defaultZoom: 5 },
    places,
  });
}

export async function POST(request: NextRequest) {
  const session = await readSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const data = placeSchema.parse(body);
    const contentIds = data.contentIds ?? [];

    const maxSort = await prisma.mapPlace.aggregate({
      where: { profileId: data.profileId },
      _max: { sortOrder: true },
    });

    const place = await prisma.mapPlace.create({
      data: {
        profileId: data.profileId,
        title: data.title.trim(),
        description: data.description?.trim() || null,
        latitude: data.latitude,
        longitude: data.longitude,
        iconEmoji: data.iconEmoji || "💖",
        color: data.color || "rose",
        thumbnailContentId: data.thumbnailContentId || contentIds[0] || null,
        isPublished: data.isPublished ?? true,
        sortOrder: (maxSort._max.sortOrder ?? 0) + 10,
        media: {
          create: contentIds.map((contentItemId, index) => ({
            contentItemId,
            sortOrder: index * 10,
          })),
        },
      },
      include: {
        media: {
          include: {
            contentItem: {
              include: {
                mainAsset: { select: { id: true, mimeType: true } },
                thumbnailAsset: { select: { id: true } },
              },
            },
          },
          orderBy: { sortOrder: "asc" },
        },
      },
    });

    return NextResponse.json(place, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error("Create map place error:", error);
    return NextResponse.json({ error: "Failed to create map place" }, { status: 500 });
  }
}
