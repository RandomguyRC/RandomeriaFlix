import { NextRequest, NextResponse } from "next/server";
import { readSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

const PAGE_SIZE = 60;

// "Media" = things you'd scroll through visually (photos/videos).
// "Docs" = everything else that was ever attached (pdfs, audio notes, files).
const MEDIA_KINDS = ["IMAGE", "VIDEO"];
const DOC_KINDS = ["PDF", "AUDIO", "OTHER"];

export async function GET(request: NextRequest) {
  const session = await readSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const profileSlug = searchParams.get("profileSlug");
  const tab = searchParams.get("tab") === "docs" ? "docs" : "media";
  const page = Math.max(0, parseInt(searchParams.get("page") || "0", 10) || 0);

  if (!profileSlug) {
    return NextResponse.json({ error: "profileSlug required" }, { status: 400 });
  }

  const profile = await prisma.profile.findUnique({
    where: { slug: profileSlug },
  });

  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  const chatImport = await prisma.chatImport.findFirst({
    where: { profileId: profile.id },
    orderBy: { createdAt: "desc" },
  });

  if (!chatImport) {
    return NextResponse.json({ items: [], hasMore: false, totalCount: 0 });
  }

  const kinds = tab === "docs" ? DOC_KINDS : MEDIA_KINDS;

  const where = {
    message: { importId: chatImport.id },
    assetId: { not: null },
    OR: [{ kind: { in: kinds } }, { asset: { kind: { in: kinds } } }],
  };

  const [totalCount, rows] = await Promise.all([
    prisma.chatAttachment.count({ where }),
    prisma.chatAttachment.findMany({
      where,
      include: {
        asset: true,
        message: { select: { sortOrder: true, dateLabel: true } },
      },
      orderBy: { message: { sortOrder: "desc" } },
      skip: page * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ]);

  const items = rows
    .filter((row) => row.message)
    .map((row) => ({
      id: row.id,
      kind: row.asset?.kind || row.kind,
      url: row.assetId ? `/api/media/${row.assetId}` : null,
      downloadUrl: row.assetId ? `/api/media/${row.assetId}` : null,
      mimeType: row.asset?.mimeType || null,
      originalName: row.asset?.originalName || row.originalRef || "Attachment",
      sizeBytes: row.asset?.sizeBytes || null,
      sortOrder: row.message!.sortOrder,
      dateLabel: row.message!.dateLabel,
    }));

  return NextResponse.json({
    items,
    hasMore: (page + 1) * PAGE_SIZE < totalCount,
    totalCount,
  });
}
