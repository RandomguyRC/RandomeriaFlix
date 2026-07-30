// archiver v8 dropped the old `archiver('zip', opts)` factory function in
// favor of format-specific classes. All the instance methods we use below
// (append/directory/file/finalize/pointer, and the progress/error/warning
// events) are unchanged — only the constructor moved.
import { ZipArchive } from "archiver";
import { createWriteStream, existsSync, statSync } from "fs";
import { mkdir, unlink, readFile } from "fs/promises";
import { join } from "path";

// "finalizing" covers the gap between "all bytes handed to archiver" and
// the output file actually being closed on disk (writing the zip central
// directory + OS flush). That gap is where progress used to look stuck at
// 99% — now it gets its own state so the UI can say something honest.
export type ExportState = "idle" | "zipping" | "finalizing" | "ready" | "error";

interface ExportJobStatus {
  state: ExportState;
  processedBytes: number;
  totalBytes: number;
  percent: number;
  // Bytes/sec, smoothed — lets the UI show real throughput instead of a
  // percentage that can sit still for a while on big archives.
  speedBytesPerSec: number;
  // Rough estimate of seconds left based on current speed. Undefined
  // when we don't have enough data yet to guess.
  etaSeconds?: number;
  error?: string;
  fileName?: string;
  fileSizeBytes?: number;
  startedAt?: number;
  readyAt?: number;
}

const PROJECT_ROOT = process.cwd();
const EXPORT_DIR = join(PROJECT_ROOT, "tmp-exports");

// ─── Adjust this to match your actual project root ───
// These are paths relative to your project root that will be included
// in the zip. Anything not listed here (node_modules, .next, .git, etc.)
// is left out automatically since we only ever add what's listed below.
const INCLUDE_ENTRIES: { path: string; type: "dir" | "file" }[] = [
  { path: "src", type: "dir" },
  { path: "public", type: "dir" },
  { path: "prisma", type: "dir" }, // includes schema.prisma, migrations/, and dev.db
  { path: "data/uploads", type: "dir" }, // all photos/videos/audio/stickers
  { path: "data/geoip", type: "dir" },
  { path: "data/passwords.json", type: "file" },
  { path: "Logo", type: "dir" },
  { path: "scripts", type: "dir" },
  { path: "package.json", type: "file" },
  { path: "package-lock.json", type: "file" },
  { path: "next.config.ts", type: "file" },
  { path: "tsconfig.json", type: "file" },
  { path: "postcss.config.mjs", type: "file" },
  { path: "eslint.config.mjs", type: "file" },
];

// Where the setup guide lives before it gets bundled into the zip.
const SETUP_GUIDE_PATH = join(PROJECT_ROOT, "bundled-readme", "START-HERE.md");

let job: ExportJobStatus = { state: "idle", processedBytes: 0, totalBytes: 0, percent: 0, speedBytesPerSec: 0 };
let currentFilePath: string | null = null;
let readyTimeout: NodeJS.Timeout | null = null;

// Speed tracking — a small rolling window of (timestamp, processedBytes)
// samples so we can report a smoothed bytes/sec instead of a single noisy
// instantaneous reading between two 'progress' events.
let speedSamples: { ts: number; bytes: number }[] = [];
const SPEED_WINDOW_MS = 4000;

function recordSpeedSample(processedBytes: number): { speedBytesPerSec: number; etaSeconds?: number } {
  const now = Date.now();
  speedSamples.push({ ts: now, bytes: processedBytes });
  speedSamples = speedSamples.filter((s) => now - s.ts <= SPEED_WINDOW_MS);

  if (speedSamples.length < 2) {
    return { speedBytesPerSec: 0 };
  }

  const oldest = speedSamples[0];
  const elapsedSec = (now - oldest.ts) / 1000;
  if (elapsedSec <= 0) return { speedBytesPerSec: 0 };

  const speedBytesPerSec = (processedBytes - oldest.bytes) / elapsedSec;
  const remaining = Math.max(0, job.totalBytes - processedBytes);
  const etaSeconds = speedBytesPerSec > 0 ? remaining / speedBytesPerSec : undefined;
  return { speedBytesPerSec, etaSeconds };
}

function resetToIdle() {
  job = { state: "idle", processedBytes: 0, totalBytes: 0, percent: 0, speedBytesPerSec: 0 };
  currentFilePath = null;
  speedSamples = [];
  if (readyTimeout) {
    clearTimeout(readyTimeout);
    readyTimeout = null;
  }
}

// Called once the download stream finishes (or is aborted) — deletes the
// zip from disk so it never sits around on the EC2 volume.
export async function finalizeDownload() {
  const path = currentFilePath;
  resetToIdle();
  if (path && existsSync(path)) {
    try {
      await unlink(path);
    } catch {
      // best-effort cleanup; nothing to do if it's already gone
    }
  }
}

async function checkFreeSpace(): Promise<{ ok: boolean; message?: string }> {
  try {
    const { statfs } = await import("fs/promises");
    const info = await statfs(PROJECT_ROOT);
    const availableBytes = info.bavail * info.bsize;
    const MIN_REQUIRED = 5 * 1024 * 1024 * 1024; // 5GB safety margin
    if (availableBytes < MIN_REQUIRED) {
      return {
        ok: false,
        message: `Not enough free disk space on the server (only ${(availableBytes / 1024 / 1024 / 1024).toFixed(1)}GB left). Free up space or resize the EBS volume before trying again.`,
      };
    }
    return { ok: true };
  } catch {
    // If the check itself fails, don't block the export over it
    return { ok: true };
  }
}

export async function startExport(): Promise<void> {
  if (job.state === "zipping" || job.state === "finalizing") return; // already running, no-op

  const spaceCheck = await checkFreeSpace();
  if (!spaceCheck.ok) {
    job = { state: "error", processedBytes: 0, totalBytes: 0, percent: 0, speedBytesPerSec: 0, error: spaceCheck.message };
    throw new Error(spaceCheck.message);
  }

  await mkdir(EXPORT_DIR, { recursive: true });

  const fileName = `randomeriaflix-export-${Date.now()}.zip`;
  const filePath = join(EXPORT_DIR, fileName);
  currentFilePath = filePath;

  speedSamples = [];
  job = {
    state: "zipping",
    processedBytes: 0,
    totalBytes: 0,
    percent: 0,
    speedBytesPerSec: 0,
    fileName,
    startedAt: Date.now(),
  };

  // Fire and forget — the caller (the API route) returns immediately;
  // progress is tracked via getExportStatus() polling.
  runZipJob(filePath, fileName).catch((err) => {
    job = {
      state: "error",
      processedBytes: 0,
      totalBytes: 0,
      percent: 0,
      speedBytesPerSec: 0,
      error: err?.message || "Export failed",
    };
    currentFilePath = null;
  });
}

async function runZipJob(filePath: string, fileName: string) {
  const output = createWriteStream(filePath);
  const archive = new ZipArchive({
    zlib: { level: 0 }, // store mode — media files are already compressed, this just saves CPU/time
  });

  const done = new Promise<void>((resolve, reject) => {
    output.on("close", resolve);
    archive.on("error", reject);
    output.on("error", reject);
  });

  archive.on("progress", (data) => {
    const processed = data.fs.processedBytes;
    const total = data.fs.totalBytes || 1;
    const { speedBytesPerSec, etaSeconds } = recordSpeedSample(processed);
    job = {
      ...job,
      state: "zipping",
      processedBytes: processed,
      totalBytes: total,
      // Capped below 100 here on purpose: reaching 100% of *known* bytes
      // doesn't mean the file is done — archiver still has to write the
      // zip's central directory and the OS still has to flush it to disk.
      // That tail is reported separately as "finalizing" below instead of
      // pretending it's still "99% zipping".
      percent: Math.min(99, Math.round((processed / total) * 100)),
      speedBytesPerSec,
      etaSeconds,
    };
  });

  archive.pipe(output);

  for (const entry of INCLUDE_ENTRIES) {
    const fullPath = join(PROJECT_ROOT, entry.path);
    if (!existsSync(fullPath)) continue; // skip anything that doesn't exist (e.g. next.config.js vs .ts)
    if (entry.type === "dir") {
      archive.directory(fullPath, entry.path);
    } else {
      archive.file(fullPath, { name: entry.path });
    }
  }

  // Real .env, as-is — this makes the app work out of the box for her
  // without generating secrets, Spotify keys, Telegram tokens, etc herself.
  const envPath = join(PROJECT_ROOT, ".env");
  if (existsSync(envPath)) {
    archive.file(envPath, { name: ".env" });
  }

  // Bundle the setup guide in as the first thing she'll see.
  if (existsSync(SETUP_GUIDE_PATH)) {
    const guideContent = await readFile(SETUP_GUIDE_PATH, "utf-8");
    archive.append(guideContent, { name: "START-HERE.md" });
  }

  await archive.finalize();

  // All entries have been handed to archiver, but the file on disk isn't
  // done yet — archiver still has to write the zip's central directory
  // and the write stream still has to flush/close. On a big archive this
  // can take a few real seconds, and it's exactly the window that used to
  // render as "stuck at 99%". Give it its own honest state instead.
  job = {
    ...job,
    state: "finalizing",
    percent: 99,
    speedBytesPerSec: 0,
    etaSeconds: undefined,
  };

  await done;

  const stats = statSync(filePath);
  job = {
    state: "ready",
    processedBytes: stats.size,
    totalBytes: stats.size,
    percent: 100,
    speedBytesPerSec: 0,
    fileName,
    fileSizeBytes: stats.size,
    readyAt: Date.now(),
  };

  // Safety net: if she never actually downloads it, don't let it sit on
  // disk forever — auto-clean after 30 minutes.
  readyTimeout = setTimeout(() => {
    finalizeDownload();
  }, 30 * 60 * 1000);
}
