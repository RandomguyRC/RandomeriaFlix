import { NextRequest, NextResponse } from "next/server";
import { rm } from "fs/promises";
import { readSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getMediaFilePath } from "@/lib/media";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await readSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const attachments = await prisma.chatAttachment.findMany({
    where: { message: { importId: id } },
    include: { asset: true },
  });

  const assetIds = attachments.map((attachment) => attachment.assetId).filter((assetId): assetId is string => Boolean(assetId));
  const storagePaths = attachments
    .map((attachment) => attachment.asset?.storagePath)
    .filter((storagePath): storagePath is string => Boolean(storagePath));

  await prisma.chatAttachment.deleteMany({ where: { message: { importId: id } } });
  await prisma.chatMessage.deleteMany({ where: { importId: id } });
  await prisma.chatImport.delete({ where: { id } });

  for (const assetId of assetIds) {
    const remainingUses = await prisma.chatAttachment.count({ where: { assetId } });
    if (remainingUses === 0) {
      await prisma.mediaAsset.delete({ where: { id: assetId } }).catch(() => undefined);
    }
  }

  await Promise.all(storagePaths.map((storagePath) => rm(getMediaFilePath(storagePath), { force: true }).catch(() => undefined)));

  return NextResponse.json({ message: "Deleted" });
}
