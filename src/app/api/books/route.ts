import { NextRequest, NextResponse } from "next/server";
import { readSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  const session = await readSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const profileSlug = searchParams.get("profileSlug");
  const bookId = searchParams.get("bookId");

  if (!profileSlug) {
    return NextResponse.json({ error: "profileSlug required" }, { status: 400 });
  }

  const profile = await prisma.profile.findUnique({
    where: { slug: profileSlug },
  });

  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  // Single book for viewer
  if (bookId) {
    const book = await prisma.book.findUnique({
      where: { id: bookId },
      include: { pdfAsset: { select: { id: true } } },
    });

    if (!book || book.profileId !== profile.id) {
      return NextResponse.json({ error: "Book not found" }, { status: 404 });
    }

    return NextResponse.json({
      id: book.id,
      title: book.title,
      description: book.description,
      dateLabel: book.dateLabel,
      isFeatured: book.isFeatured,
      pdfAssetId: book.pdfAsset.id,
    });
  }

  // All books for profile
  const books = await prisma.book.findMany({
    where: { profileId: profile.id },
    include: { pdfAsset: { select: { id: true } } },
    orderBy: { sortOrder: "asc" },
  });

  return NextResponse.json(
    books.map((b) => ({
      id: b.id,
      title: b.title,
      description: b.description,
      dateLabel: b.dateLabel,
      isFeatured: b.isFeatured,
      pdfAssetId: b.pdfAsset.id,
      createdAt: b.createdAt,
    }))
  );
}
