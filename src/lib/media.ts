import { nanoid } from "nanoid";
import { join } from "path";
import { mkdir, writeFile, stat } from "fs/promises";
import { prisma } from "./db";

const ALLOWED_MIME_TYPES: Record<string, string> = {
  "image/jpeg": "IMAGE",
  "image/png": "IMAGE",
  "image/webp": "IMAGE",
  "image/gif": "IMAGE",
  "video/mp4": "VIDEO",
  "video/webm": "VIDEO",
  "video/quicktime": "VIDEO",
  "audio/mpeg": "AUDIO",
  "audio/mp3": "AUDIO",
  "audio/wav": "AUDIO",
  "audio/ogg": "AUDIO",
  "audio/mp4": "AUDIO",
  "application/pdf": "PDF",
};

const MAX_FILE_SIZE = 2048 * 1024 * 1024; // 500MB

const EXTENSION_MAP: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".heic": "image/heic",
  ".heif": "image/heif",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mov": "video/quicktime",
  ".avi": "video/x-msvideo",
  ".mkv": "video/x-matroska",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".ogg": "audio/ogg",
  ".m4a": "audio/mp4",
  ".aac": "audio/aac",
  ".flac": "audio/flac",
  ".pdf": "application/pdf",
};

export function getMediaKind(mimeType: string, filename?: string): string {
  if (ALLOWED_MIME_TYPES[mimeType]) return ALLOWED_MIME_TYPES[mimeType];
  // Fallback: detect from extension
  if (filename) {
    const ext = "." + filename.split(".").pop()?.toLowerCase();
    const resolvedMime = EXTENSION_MAP[ext];
    if (resolvedMime && ALLOWED_MIME_TYPES[resolvedMime]) return ALLOWED_MIME_TYPES[resolvedMime];
  }
  return "OTHER";
}

export function isAllowedMimeType(mimeType: string, filename?: string): boolean {
  if (mimeType in ALLOWED_MIME_TYPES) return true;
  // Fallback: check extension — allow any known extension
  if (filename) {
    const ext = "." + filename.split(".").pop()?.toLowerCase();
    return !!(ext && ext in EXTENSION_MAP);
  }
  return false;
}

export function resolveMimeType(mimeType: string, filename: string): string {
  if (mimeType && mimeType !== "application/octet-stream" && mimeType in ALLOWED_MIME_TYPES) return mimeType;
  const ext = "." + filename.split(".").pop()?.toLowerCase();
  return EXTENSION_MAP[ext] || mimeType;
}

export async function saveUploadedFile(
  file: File
): Promise<{ id: string; storagePath: string }> {
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`File too large. Max size is ${MAX_FILE_SIZE / 1024 / 1024}MB`);
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const ext = file.name.split(".").pop() || "bin";
  const filename = `${nanoid()}.${ext}`;
  const uploadDir = join(process.cwd(), "data/uploads");

  // Ensure upload directory exists
  await mkdir(uploadDir, { recursive: true });

  const filePath = join(uploadDir, filename);
  await writeFile(filePath, buffer);

  const stats = await stat(filePath);

  const resolvedMime = resolveMimeType(file.type, file.name);

  const mediaAsset = await prisma.mediaAsset.create({
    data: {
      kind: getMediaKind(resolvedMime),
      originalName: file.name,
      mimeType: resolvedMime,
      sizeBytes: stats.size,
      storagePath: filename,
    },
  });

  return { id: mediaAsset.id, storagePath: filename };
}

export function getMediaFilePath(storagePath: string): string {
  return join(process.cwd(), "data/uploads", storagePath);
}
