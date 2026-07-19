import { NextRequest, NextResponse } from "next/server";
import { readSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const categorySchema = z.object({
  profileId: z.string().min(1),
  title: z.string().min(1),
  slug: z.string().optional(),
  navTabId: z.string().optional(),
});

export async function GET(request: NextRequest) {
  const session = await readSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const profileId = searchParams.get("profileId");

  const where = profileId ? { profileId } : {};

  const categories = await prisma.category.findMany({
    where,
    include: {
      profile: { select: { id: true, name: true, slug: true } },
      _count: { select: { placements: true } },
    },
    orderBy: { sortOrder: "asc" },
  });

  return NextResponse.json(categories);
}

export async function POST(request: NextRequest) {
  const session = await readSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const data = categorySchema.parse(body);

    const slug =
      data.slug ||
      data.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");

    const category = await prisma.category.create({
      data: {
        profileId: data.profileId,
        title: data.title,
        slug,
        navTabId: data.navTabId || null,
      },
    });

    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to create category" }, { status: 500 });
  }
}
