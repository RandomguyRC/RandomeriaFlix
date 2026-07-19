import { NextRequest, NextResponse } from "next/server";
import { readSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await readSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const comments = await prisma.reelComment.findMany({
    where: { contentId: id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(comments);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await readSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();

  if (!body.text?.trim()) {
    return NextResponse.json({ error: "Text required" }, { status: 400 });
  }

  const comment = await prisma.reelComment.create({
    data: {
      contentId: id,
      author: body.author || "Anonymous",
      text: body.text.trim(),
    },
  });

  return NextResponse.json(comment, { status: 201 });
}
