"use client";

import { useRef, useState } from "react";
import { Download, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

type Phase = "idle" | "starting" | "zipping" | "downloading" | "error";

export default function DownloadAppButton() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [percent, setPercent] = useState(0);
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
    }, 4000);
  }

  async function handleClick() {
    if (phase === "starting" || phase === "zipping" || phase === "downloading") return;

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

        if (s.state === "ready") {
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

  const isBusy = phase === "starting" || phase === "zipping" || phase === "downloading";

  // The little caption line only shows once she's actually clicked — no
  // point warning about the wait before there's anything to wait for.
  const caption =
    phase === "starting"
      ? "Getting things ready..."
      : phase === "zipping"
      ? "Packaging everything, including your memories..."
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
            <div
              className="h-full rounded-full bg-gradient-to-r from-red-500 to-rose-400 transition-all duration-300"
              style={{ width: `${percent}%` }}
            />
          </div>
        )}
      </button>
    </div>
  );
}
