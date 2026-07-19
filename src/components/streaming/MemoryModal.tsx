"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Play, Pause, Volume2, VolumeX, Maximize, ChevronLeft, ChevronRight } from "lucide-react";
import WaveformProgress from "@/components/ui/WaveformProgress";

interface ContentItem {
  id: string;
  title: string;
  type: string;
  description?: string | null;
  dateLabel?: string | null;
  tags?: string | null;
  mood?: string | null;
  detailCropX?: number | null;
  detailCropY?: number | null;
  thumbCropX?: number | null;
  thumbCropY?: number | null;
  musicStartMs?: number | null;
  musicDurationMs?: number | null;
  aspectMode?: string | null;
  detailZoom?: number | null;
  videoRotation?: number | null;
  mainAsset: { id: string; mimeType: string };
  thumbnailAsset?: { id: string } | null;
  musicAsset?: { id: string; mimeType: string } | null;
}

interface MemoryModalProps {
  item: ContentItem | null;
  items?: ContentItem[];
  onClose: () => void;
  onNavigate: (item: ContentItem) => void;
}

function formatTime(seconds: number) {
  if (!isFinite(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function MemoryModal({ item, items = [], onClose, onNavigate }: MemoryModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [detectedAspect, setDetectedAspect] = useState<"portrait" | "landscape">("landscape");

  const hasMusic = !!item?.musicAsset;
  const isVideo = item?.type === "VIDEO";
  const mediaRef = isVideo ? videoRef : audioRef;

  const currentIndex = item
    ? items.findIndex((i) => i.id === item.id)
    : -1;

  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex !== -1 && currentIndex < items.length - 1;

  const goPrev = () => {
    if (hasPrev) onNavigate(items[currentIndex - 1]);
  };

  const goNext = () => {
    if (hasNext) onNavigate(items[currentIndex + 1]);
  };

  // Determine if image should display as portrait
  const isPortrait = (() => {
    const mode = item?.aspectMode ?? "auto";
    if (mode === "portrait") return true;
    if (mode === "landscape") return false;
    return detectedAspect === "portrait"; // auto
  })();

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

  // Pause media when modal closes
  useEffect(() => {
    if (!item) stopAllMedia();
  }, [item]);

  // Auto-play music when modal opens
  useEffect(() => {
    if (!item || !audioRef.current) return;
    if (item.type === "PHOTO" && item.musicAsset) {
      const audio = audioRef.current;
      const startSec = (item.musicStartMs ?? 0) / 1000;
      const endSec = ((item.musicStartMs ?? 0) + (item.musicDurationMs ?? 15000)) / 1000;

      audio.currentTime = startSec;
      audio.play().catch(() => {});
      setIsPlaying(true);

      const onTimeUpdate = () => {
        if (audio.currentTime >= endSec) {
          audio.currentTime = startSec;
        }
        setCurrentTime(audio.currentTime - startSec);
      };
      audio.addEventListener("timeupdate", onTimeUpdate);
      setDuration(endSec - startSec);
      return () => audio.removeEventListener("timeupdate", onTimeUpdate);
    }
  }, [item]);

  // Track video time
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !isVideo) return;

    const onTimeUpdate = () => setCurrentTime(video.currentTime);
    const onLoaded = () => setDuration(video.duration);

    video.addEventListener("timeupdate", onTimeUpdate);
    video.addEventListener("loadedmetadata", onLoaded);
    return () => {
      video.removeEventListener("timeupdate", onTimeUpdate);
      video.removeEventListener("loadedmetadata", onLoaded);
    };
  }, [isVideo]);

  function stopAllMedia() {
    videoRef.current?.pause();
    videoRef.current && (videoRef.current.currentTime = 0);
    audioRef.current?.pause();
    audioRef.current && (audioRef.current.currentTime = 0);
    setIsPlaying(false);
    setCurrentTime(0);
  }

  function togglePlayPause() {
    const media = mediaRef.current;
    if (!media) return;
    if (isPlaying) {
      media.pause();
      setIsPlaying(false);
    } else {
      media.play().catch(() => {});
      setIsPlaying(true);
    }
  }

  function toggleMute() {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setIsMuted(!isMuted);
    }
  }

  function toggleFullscreen() {
    videoRef.current?.requestFullscreen?.();
  }

  return (
    <AnimatePresence>
      {item && (
        <>
          <style>{`.modal-details::-webkit-scrollbar { display: none; }`}</style>

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
              className="relative flex w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-gray-900 shadow-2xl"
              style={{ maxHeight: "85vh" }}
            >
              {/* Close button */}
              <button
                onClick={onClose}
                className="absolute right-3 top-3 z-20 rounded-full bg-gray-800/80 p-2 text-gray-400 backdrop-blur-sm transition-colors hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>

              {/* Media area */}
              <div className="relative flex-shrink-0 overflow-hidden bg-black">
                {isVideo ? (
                  <video
                    ref={videoRef}
                    src={`/api/media/${item.mainAsset.id}`}
                    className="w-full object-contain"
                    style={{
                      maxHeight: "60vh",
                      transform: `rotate(${item.videoRotation ?? 0}deg)`,
                    }}
                    autoPlay
                    muted={!!hasMusic}
                    playsInline
                    loop
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                  />
                ) : (
                  <img
                    src={`/api/media/${item.mainAsset.id}`}
                    alt={item.title}
                    className={isPortrait ? "mx-auto max-h-[60vh] w-auto object-contain" : "w-full object-cover"}
                    style={{
                      maxHeight: "60vh",
                      objectPosition: isPortrait ? undefined : `${item.detailCropX ?? 50}% ${item.detailCropY ?? 50}%`,
                      transform: `scale(${item.detailZoom ?? 1})`,
                      transformOrigin: isPortrait ? "center center" : `${item.detailCropX ?? 50}% ${item.detailCropY ?? 50}%`,
                    }}
                    onLoad={(e) => {
                      const img = e.currentTarget;
                      setDetectedAspect(img.naturalHeight > img.naturalWidth ? "portrait" : "landscape");
                    }}
                  />
                )}

                {/* Hidden audio */}
                {hasMusic && (
                  <audio
                    ref={audioRef}
                    src={`/api/media/${item.musicAsset!.id}`}
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                  />
                )}

                {/* Player bar — for video or photo with music */}
                {(isVideo || hasMusic) && (
                  <div className="absolute bottom-0 left-0 right-0 flex items-center gap-3 bg-gradient-to-t from-black/80 to-transparent px-4 py-2.5">
                    {/* Play/Pause */}
                    <button onClick={togglePlayPause}
                      className="flex-shrink-0 rounded-full bg-white/10 p-2 text-white backdrop-blur-sm hover:bg-white/20">
                      {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    </button>

                    {/* Time */}
                    <span className="flex-shrink-0 text-[11px] font-medium text-white/70 tabular-nums">
                      {formatTime(currentTime)}
                    </span>

                    {/* Waveform */}
                    <WaveformProgress
                      src={isVideo ? `/api/media/${item.mainAsset.id}` : `/api/media/${item.musicAsset!.id}`}
                      currentTime={currentTime}
                      duration={duration}
                      onSeek={(time) => {
                        if (isVideo && videoRef.current) {
                          videoRef.current.currentTime = time;
                        } else if (hasMusic && audioRef.current) {
                          const startSec = (item!.musicStartMs ?? 0) / 1000;
                          audioRef.current.currentTime = startSec + time;
                        }
                        setCurrentTime(time);
                      }}
                      color="#ef4444"
                      height={32}
                    />

                    {/* Duration */}
                    <span className="flex-shrink-0 text-[11px] font-medium text-white/50 tabular-nums">
                      {formatTime(duration)}
                    </span>

                    {/* Video-only buttons */}
                    {isVideo && (
                      <>
                        <button onClick={toggleMute}
                          className="flex-shrink-0 rounded-full p-1.5 text-white/70 hover:text-white">
                          {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                        </button>
                        <button onClick={toggleFullscreen}
                          className="flex-shrink-0 rounded-full p-1.5 text-white/70 hover:text-white">
                          <Maximize className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Details */}
              <div
                className="modal-details flex-1 overflow-y-auto p-4 sm:p-6"
                style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
              >
                <h2 className="text-lg font-bold text-white sm:text-2xl">{item.title}</h2>

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
                    {item.type === "PHOTO" ? "📷 Photo" : "🎬 Video"}
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
      )}
    </AnimatePresence>
  );
}
