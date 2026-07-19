import { NextRequest, NextResponse } from "next/server";
import { readSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await readSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const memories = await prisma.textMemory.findMany({
    include: { profile: { select: { id: true, name: true, slug: true } } },
    orderBy: { sortOrder: "asc" },
  });

  return NextResponse.json(memories);
}

export async function POST(request: NextRequest) {
  const session = await readSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  const memory = await prisma.textMemory.create({
    data: {
      profileId: body.profileId,
      title: body.title || body.paragraph.slice(0, 30),
      paragraph: body.paragraph,
      owner: body.owner || "random",
    },
  });

  return NextResponse.json(memory, { status: 201 });
}
