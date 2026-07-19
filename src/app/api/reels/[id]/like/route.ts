import { NextRequest, NextResponse } from "next/server";
import { readSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await readSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const existing = await prisma.reelLike.findUnique({
    where: { contentId_sessionId: { contentId: id, sessionId: session.userId } },
  });

  if (existing) {
    // Unlike
    await prisma.reelLike.delete({ where: { id: existing.id } });
    return NextResponse.json({ liked: false });
  } else {
    // Like
    await prisma.reelLike.create({
      data: { contentId: id, sessionId: session.userId },
    });
    return NextResponse.json({ liked: true });
  }
}
