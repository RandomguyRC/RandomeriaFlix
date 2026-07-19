import { NextRequest, NextResponse } from "next/server";
import { readSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const updateContentSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  dateLabel: z.string().optional(),
  tags: z.string().optional(),
  mood: z.string().optional(),
  isFeatured: z.boolean().optional(),
  isPublished: z.boolean().optional(),
  type: z.enum(["PHOTO", "VIDEO", "AUDIO"]).optional(),
  mainAssetId: z.string().optional(),
  thumbnailAssetId: z.string().nullable().optional(),
  musicAssetId: z.string().nullable().optional(),
  musicStartMs: z.number().nullable().optional(),
  musicDurationMs: z.number().nullable().optional(),
  detailCropX: z.number().nullable().optional(),
  detailCropY: z.number().nullable().optional(),
  thumbCropX: z.number().nullable().optional(),
  thumbCropY: z.number().nullable().optional(),
  aspectMode: z.enum(["auto", "portrait", "landscape"]).nullable().optional(),
  detailZoom: z.number().nullable().optional(),
  videoRotation: z.number().nullable().optional(),
});

// GET single content item
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await readSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const item = await prisma.contentItem.findUnique({
    where: { id },
    include: {
      mainAsset: true,
      thumbnailAsset: true,
      musicAsset: true,
      profile: { select: { id: true, name: true, slug: true } },
      placements: { include: { category: true } },
    },
  });

  if (!item) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(item);
}

// PATCH update content item
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
    const parsed = updateContentSchema.parse(body);

    // Filter out undefined values so Prisma doesn't choke
    const data: Record<string, any> = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (value !== undefined && value !== null) {
        data[key] = value;
      }
    }

    const item = await prisma.contentItem.update({
      where: { id },
      data,
      include: {
        mainAsset: true,
        thumbnailAsset: true,
        musicAsset: true,
      },
    });

    return NextResponse.json(item);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

// DELETE content item
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await readSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  await prisma.contentPlacement.deleteMany({ where: { contentItemId: id } });
  await prisma.contentItem.delete({ where: { id } });

  return NextResponse.json({ message: "Deleted" });
}
