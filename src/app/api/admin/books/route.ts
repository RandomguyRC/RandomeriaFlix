import { NextRequest, NextResponse } from "next/server";
import { readSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { saveUploadedFile } from "@/lib/media";

export async function GET() {
  const session = await readSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const books = await prisma.book.findMany({
    include: {
      profile: { select: { id: true, name: true, slug: true } },
      pdfAsset: { select: { id: true, originalName: true } },
    },
    orderBy: { sortOrder: "asc" },
  });

  return NextResponse.json(books);
}

export async function POST(request: NextRequest) {
  const session = await readSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const profileId = formData.get("profileId") as string;
    const title = formData.get("title") as string;
    const description = (formData.get("description") as string) || null;
    const dateLabel = (formData.get("dateLabel") as string) || null;
    const isFeatured = formData.get("isFeatured") === "true";
    const file = formData.get("file") as File | null;

    if (!profileId || !title || !file) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    if (file.type !== "application/pdf") {
      return NextResponse.json({ error: "Only PDF files allowed" }, { status: 400 });
    }

    const result = await saveUploadedFile(file);

    // Get current max sort order
    const maxSort = await prisma.book.aggregate({
      where: { profileId },
      _max: { sortOrder: true },
    });

    const book = await prisma.book.create({
      data: {
        profileId,
        title,
        description,
        dateLabel,
        isFeatured,
        pdfAssetId: result.id,
        sortOrder: (maxSort._max.sortOrder ?? 0) + 10,
      },
    });

    return NextResponse.json(book, { status: 201 });
  } catch (error) {
    console.error("Book upload error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
