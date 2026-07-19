"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { X, Play, Pause, ChevronLeft, ChevronRight } from "lucide-react";
import type { ContentItem } from "./types";
import WaveformProgress from "@/components/ui/WaveformProgress";

interface AudioModalProps {
  item: ContentItem;
  items?: ContentItem[];
  onClose: () => void;
  onNavigate?: (item: ContentItem) => void;
}

export default function AudioModal({ item, items = [], onClose, onNavigate }: AudioModalProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const currentIndex = items.findIndex((i) => i.id === item.id);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex !== -1 && currentIndex < items.length - 1;

  const goPrev = () => {
    if (hasPrev && onNavigate) onNavigate(items[currentIndex - 1]);
  };

  const goNext = () => {
    if (hasNext && onNavigate) onNavigate(items[currentIndex + 1]);
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onLoaded = () => setDuration(audio.duration);
    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("loadedmetadata", onLoaded);
    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("loadedmetadata", onLoaded);
    };
  }, [item.id]);

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
    };
  }, []);

  // Reset playback state when navigating to a different track
  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
  }, [item.id]);

  // Close on escape, navigate on left/right
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose, hasPrev, hasNext, currentIndex, items]);

  function togglePlayPause() {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().catch(() => {});
      setIsPlaying(true);
    }
  }

  return (
    <>
      <style>{`.audio-details::-webkit-scrollbar { display: none; }`}</style>

      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pt-12" onClick={onClose}>
        {hasPrev && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              goPrev();
            }}
            aria-label="Previous memory"
            className="
              absolute
              left-2
              top-1/2
              z-[60]
              -translate-y-1/2
              flex
              h-11
              w-11
              items-center
              justify-center
              rounded-full
              border
              border-white/10
              bg-black/50
              text-white/80
              backdrop-blur-md
              transition-all
              duration-200
              hover:scale-110
              hover:bg-black/70
              hover:text-white
              sm:left-4
              sm:h-12
              sm:w-12
            "
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
        )}

        {hasNext && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              goNext();
            }}
            aria-label="Next memory"
            className="
              absolute
              right-2
              top-1/2
              z-[60]
              -translate-y-1/2
              flex
              h-11
              w-11
              items-center
              justify-center
              rounded-full
              border
              border-white/10
              bg-black/50
              text-white/80
              backdrop-blur-md
              transition-all
              duration-200
              hover:scale-110
              hover:bg-black/70
              hover:text-white
              sm:right-4
              sm:h-12
              sm:w-12
            "
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        )}

        <motion.div
          key={item.id}
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{ type: "spring", damping: 28, stiffness: 320 }}
          onClick={(e) => e.stopPropagation()}
          className="relative flex w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-gray-900 shadow-2xl"
          style={{ maxHeight: "80vh" }}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute right-3 top-3 z-20 rounded-full bg-gray-800/80 p-2 text-gray-400 backdrop-blur-sm hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Audio visual area */}
          <div className="relative flex-shrink-0 bg-gradient-to-br from-gray-900 via-gray-800 to-red-900/20 p-8 sm:p-12">
            <audio
              ref={audioRef}
              src={`/api/media/${item.mainAsset.id}`}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onEnded={() => setIsPlaying(false)}
            />

            {/* Large play button */}
            <div className="flex flex-col items-center gap-6">
              <button
                onClick={togglePlayPause}
                className="flex h-20 w-20 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition-all hover:bg-white/20 hover:scale-105"
              >
                {isPlaying ? (
                  <Pause className="h-8 w-8" />
                ) : (
                  <Play className="ml-1 h-8 w-8" />
                )}
              </button>

              {/* Waveform */}
              {duration > 0 && (
                <div className="w-full">
                  <WaveformProgress
                    src={`/api/media/${item.mainAsset.id}`}
                    currentTime={currentTime}
                    duration={duration}
                    onSeek={(time) => {
                      if (audioRef.current) audioRef.current.currentTime = time;
                      setCurrentTime(time);
                    }}
                    color="#ef4444"
                    height={40}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Details */}
          <div
            className="audio-details flex-1 overflow-y-auto p-6"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            <h2 className="text-2xl font-bold text-white">{item.title}</h2>

            <div className="mt-3 flex flex-wrap gap-3">
              {item.dateLabel && (
                <span className="rounded-full bg-gray-800 px-3 py-1 text-xs font-medium text-gray-300">
                  {item.dateLabel}
                </span>
              )}
              {item.mood && (
                <span className="rounded-full bg-red-900/40 px-3 py-1 text-xs font-medium text-red-300">
                  {item.mood}
                </span>
              )}
              <span className="rounded-full bg-gray-800 px-3 py-1 text-xs font-medium text-gray-400">
                🎵 Audio
              </span>
            </div>

            {item.description && (
              <p className="mt-4 text-sm leading-relaxed text-gray-300">
                {item.description}
              </p>
            )}

            {item.tags && (
              <div className="mt-4 flex flex-wrap gap-2">
                {item.tags.split(",").map((tag, i) => (
                  <span key={i} className="rounded bg-gray-800 px-2.5 py-1 text-xs text-gray-400">
                    {tag.trim()}
                  </span>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </>
  );
}
