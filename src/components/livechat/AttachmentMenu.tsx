"use client";

import { useRef, useState } from "react";
import { Paperclip, Loader2 } from "lucide-react";

export interface SentAttachmentMessage {
  id: string;
  sender: "admin" | "viewer";
  kind: "IMAGE" | "VIDEO";
  content: string | null;
  createdAt: string;
  readAt: string | null;
  attachment: {
    id: string;
    kind: string;
    mimeType: string;
    originalName: string;
    sizeBytes: number;
  } | null;
  durationMs: number | null;
}

function getVideoDurationMs(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(video.src);
      resolve(Number.isFinite(video.duration) ? Math.round(video.duration * 1000) : null);
    };
    video.onerror = () => resolve(null);
    video.src = URL.createObjectURL(file);
  });
}

export default function AttachmentMenu({ onSend }: { onSend: (message: SentAttachmentMessage) => void }) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setUploading(true);
    try {
      const kind: "IMAGE" | "VIDEO" = file.type.startsWith("video/") ? "VIDEO" : "IMAGE";
      const durationMs = kind === "VIDEO" ? await getVideoDurationMs(file) : null;

      const formData = new FormData();
      formData.append("file", file);
      const uploadRes = await fetch("/api/live-chat/media", { method: "POST", body: formData });
      if (!uploadRes.ok) throw new Error("upload failed");
      const asset = await uploadRes.json();

      const msgRes = await fetch("/api/live-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, attachmentId: asset.id, durationMs }),
      });
      if (!msgRes.ok) throw new Error("send failed");
      const data = await msgRes.json();
      onSend(data.message);
    } catch (err) {
      console.error("Attachment send failed:", err);
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*,video/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = ""; // allow picking the same file again later
          if (file) handleFile(file);
        }}
      />
      <button
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-white/10 hover:text-rose-400 disabled:opacity-40"
        aria-label="Send photo or video"
      >
        {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Paperclip className="h-5 w-5" />}
      </button>
    </>
  );
}
