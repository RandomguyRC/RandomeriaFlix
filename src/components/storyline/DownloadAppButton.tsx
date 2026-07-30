"use client";

import { useRef, useState } from "react";
import { Download, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

type Phase = "idle" | "starting" | "zipping" | "finalizing" | "downloading" | "error";

function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return "0 MB";
  const mb = bytes / (1024 * 1024);
  if (mb < 1024) return `${mb.toFixed(mb < 10 ? 1 : 0)} MB`;
  return `${(mb / 1024).toFixed(2)} GB`;
}

function formatEta(seconds?: number): string | null {
  if (seconds === undefined || !isFinite(seconds) || seconds < 0) return null;
  if (seconds < 5) return "a few seconds left";
  if (seconds < 60) return `about ${Math.round(seconds)}s left`;
  const mins = Math.round(seconds / 60);
  return `about ${mins} min${mins === 1 ? "" : "s"} left`;
}

export default function DownloadAppButton() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [percent, setPercent] = useState(0);
  const [processedBytes, setProcessedBytes] = useState(0);
  const [totalBytes, setTotalBytes] = useState(0);
  const [speedBytesPerSec, setSpeedBytesPerSec] = useState(0);
  const [etaSeconds, setEtaSeconds] = useState<number | undefined>(undefined);
  const [errorMsg, setErrorMsg] = useState("");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function stopPolling() {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }

  function triggerDownload() {
    setPhase("downloading");
    window.location.href = "/api/export/download";
    // Reset the button back to normal after giving the browser a moment
    // to pick up the download.
    setTimeout(() => {
      setPhase("idle");
      setPercent(0);
      setProcessedBytes(0);
      setTotalBytes(0);
      setSpeedBytesPerSec(0);
      setEtaSeconds(undefined);
    }, 4000);
  }

  async function handleClick() {
    if (phase === "starting" || phase === "zipping" || phase === "finalizing" || phase === "downloading") return;

    setPhase("starting");
    setErrorMsg("");

    try {
      const res = await fetch("/api/export/start", { method: "POST" });
      const data = await res.json();

      if (!data.ok) {
        throw new Error(data.error || "Could not start the export");
      }

      if (data.alreadyReady) {
        triggerDownload();
        return;
      }

      setPhase("zipping");
      pollRef.current = setInterval(async () => {
        const s = await fetch("/api/export/status").then((r) => r.json());
        setPercent(s.percent ?? 0);
        setProcessedBytes(s.processedBytes ?? 0);
        setTotalBytes(s.totalBytes ?? 0);
        setSpeedBytesPerSec(s.speedBytesPerSec ?? 0);
        setEtaSeconds(s.etaSeconds);

        if (s.state === "finalizing") {
          setPhase("finalizing");
        } else if (s.state === "zipping") {
          setPhase("zipping");
        } else if (s.state === "ready") {
          stopPolling();
          triggerDownload();
        } else if (s.state === "error") {
          stopPolling();
          setPhase("error");
          setErrorMsg(s.error || "Something went wrong while zipping.");
        }
      }, 1000);
    } catch (err: unknown) {
      setPhase("error");
      setErrorMsg(err instanceof Error ? err.message : "Could not start the export");
    }
  }

  const isBusy = phase === "starting" || phase === "zipping" || phase === "finalizing" || phase === "downloading";

  // The little caption line only shows once she's actually clicked — no
  // point warning about the wait before there's anything to wait for.
  // During zipping we show real throughput so it's obvious things are
  // still moving even while the percentage is capped near 99%.
  const zippingDetail = (() => {
    if (phase !== "zipping") return null;
    const parts: string[] = [];
    if (speedBytesPerSec > 0) parts.push(`${formatBytes(speedBytesPerSec)}/s`);
    if (totalBytes > 0) parts.push(`${formatBytes(processedBytes)} of ${formatBytes(totalBytes)}`);
    const eta = formatEta(etaSeconds);
    if (eta) parts.push(eta);
    return parts.length ? parts.join(" · ") : null;
  })();

  const caption =
    phase === "starting"
      ? "Getting things ready..."
      : phase === "zipping"
      ? zippingDetail || "Packaging everything, including your memories..."
      : phase === "finalizing"
      ? "Almost there — writing the final archive to disk..."
      : phase === "downloading"
      ? "Your download is starting..."
      : null;

  return (
    <div className="mt-3">
      <button
        onClick={handleClick}
        disabled={isBusy}
        className={`group relative flex w-full flex-col items-center gap-1 overflow-hidden rounded-xl border px-4 py-3.5 transition-all duration-300 ${
          phase === "error"
            ? "border-red-500/30 bg-red-500/[0.06]"
            : isBusy
            ? "cursor-not-allowed border-red-400/20 bg-gradient-to-r from-red-500/10 to-rose-400/10"
            : "border-red-400/20 bg-gradient-to-r from-red-500/10 to-rose-400/5 hover:border-red-400/40 hover:from-red-500/15 hover:to-rose-400/10"
        }`}
      >
        <span
          className={`flex items-center gap-2 text-[13px] font-medium transition-colors ${
            phase === "error"
              ? "text-red-300"
              : isBusy
              ? "text-gray-300"
              : "text-gray-200 group-hover:text-white"
          }`}
        >
          {phase === "error" ? (
            <AlertCircle className="h-4 w-4 text-red-400" />
          ) : phase === "downloading" ? (
            <CheckCircle2 className="h-4 w-4 text-red-400" />
          ) : isBusy ? (
            <Loader2 className="h-4 w-4 animate-spin text-red-400" />
          ) : (
            <Download className="h-4 w-4 text-red-400" />
          )}
          {phase === "error"
            ? "Something went wrong"
            : phase === "downloading"
            ? "Starting your download..."
            : phase === "finalizing"
            ? "Finalizing the archive..."
            : isBusy
            ? `Packing everything up... ${percent}%`
            : "Download the whole app"}
        </span>

        {caption && <span className="text-[11px] text-gray-500">{caption}</span>}
        {phase === "error" && errorMsg && (
          <span className="text-[11px] text-red-400">{errorMsg}</span>
        )}

        {isBusy && (
          <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-white/[0.06]">
            {phase === "finalizing" ? (
              // No meaningful percentage left to report here (all bytes are
              // already processed) — an indeterminate shimmer makes it clear
              // work is still happening instead of a bar frozen at 99%.
              <div className="h-full w-1/3 animate-[finalizing-shimmer_1.1s_ease-in-out_infinite] rounded-full bg-gradient-to-r from-red-500 to-rose-400" />
            ) : (
              <div
                className="h-full rounded-full bg-gradient-to-r from-red-500 to-rose-400 transition-all duration-300"
                style={{ width: `${percent}%` }}
              />
            )}
          </div>
        )}
      </button>
    </div>
  );
}
