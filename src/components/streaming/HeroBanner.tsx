"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { MediaAsset } from "@prisma/client";
import { Play, Info } from "lucide-react";

interface HeroItem {
  title: string;
  type: string;
  description?: string | null;
  dateLabel?: string | null;
  detailCropX?: number | null;
  detailCropY?: number | null;
  mainAsset: MediaAsset;
  thumbnailAsset?: { id: string } | null;
}

interface HeroBannerProps {
  items: HeroItem[];
  profileName: string;
  interval?: number;
}

export default function HeroBanner({ items, profileName, interval = 10000 }: HeroBannerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (items.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % items.length);
    }, interval);
    return () => clearInterval(timer);
  }, [items.length, interval]);

  if (items.length === 0) {
    return (
      <div className="relative h-[80vh] min-h-[500px] w-full overflow-hidden sm:h-[85vh] sm:min-h-[600px]">
        <div className="absolute inset-0 bg-gradient-to-br from-[#050304] via-[#120A0B] to-[#8B0000]/20" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#050304] via-[#050304]/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#050304]/90 via-[#050304]/40 to-transparent" />
      </div>
    );
  }

  const slide = items[currentIndex];
  const nextSlide = items[(currentIndex + 1) % items.length];

  return (
    <div className="relative h-[80vh] min-h-[500px] w-full overflow-hidden sm:h-[85vh] sm:min-h-[600px]">
      {/* Only render the active slide — the rest stay unmounted */}
      <SlideRenderer key={slide.mainAsset.id} slide={slide} isActive />

      {/* Preload the *next* slide's mainAsset image */}
      {nextSlide && nextSlide.mainAsset.id !== slide.mainAsset.id && (
        <link
          rel="prefetch"
          href={`/api/media/${nextSlide.mainAsset.id}`}
          as={nextSlide.type === "VIDEO" ? "video" : "image"}
        />
      )}

      {/* Cinematic gradient overlays */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#050304] via-[#050304]/60 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#050304]/90 via-[#050304]/40 to-transparent" />

      {/* Text content with luxury styling */}
      <div className="absolute inset-0 flex items-end">
        <div className="w-full px-6 pb-20 sm:px-12 sm:pb-28 lg:px-24 lg:pb-32">
          <AnimatePresence mode="wait">
            <motion.div
              key={slide.mainAsset.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            >
              <motion.p 
                className="mb-3 text-xs font-semibold uppercase tracking-[0.3em] text-[#8B0000] sm:text-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.6 }}
              >
                {profileName}'s memories
              </motion.p>

              <motion.h1 
                className="mb-4 max-w-4xl font-['Playfair_Display'] text-4xl font-bold leading-tight text-white drop-shadow-2xl sm:mb-5 sm:text-5xl md:text-7xl lg:text-8xl"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.8 }}
              >
                {slide.title}
              </motion.h1>

              {slide.description && (
                <motion.p 
                  className="mb-6 max-w-2xl font-['Outfit'] text-sm leading-relaxed text-[#FDFBF7]/90 line-clamp-3 sm:text-base md:text-lg"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5, duration: 0.6 }}
                >
                  {slide.description}
                </motion.p>
              )}

              {slide.dateLabel && (
                <motion.p 
                  className="mb-6 text-xs text-[#A39294] sm:text-sm"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6, duration: 0.6 }}
                >
                  {slide.dateLabel}
                </motion.p>
              )}

              {/* Action buttons with luxury styling */}
              <motion.div 
                className="flex flex-wrap items-center gap-3 sm:gap-4"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7, duration: 0.6 }}
              >
                <button 
                  className="group flex items-center gap-2 rounded-md bg-[#8B0000] px-6 py-3 font-['Outfit'] text-sm font-semibold text-white shadow-lg transition-all duration-300 hover:bg-[#a80000] hover:shadow-[0_0_30px_rgba(139,0,0,0.5)] sm:px-8 sm:py-3.5 sm:text-base"
                  data-testid="hero-play-button"
                >
                  <Play className="h-5 w-5 fill-white transition-transform duration-300 group-hover:scale-110" />
                  Play Memory
                </button>
                <button 
                  className="flex items-center gap-2 rounded-md border border-white/20 bg-white/10 px-6 py-3 font-['Outfit'] text-sm font-semibold text-white shadow-md backdrop-blur-md transition-all duration-300 hover:border-white/40 hover:bg-white/20 sm:px-8 sm:py-3.5 sm:text-base"
                  data-testid="hero-info-button"
                >
                  <Info className="h-5 w-5" />
                  More Info
                </button>
              </motion.div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Elegant slideshow indicators */}
      {items.length > 1 && (
        <div className="absolute bottom-6 right-6 flex gap-2 sm:bottom-10 sm:right-10 sm:gap-2.5">
          {items.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentIndex(i)}
              className={`h-1 rounded-full transition-all duration-500 ${
                i === currentIndex 
                  ? "w-8 bg-[#8B0000] shadow-[0_0_12px_rgba(139,0,0,0.8)] sm:w-10" 
                  : "w-1 bg-white/30 hover:bg-white/50"
              }`}
              data-testid={`hero-indicator-${i}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── SlideRenderer ────────────────────────────────────────────────────
interface SlideProps {
  slide: HeroItem;
  isActive: boolean;
}

function SlideRenderer({ slide, isActive }: SlideProps) {
  const isVideo = slide.type === "VIDEO";

  return (
    <div className="absolute inset-0">
      {isVideo ? (
        <>
          {/* Poster fallback */}
          {slide.thumbnailAsset ? (
            <img
              src={`/api/media/${slide.thumbnailAsset.id}`}
              className="absolute inset-0 h-full w-full object-cover"
              alt=""
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-[#120A0B] via-[#050304] to-[#8B0000]/20" />
          )}
          <video
            src={`/api/media/${slide.mainAsset.id}`}
            className="relative h-full w-full object-cover"
            muted
            autoPlay
            loop
            playsInline
            preload="metadata"
          />
        </>
      ) : (
        <img
          src={`/api/media/${slide.mainAsset.id}`}
          alt={slide.title}
          className="h-full w-full object-cover"
          loading="eager"
          style={{
            objectPosition: `${slide.detailCropX ?? 50}% ${slide.detailCropY ?? 50}%`,
          }}
        />
      )}
    </div>
  );
}
