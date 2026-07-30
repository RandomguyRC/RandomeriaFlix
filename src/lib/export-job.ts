// archiver v8 dropped the old `archiver('zip', opts)` factory function in
// favor of format-specific classes. All the instance methods we use below
// (append/directory/file/finalize/pointer, and the progress/error/warning
// events) are unchanged — only the constructor moved.
import { ZipArchive } from "archiver";
import { createWriteStream, existsSync, statSync } from "fs";
import { mkdir, unlink, readFile } from "fs/promises";
import { join } from "path";

export type ExportState = "idle" | "zipping" | "ready" | "error";

interface ExportJobStatus {
  state: ExportState;
  processedBytes: number;
  totalBytes: number;
  percent: number;
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

let job: ExportJobStatus = { state: "idle", processedBytes: 0, totalBytes: 0, percent: 0 };
let currentFilePath: string | null = null;
let readyTimeout: NodeJS.Timeout | null = null;

export function getExportStatus(): ExportJobStatus {
  return job;
}

export function getExportFilePath(): string | null {
  return currentFilePath;
}

function resetToIdle() {
  job = { state: "idle", processedBytes: 0, totalBytes: 0, percent: 0 };
  currentFilePath = null;
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
  if (job.state === "zipping") return; // already running, no-op

  const spaceCheck = await checkFreeSpace();
  if (!spaceCheck.ok) {
    job = { state: "error", processedBytes: 0, totalBytes: 0, percent: 0, error: spaceCheck.message };
    throw new Error(spaceCheck.message);
  }

  await mkdir(EXPORT_DIR, { recursive: true });

  const fileName = `randomeriaflix-export-${Date.now()}.zip`;
  const filePath = join(EXPORT_DIR, fileName);
  currentFilePath = filePath;

  job = {
    state: "zipping",
    processedBytes: 0,
    totalBytes: 0,
    percent: 0,
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
    job = {
      ...job,
      state: "zipping",
      processedBytes: processed,
      totalBytes: total,
      percent: Math.min(99, Math.round((processed / total) * 100)),
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
  await done;

  const stats = statSync(filePath);
  job = {
    state: "ready",
    processedBytes: stats.size,
    totalBytes: stats.size,
    percent: 100,
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
