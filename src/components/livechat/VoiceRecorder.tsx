"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Mic, Square, Trash2, Send, Loader2 } from "lucide-react";
import type { SentAttachmentMessage } from "./AttachmentMenu";

// Picks the first mimeType the browser's MediaRecorder actually supports.
// Chrome/Firefox give webm/opus; Safari gives mp4/aac.
function pickMimeType(): string {
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
  for (const c of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported?.(c)) return c;
  }
  return "";
}

export default function VoiceRecorder({
  onSend,
  onActiveChange,
}: {
  onSend: (message: SentAttachmentMessage) => void;
  /** Fires whenever recording/preview starts or ends, so the parent input bar can hide the textarea. */
  onActiveChange?: (active: boolean) => void;
}) {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [preview, setPreview] = useState<{ blob: Blob; url: string; durationMs: number } | null>(null);
  const [sending, setSending] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtRef = useRef(0);

  const stopTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  };

  useEffect(() => {
    onActiveChange?.(recording || !!preview);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recording, preview]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeType = pickMimeType();
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const durationMs = Date.now() - startedAtRef.current;
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        setPreview({ blob, url: URL.createObjectURL(blob), durationMs });
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      };

      mediaRecorderRef.current = recorder;
      startedAtRef.current = Date.now();
      recorder.start();
      setRecording(true);
      setSeconds(0);
      stopTimer();
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } catch (err) {
      console.error("Mic permission / recording failed:", err);
    }
  }, []);

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
    stopTimer();
  }, []);

  const discardPreview = useCallback(() => {
    if (preview) URL.revokeObjectURL(preview.url);
    setPreview(null);
    setSeconds(0);
  }, [preview]);

  const sendPreview = useCallback(async () => {
    if (!preview) return;
    setSending(true);
    try {
      const ext = preview.blob.type.includes("mp4") ? "m4a" : "webm";
      const file = new File([preview.blob], `voice-note.${ext}`, { type: preview.blob.type });

      const formData = new FormData();
      formData.append("file", file);
      const uploadRes = await fetch("/api/live-chat/media", { method: "POST", body: formData });
      if (!uploadRes.ok) throw new Error("upload failed");
      const asset = await uploadRes.json();

      const msgRes = await fetch("/api/live-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "AUDIO", attachmentId: asset.id, durationMs: preview.durationMs }),
      });
      if (!msgRes.ok) throw new Error("send failed");
      const data = await msgRes.json();
      onSend(data.message);
      URL.revokeObjectURL(preview.url);
      setPreview(null);
      setSeconds(0);
    } catch (err) {
      console.error("Voice note send failed:", err);
    } finally {
      setSending(false);
    }
  }, [preview, onSend]);

  function formatTime(totalSeconds: number) {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  if (preview) {
    return (
      <div className="flex flex-1 items-center gap-2 rounded-2xl border border-white/10 bg-gray-900/80 px-3 py-2">
        <audio src={preview.url} controls className="h-9 flex-1" />
        <button
          onClick={discardPreview}
          disabled={sending}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-white/10 hover:text-red-400 disabled:opacity-40"
          aria-label="Discard voice note"
        >
          <Trash2 className="h-4 w-4" />
        </button>
        <button
          onClick={sendPreview}
          disabled={sending}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-rose-600 to-red-700 text-white shadow-md transition hover:scale-105 disabled:opacity-40"
          aria-label="Send voice note"
        >
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </button>
      </div>
    );
  }

  if (recording) {
    return (
      <div className="flex flex-1 items-center gap-2 rounded-2xl border border-rose-500/40 bg-gray-900/80 px-4 py-2.5">
        <span className="h-2.5 w-2.5 shrink-0 animate-pulse rounded-full bg-rose-500" />
        <span className="flex-1 text-sm text-gray-300">Recording… {formatTime(seconds)}</span>
        <button
          onClick={stopRecording}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-rose-600 to-red-700 text-white shadow-md transition hover:scale-105"
          aria-label="Stop recording"
        >
          <Square className="h-3.5 w-3.5 fill-current" />
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={startRecording}
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-white/10 hover:text-rose-400"
      aria-label="Record voice note"
    >
      <Mic className="h-5 w-5" />
    </button>
  );
}
