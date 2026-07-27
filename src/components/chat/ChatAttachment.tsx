"use client";

import { useState } from "react";
import { AlertTriangle, Download, FileText, Image as ImageIcon, Music, Play, Video } from "lucide-react";
import type { ChatAttachmentData } from "./types";

function LoadErrorBadge({ url, label }: { url: string; label: string }) {
  return (
    <div className="mt-2 max-w-[320px] rounded-xl border border-red-500/30 bg-red-950/30 p-3 text-sm text-red-200">
      <div className="mb-1 flex items-center gap-2 font-medium">
        <AlertTriangle className="h-4 w-4 flex-shrink-0" />
        <span>{label} failed to load</span>
      </div>
      <a href={url} target="_blank" rel="noreferrer" className="block truncate text-xs text-red-300/80 underline decoration-red-300/40 hover:text-red-200">
        {url}
      </a>
    </div>
  );
}

function formatSize(size: number | null) {
  if (!size) return "";
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`;
  return `${(size / 1024 / 1024).toFixed(size > 100 * 1024 * 1024 ? 0 : 1)} MB`;
}

function DownloadLink({ attachment }: { attachment: ChatAttachmentData }) {
  if (!attachment.downloadUrl) return null;
  return (
    <a
      href={attachment.downloadUrl}
      download={attachment.originalName}
      onClick={(event) => event.stopPropagation()}
      className="inline-flex items-center gap-1 rounded-full bg-black/20 px-2 py-1 text-[11px] text-white/80 transition hover:bg-black/30 hover:text-white"
    >
      <Download className="h-3.5 w-3.5" /> Download
    </a>
  );
}

export default function ChatAttachment({
  attachment,
  onPreview,
}: {
  attachment: ChatAttachmentData;
  onPreview: (attachment: ChatAttachmentData) => void;
}) {
  const title = attachment.originalName || attachment.originalRef || "Attachment";
  const [failed, setFailed] = useState(false);

  if (!attachment.url) {
    const typeLabel = attachment.kind === "IMAGE" ? "📷" : attachment.kind === "VIDEO" ? "🎬" : attachment.kind === "AUDIO" ? "🎵" : attachment.kind === "PDF" ? "📄" : "📎";
    return (
      <div className="mt-2 flex items-center gap-2 rounded-xl bg-black/20 p-3 text-sm text-white/70">
        <span className="text-base">{typeLabel}</span>
        <span className="min-w-0 flex-1 truncate">{title}</span>
        <span className="text-[10px] text-white/40">(not available)</span>
      </div>
    );
  }

  if (attachment.kind === "IMAGE") {
    if (failed) return <LoadErrorBadge url={`${attachment.url}?w=640`} label="Image" />;
    return (
      <div className="mt-2 max-w-[320px] overflow-hidden rounded-xl bg-black/20">
        <button
          type="button"
          onClick={() => onPreview(attachment)}
          className="group block w-full text-left"
        >
          <img
            src={`${attachment.url}?w=640`}
            alt={title}
            loading="lazy"
            onError={() => setFailed(true)}
            className="max-h-[360px] min-h-[80px] w-full object-cover transition duration-200 group-hover:scale-[1.02]"
          />
        </button>
        <div className="flex items-center justify-between gap-2 p-2">
          <span className="truncate text-xs text-white/70"><ImageIcon className="mr-1 inline h-3.5 w-3.5" />{title}</span>
          <DownloadLink attachment={attachment} />
        </div>
      </div>
    );
  }

  if (attachment.kind === "VIDEO") {
    if (failed) return <LoadErrorBadge url={attachment.url} label="Video" />;
    return (
      <div className="mt-2 max-w-[360px] overflow-hidden rounded-xl bg-black/20">
        <button type="button" onClick={() => onPreview(attachment)} className="relative block w-full text-left">
          <video
            src={attachment.url}
            preload="metadata"
            onError={() => setFailed(true)}
            className="max-h-[360px] min-h-[120px] w-full bg-black object-contain"
          />
          <span className="absolute inset-0 flex items-center justify-center bg-black/20 text-white">
            <span className="rounded-full bg-black/50 p-3"><Play className="h-6 w-6 fill-current" /></span>
          </span>
        </button>
        <div className="flex items-center justify-between gap-2 p-2">
          <span className="truncate text-xs text-white/70"><Video className="mr-1 inline h-3.5 w-3.5" />{title}</span>
          <DownloadLink attachment={attachment} />
        </div>
      </div>
    );
  }

  if (attachment.kind === "AUDIO") {
    if (failed) return <LoadErrorBadge url={attachment.url} label="Audio" />;
    return (
      <div className="mt-2 rounded-2xl bg-black/20 p-3">
        <div className="mb-2 flex items-center gap-2 text-xs text-white/70">
          <Music className="h-4 w-4" />
          <span className="min-w-0 flex-1 truncate">{title}</span>
          <span>{formatSize(attachment.sizeBytes)}</span>
        </div>
        <audio src={attachment.url} controls preload="metadata" onError={() => setFailed(true)} className="w-full max-w-[320px]" />
      </div>
    );
  }

  if (attachment.kind === "PDF") {
    return (
      <a href={attachment.url} target="_blank" rel="noreferrer" className="mt-2 flex items-center gap-3 rounded-xl bg-black/20 p-3 transition hover:bg-black/30">
        <FileText className="h-8 w-8 text-red-300" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-white/90">{title}</span>
          <span className="text-xs text-white/50">PDF · opens in a new tab</span>
        </span>
        <Download className="h-5 w-5 text-white/60" />
      </a>
    );
  }

  return (
    <a href={attachment.downloadUrl || attachment.url} download={title} className="mt-2 flex items-center gap-3 rounded-xl bg-black/20 p-3 transition hover:bg-black/30">
      <FileText className="h-8 w-8 text-white/70" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-white/90">{title}</span>
        <span className="text-xs text-white/50">{formatSize(attachment.sizeBytes) || "File"}</span>
      </span>
      <Download className="h-5 w-5 text-white/60" />
    </a>
  );
}
