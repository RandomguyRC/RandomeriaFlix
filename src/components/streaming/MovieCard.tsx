"use client";

import { useCallback, useRef, useState, useEffect } from "react";
import type { Placement } from "./types";

interface MovieCardProps {
  placement: Placement;
  onClick: () => void;
}

export default function MovieCard({
  placement,
  onClick,
}: MovieCardProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  const item = placement.contentItem;

  const hasMusic = !!item.musicAsset;
  const startMs = item.musicStartMs ?? 0;

  // ── Intersection Observer — only load img/video when card enters viewport ──
  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect(); // one-shot — no need to keep observing
        }
      },
      { rootMargin: "200px" } // start loading 200px before it enters viewport
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const handleMouseEnter = useCallback(() => {
    if (!hasMusic || !audioRef.current) return;

    const audio = audioRef.current;
    audio.currentTime = startMs / 1000;
    audio.play().catch(() => {});
  }, [hasMusic, startMs]);

  const handleMouseLeave = useCallback(() => {
    if (!hasMusic || !audioRef.current) return;

    const audio = audioRef.current;
    audio.pause();
    audio.currentTime = startMs / 1000;
  }, [hasMusic, startMs]);

  return (
    <div
      ref={cardRef}
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="
        relative
        w-full
        aspect-video
        cursor-pointer
        overflow-hidden
        rounded-md
        bg-zinc-900
        transition-all
        duration-300
        ease-out
        hover:z-30
        hover:scale-[1.12]
        hover:shadow-[0_12px_50px_rgba(0,0,0,0.85)]
      "
    >
      {hasMusic && (
        <audio
          ref={audioRef}
          src={`/api/media/${item.musicAsset!.id}`}
          preload="metadata"
        />
      )}

      {/* Only render the image when the card is visible (or about to be) */}
      {item.type === "AUDIO" ? (
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-gray-800 via-gray-900 to-red-900/30">
          <svg className="h-16 w-16 text-gray-500 transition-colors duration-300 group-hover:text-red-400" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
          </svg>
        </div>
      ) : isVisible ? (
        item.thumbnailAsset ? (
          <img
            src={`/api/media/${item.thumbnailAsset.id}`}
            alt={item.title}
            loading="lazy"
            className="h-full w-full object-cover"
          />
        ) : (
          <img
            // Use ?w=400 to request a downscaled WebP thumbnail instead of
            // the full-size original — huge bandwidth and memory saving.
            src={`/api/media/${item.mainAsset.id}?w=400`}
            alt={item.title}
            loading="lazy"
            className="h-full w-full object-cover"
            style={{
              objectPosition: `${item.thumbCropX ?? 50}% ${item.thumbCropY ?? 50}%`,
            }}
          />
        )
      ) : (
        /* Skeleton placeholder until card scrolls into view */
        <div className="h-full w-full bg-zinc-800 animate-pulse" />
      )}

      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-black/15 to-transparent opacity-80" />

      {/* Title */}
      <div className="absolute bottom-0 left-0 right-0 p-3">
        <h3 className="truncate text-sm font-semibold text-white">
          {item.title}
        </h3>

        {item.dateLabel && (
          <p className="mt-1 text-xs text-gray-300">
            {item.dateLabel}
          </p>
        )}
      </div>
    </div>
  );
}
