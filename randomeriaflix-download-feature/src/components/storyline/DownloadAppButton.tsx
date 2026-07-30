"use client";

import { useRef, useState } from "react";
import { Download, Loader2, CheckCircle2 } from "lucide-react";

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

  return (
    <div className="mt-3">
      <button
        onClick={handleClick}
        disabled={isBusy}
        className={`flex w-full items-center justify-center gap-2 rounded-xl border px-3.5 py-3 text-[13px] font-medium transition-all duration-300 ${
          isBusy
            ? "cursor-not-allowed border-white/10 bg-white/[0.03] text-gray-500"
            : "border-white/10 bg-white/[0.03] text-gray-300 hover:border-white/20 hover:bg-white/[0.06] hover:text-white"
        }`}
      >
        {phase === "downloading" ? (
          <>
            <CheckCircle2 className="h-4 w-4" /> Starting your download...
          </>
        ) : isBusy ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Packing everything up... {percent}%
          </>
        ) : (
          <>
            <Download className="h-4 w-4" /> Download the whole app
          </>
        )}
      </button>

      {isBusy && (
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
          <div
            className="h-full rounded-full bg-gradient-to-r from-red-500 to-rose-400 transition-all duration-300"
            style={{ width: `${percent}%` }}
          />
        </div>
      )}

      {phase === "error" && <p className="mt-2 text-center text-xs text-red-400">{errorMsg}</p>}

      <p className="mt-1.5 text-center text-[11px] text-gray-600">
        This can take a few minutes — it&apos;s packaging everything, including your memories.
      </p>
    </div>
  );
}
