"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";

interface StickerMediaProps {
  assetId: string;
  mimeType?: string | null;
  title?: string;
  className?: string;
  /** Larger stickers (expanded view) use a custom play/pause button instead of native video controls */
  expanded?: boolean;
}

export default function StickerMedia({ assetId, mimeType, title, className, expanded }: StickerMediaProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const isVideo = !!mimeType && mimeType.startsWith("video/");
  const src = `/api/media/${assetId}`;

  useEffect(() => {
    setIsPlaying(true);
  }, [assetId]);

  const togglePlayback = () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      void video.play();
    } else {
      video.pause();
    }
  };

  if (isVideo) {
    if (!expanded) {
      return (
        <video
          src={src}
          className={className}
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
        />
      );
    }

    return (
      <div
        className="group relative cursor-pointer"
        role="button"
        tabIndex={0}
        aria-label={`${isPlaying ? "Pause" : "Play"} ${title || "sticker"}`}
        onClick={togglePlayback}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            togglePlayback();
          }
        }}
      >
        <video
          ref={videoRef}
          src={src}
          className={className}
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
        />
        <div className={`pointer-events-none absolute inset-0 flex items-center justify-center transition-opacity duration-200 ${isPlaying ? "opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100" : "opacity-100"}`}>
          <div className="flex h-16 w-16 items-center justify-center rounded-full border border-white/25 bg-black/55 text-white shadow-2xl shadow-black/40 backdrop-blur-md transition-transform duration-200 group-hover:scale-105">
            {isPlaying ? <Pause className="h-7 w-7" fill="currentColor" /> : <Play className="ml-1 h-7 w-7" fill="currentColor" />}
          </div>
        </div>
      </div>
    );
  }

  // image/png, image/webp (static or animated), image/gif (animated) all autoplay natively via <img>
  return <img src={src} alt={title || "Sticker"} className={className} loading="lazy" />;
}
