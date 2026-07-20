import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { readSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

const updatePlaceSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  iconEmoji: z.string().trim().min(1).max(8).optional(),
  color: z.string().optional(),
  thumbnailContentId: z.string().optional().nullable(),
  isPublished: z.boolean().optional(),
  contentIds: z.array(z.string()).optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await readSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await request.json();
    const data = updatePlaceSchema.parse(body);
    const contentIds = data.contentIds;

    const updateData: Record<string, unknown> = {};
    for (const key of ["title", "latitude", "longitude", "iconEmoji", "color", "isPublished"] as const) {
      if (data[key] !== undefined) updateData[key] = data[key];
    }
    if (data.description !== undefined) updateData.description = data.description?.trim() || null;
    if (contentIds) updateData.thumbnailContentId = data.thumbnailContentId || contentIds[0] || null;
    else if (data.thumbnailContentId !== undefined) updateData.thumbnailContentId = data.thumbnailContentId || null;

    const place = await prisma.$transaction(async (tx) => {
      if (contentIds) {
        await tx.mapPlaceContent.deleteMany({ where: { mapPlaceId: id } });
      }

      return tx.mapPlace.update({
        where: { id },
        data: {
          ...updateData,
          ...(contentIds
            ? {
                media: {
                  create: contentIds.map((contentItemId, index) => ({
                    contentItemId,
                    sortOrder: index * 10,
                  })),
                },
              }
            : {}),
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
    });

    return NextResponse.json(place);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error("Update map place error:", error);
    return NextResponse.json({ error: "Failed to update map place" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await readSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  await prisma.mapPlace.delete({ where: { id } });
  return NextResponse.json({ message: "Deleted" });
}
