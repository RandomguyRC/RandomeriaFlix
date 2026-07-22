import { NextRequest, NextResponse } from "next/server";
import { readSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await readSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profiles = await prisma.profile.findMany({
    orderBy: { sortOrder: "asc" },
    include: {
      _count: { select: { contentItems: true, categories: true } },
    },
  });

  return NextResponse.json(profiles);
}

export async function PATCH(request: NextRequest) {
  const session = await readSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const id = typeof body.id === "string" ? body.id : "";

  if (!id) {
    return NextResponse.json({ error: "Profile id is required" }, { status: 400 });
  }

  const data: { name?: string; isVisible?: boolean } = {};

  if ("name" in body) {
    const name = String(body.name).trim();
    if (!name) {
      return NextResponse.json({ error: "Profile name is required" }, { status: 400 });
    }
    data.name = name;
  }

  if ("isVisible" in body) {
    if (typeof body.isVisible !== "boolean") {
      return NextResponse.json({ error: "isVisible must be a boolean" }, { status: 400 });
    }
    data.isVisible = body.isVisible;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No changes provided" }, { status: 400 });
  }

  const profile = await prisma.profile.update({
    where: { id },
    data,
    include: {
      _count: { select: { contentItems: true, categories: true } },
    },
  });

  return NextResponse.json(profile);
}
