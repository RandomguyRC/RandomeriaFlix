import { NextRequest, NextResponse } from "next/server";
import { readSession } from "@/lib/auth";
import { saveUploadedFile, isAllowedMimeType } from "@/lib/media";
import heicConvert from "heic-convert";

// Direct (non-chunked) upload — live chat attachments are phone photos,
// short videos, and voice notes, not huge admin media, so a single
// multipart POST is fine here (unlike the admin chunked uploader).
const MAX_LIVE_CHAT_FILE_SIZE = 150 * 1024 * 1024; // 150MB

function isHeicFile(file: File): boolean {
  const name = file.name.toLowerCase();
  return name.endsWith(".heic") || name.endsWith(".heif") || file.type === "image/heic" || file.type === "image/heif";
}

async function convertHeicToJpeg(file: File): Promise<File> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const outputBuffer = await heicConvert({ buffer, format: "JPEG", quality: 0.92 });
  const jpegName = file.name.replace(/\.(heic|heif)$/i, ".jpg");
  return new File([outputBuffer], jpegName, { type: "image/jpeg" });
}

export async function POST(request: NextRequest) {
  const session = await readSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    let file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (file.size > MAX_LIVE_CHAT_FILE_SIZE) {
      return NextResponse.json(
        { error: `File too large. Max size is ${MAX_LIVE_CHAT_FILE_SIZE / 1024 / 1024}MB` },
        { status: 400 }
      );
    }

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
      return NextResponse.json({ error: `File type ${file.type} is not allowed` }, { status: 400 });
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
    console.error("Live chat media upload error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
