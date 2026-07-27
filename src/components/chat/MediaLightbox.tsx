"use client";

import { Download, X } from "lucide-react";
import type { ChatAttachmentData } from "./types";

export default function MediaLightbox({
  attachment,
  onClose,
}: {
  attachment: ChatAttachmentData;
  onClose: () => void;
}) {
  if (!attachment.url) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4" onClick={onClose}>
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20"
        aria-label="Close media preview"
      >
        <X className="h-6 w-6" />
      </button>
      <a
        href={attachment.downloadUrl || attachment.url}
        download={attachment.originalName}
        className="absolute right-16 top-4 rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20"
        aria-label="Download media"
        onClick={(event) => event.stopPropagation()}
      >
        <Download className="h-6 w-6" />
      </a>

      <div className="max-h-[88vh] max-w-[92vw]" onClick={(event) => event.stopPropagation()}>
        {attachment.kind === "IMAGE" ? (
          <img src={attachment.url} alt={attachment.originalName} className="max-h-[88vh] max-w-[92vw] rounded-lg object-contain" />
        ) : attachment.kind === "VIDEO" ? (
          <video src={attachment.url} controls autoPlay className="max-h-[88vh] max-w-[92vw] rounded-lg" />
        ) : null}
      </div>
    </div>
  );
}
