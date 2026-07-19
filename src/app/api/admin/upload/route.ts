import { NextRequest, NextResponse } from "next/server";
import { readSession } from "@/lib/auth";
import { saveUploadedFile, isAllowedMimeType, resolveMimeType } from "@/lib/media";
import heicConvert from "heic-convert";

function isHeicFile(file: File): boolean {
  const name = file.name.toLowerCase();
  return name.endsWith(".heic") || name.endsWith(".heif") || file.type === "image/heic" || file.type === "image/heif";
}

async function convertHeicToJpeg(file: File): Promise<File> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const outputBuffer = await heicConvert({
    buffer,
    format: "JPEG",
    quality: 0.92,
  });

  const jpegName = file.name.replace(/\.(heic|heif)$/i, ".jpg");
  return new File([outputBuffer], jpegName, { type: "image/jpeg" });
}

export async function POST(request: NextRequest) {
  const session = await readSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    let file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Convert HEIC to JPEG automatically
    if (isHeicFile(file)) {
      try {
        file = await convertHeicToJpeg(file);
      } catch (err) {
        console.error("HEIC conversion failed:", err);
        return NextResponse.json(
          { error: "Failed to convert HEIC image. Try converting to JPEG first." },
          { status: 400 }
        );
      }
    }

    if (!isAllowedMimeType(file.type, file.name)) {
      return NextResponse.json(
        { error: `File type ${file.type} is not allowed` },
        { status: 400 }
      );
    }

    const result = await saveUploadedFile(file);

    return NextResponse.json({
      id: result.id,
      storagePath: result.storagePath,
      originalName: file.name,
      mimeType: file.type,
      sizeBytes: file.size,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Upload failed" },
      { status: 500 }
    );
  }
}
