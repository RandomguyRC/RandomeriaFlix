import { NextRequest, NextResponse } from "next/server";
import { readSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await readSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Delete messages first
  await prisma.chatMessage.deleteMany({ where: { importId: id } });
  await prisma.chatImport.delete({ where: { id } });

  return NextResponse.json({ message: "Deleted" });
}
