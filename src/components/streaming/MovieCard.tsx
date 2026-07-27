"use client";

import { useCallback, useRef, useState, useEffect } from "react";
import { Play } from "lucide-react";
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
  const [isHovered, setIsHovered] = useState(false);

  const item = placement.contentItem;

  const hasMusic = !!item.musicAsset;
  const startMs = item.musicStartMs ?? 0;

  // Intersection Observer for lazy loading
  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "1000px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
    if (!hasMusic || !audioRef.current) return;

    const audio = audioRef.current;
    audio.currentTime = startMs / 1000;
    audio.play().catch(() => {});
  }, [hasMusic, startMs]);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
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
        group
        relative
        w-full
        aspect-video
        cursor-pointer
        overflow-hidden
        rounded-lg
        bg-[#120A0B]
        transition-all
        duration-500
        ease-out
        hover:z-30
        hover:scale-105
        hover:shadow-[0_20px_60px_rgba(139,0,0,0.4)]
      "
      data-testid={`memory-card-${item.id}`}
    >
      {hasMusic && (
        <audio
          ref={audioRef}
          src={`/api/media/${item.musicAsset!.id}`}
          preload="metadata"
        />
      )}

      {/* Render based on content type */}
      {item.type === "AUDIO" ? (
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#120A0B] via-[#050304] to-[#8B0000]/30">
          <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-[#8B0000]/20 backdrop-blur-sm transition-all duration-300 group-hover:scale-110 group-hover:bg-[#8B0000]/40">
            <svg className="h-10 w-10 text-[#8B0000] transition-colors duration-300 group-hover:text-[#a80000]" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
            </svg>
          </div>
        </div>
      ) : isVisible ? (
        <>
          <img
            src={item.thumbnailAsset ? `/api/media/${item.thumbnailAsset.id}` : `/api/media/${item.mainAsset.id}?w=400`}
            alt={item.title}
            loading="eager"
            className="h-full w-full object-cover transition-all duration-700 group-hover:scale-110"
            style={{
              objectPosition: `${item.thumbCropX ?? 50}% ${item.thumbCropY ?? 50}%`,
            }}
          />
          {/* Play overlay on hover */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-300 group-hover:opacity-100">
            <div className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-white bg-white/10 backdrop-blur-md transition-all duration-300 group-hover:scale-110">
              <Play className="h-6 w-6 fill-white text-white" />
            </div>
          </div>
        </>
      ) : (
        /* Elegant skeleton loader */
        <div className="shimmer h-full w-full bg-[#120A0B]" />
      )}

      {/* Gradient overlay - stronger on hover */}
      <div className={`absolute inset-0 bg-gradient-to-t from-[#050304] via-[#050304]/40 to-transparent transition-opacity duration-300 ${
        isHovered ? 'opacity-70' : 'opacity-50'
      }`} />

      {/* Title and metadata */}
      <div className="absolute inset-x-0 bottom-0 p-4 transition-all duration-300 group-hover:pb-5">
        <h3 className="mb-1 font-['Outfit'] text-sm font-semibold text-white drop-shadow-lg line-clamp-1 sm:text-base">
          {item.title}
        </h3>

        {item.dateLabel && (
          <p className="font-['Outfit'] text-xs text-[#A39294] drop-shadow-md">
            {item.dateLabel}
          </p>
        )}
      </div>

      {/* Subtle border on hover */}
      <div className="pointer-events-none absolute inset-0 rounded-lg border border-white/0 transition-all duration-300 group-hover:border-white/20" />
    </div>
  );
}
