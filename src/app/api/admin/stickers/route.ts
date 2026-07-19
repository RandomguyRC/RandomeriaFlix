import { NextRequest, NextResponse } from "next/server";
import { readSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await readSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const stickers = await prisma.sticker.findMany({
    include: {
      asset: { select: { id: true, mimeType: true } },
      profile: { select: { id: true, name: true } },
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });

  return NextResponse.json(stickers);
}

export async function POST(request: NextRequest) {
  const session = await readSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  let sortOrder = body.sortOrder;
  if (sortOrder === undefined || sortOrder === null) {
    const last = await prisma.sticker.findFirst({ orderBy: { sortOrder: "desc" } });
    sortOrder = (last?.sortOrder ?? 0) + 1;
  }

  const sticker = await prisma.sticker.create({
    data: {
      profileId: body.profileId,
      title: body.title || "",
      assetId: body.assetId,
      sortOrder,
    },
  });

  return NextResponse.json(sticker, { status: 201 });
}
