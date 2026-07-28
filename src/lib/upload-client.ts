"use client";

// Chunked, resumable-per-chunk uploader for the admin media upload flow.
//
// Why this exists: uploading a large file (e.g. a 700MB video) as one giant
// multipart POST is fragile on a bad connection — one dropped packet near
// the end means re-uploading the whole thing from scratch, and the browser
// gives no useful progress info for a single big request. This splits the
// file into small chunks, uploads them one at a time with automatic retry,
// and reports progress/speed after every chunk.

const CHUNK_SIZE = 12 * 1024 * 1024; // 12MB — must match MAX_CHUNK_SIZE on the server
const MAX_RETRIES_PER_CHUNK = 5;

export type UploadProgress = {
  percent: number; // 0-100
  loadedBytes: number;
  totalBytes: number;
  speedBytesPerSec: number;
  etaSeconds: number | null;
};

export type UploadedMediaFile = {
  id: string;
  storagePath: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
};

function genUploadId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID().replace(/-/g, "");
  }
  return `up_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

async function withRetry<T>(fn: () => Promise<T>, label: string): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < MAX_RETRIES_PER_CHUNK; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      // Exponential backoff: 500ms, 1s, 2s, 4s, 8s — gives a flaky wifi
      // connection time to recover between attempts.
      const delay = 500 * Math.pow(2, attempt);
      console.warn(`${label} failed (attempt ${attempt + 1}/${MAX_RETRIES_PER_CHUNK}), retrying in ${delay}ms`, err);
      await new Promise((res) => setTimeout(res, delay));
    }
  }
  throw lastError instanceof Error ? lastError : new Error(`${label} failed after retries`);
}

async function postJson(url: string, body: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return res.json();
}

/**
 * Uploads a File in chunks with retry and progress reporting.
 * Throws if the upload ultimately fails after retries; the caller can offer
 * a "try again" action (calling this function again starts a fresh upload).
 */
export async function uploadFileChunked(
  file: File,
  onProgress?: (progress: UploadProgress) => void
): Promise<UploadedMediaFile> {
  const uploadId = genUploadId();
  const totalBytes = file.size;

  await withRetry(
    () =>
      postJson(`/api/admin/media-upload/chunk?action=start&uploadId=${uploadId}`, {
        filename: file.name,
        mimeType: file.type || "application/octet-stream",
        totalSize: totalBytes,
      }),
    "Starting upload"
  );

  let offset = 0;
  let chunkIndex = 0;
  let loadedBytes = 0;
  const startTime = Date.now();
  // Rolling window for speed calc so a slow first chunk doesn't skew the
  // whole estimate.
  let windowStart = startTime;
  let windowBytes = 0;

  while (offset < totalBytes) {
    const end = Math.min(offset + CHUNK_SIZE, totalBytes);
    const chunk = file.slice(offset, end);
    const chunkSize = end - offset;
    const thisChunkIndex = chunkIndex;

    await withRetry(async () => {
      const res = await fetch(
        `/api/admin/media-upload/chunk?action=chunk&uploadId=${uploadId}&chunkIndex=${thisChunkIndex}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/octet-stream" },
          body: chunk,
        }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Chunk upload failed (${res.status})`);
      }
      return res.json();
    }, `Uploading chunk ${thisChunkIndex}`);

    offset = end;
    chunkIndex += 1;
    loadedBytes += chunkSize;
    windowBytes += chunkSize;

    const now = Date.now();
    const windowElapsedSec = (now - windowStart) / 1000;
    if (onProgress) {
      const speedBytesPerSec = windowElapsedSec > 0 ? windowBytes / windowElapsedSec : 0;
      const remainingBytes = totalBytes - loadedBytes;
      const etaSeconds = speedBytesPerSec > 0 ? remainingBytes / speedBytesPerSec : null;
      onProgress({
        percent: Math.round((loadedBytes / totalBytes) * 100),
        loadedBytes,
        totalBytes,
        speedBytesPerSec,
        etaSeconds,
      });
    }
    // Reset the speed window every ~3s so the estimate tracks current
    // conditions rather than the average since the start of the upload.
    if (windowElapsedSec > 3) {
      windowStart = now;
      windowBytes = 0;
    }
  }

  const result = await withRetry(
    () => postJson(`/api/admin/media-upload/chunk?action=finish&uploadId=${uploadId}`, {}),
    "Finalizing upload"
  );

  return result as UploadedMediaFile;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function formatSpeed(bytesPerSec: number): string {
  return `${formatBytes(bytesPerSec)}/s`;
}

export function formatEta(seconds: number | null): string {
  if (seconds === null || !isFinite(seconds)) return "";
  if (seconds < 60) return `${Math.ceil(seconds)}s left`;
  const mins = Math.floor(seconds / 60);
  const secs = Math.ceil(seconds % 60);
  return `${mins}m ${secs}s left`;
}
