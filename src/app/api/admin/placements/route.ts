import { NextRequest, NextResponse } from "next/server";
import { readSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const placementSchema = z.object({
  contentItemId: z.string().min(1),
  categoryId: z.string().min(1),
});

export async function POST(request: NextRequest) {
  const session = await readSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { contentItemId, categoryId } = placementSchema.parse(body);

    // Remove existing placements for this content item
    await prisma.contentPlacement.deleteMany({
      where: { contentItemId },
    });

    // Get max sort order in the target category
    const maxSort = await prisma.contentPlacement.aggregate({
      where: { categoryId },
      _max: { sortOrder: true },
    });

    // Create new placement
    const placement = await prisma.contentPlacement.create({
      data: {
        contentItemId,
        categoryId,
        sortOrder: (maxSort._max.sortOrder ?? 0) + 10,
      },
    });

    return NextResponse.json(placement, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error("Placement error:", error);
    return NextResponse.json({ error: "Failed to update placement" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const session = await readSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const contentItemId = searchParams.get("contentItemId");

  if (!contentItemId) {
    return NextResponse.json({ error: "contentItemId required" }, { status: 400 });
  }

  await prisma.contentPlacement.deleteMany({
    where: { contentItemId },
  });

  return NextResponse.json({ message: "Removed from category" });
}
