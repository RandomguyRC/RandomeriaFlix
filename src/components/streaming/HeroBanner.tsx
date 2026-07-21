"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { MediaAsset } from "@prisma/client";

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
      <div className="relative h-[60vh] min-h-[380px] w-full overflow-hidden sm:h-[70vh] sm:min-h-[500px]">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-red-900/30" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0a]/80 to-transparent" />
      </div>
    );
  }

  const slide = items[currentIndex];
  const nextSlide = items[(currentIndex + 1) % items.length];

  return (
    <div className="relative h-[60vh] min-h-[380px] w-full overflow-hidden sm:h-[70vh] sm:min-h-[500px]">
      {/* Only render the active slide — the rest stay unmounted */}
      <SlideRenderer key={slide.mainAsset.id} slide={slide} isActive />

      {/* Preload the *next* slide's mainAsset image in a hidden <link> so it's
          ready when we transition without loading everything at once. */}
      {nextSlide && nextSlide.mainAsset.id !== slide.mainAsset.id && (
        <link
          rel="prefetch"
          href={`/api/media/${nextSlide.mainAsset.id}`}
          as={nextSlide.type === "VIDEO" ? "video" : "image"}
        />
      )}

      {/* Gradient: fade from bottom to dark */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/60 to-transparent" />
      {/* Gradient: fade from left for text readability */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0a]/80 to-transparent" />

      {/* Text content */}
      <div className="absolute inset-0 flex items-end">
        <div className="w-full px-4 pb-14 sm:px-12 sm:pb-24 lg:px-20">
          <AnimatePresence mode="wait">
            <motion.div
              key={slide.mainAsset.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            >
              <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-red-400">
                {profileName}&apos;s memories
              </p>

              <h1 className="mb-3 max-w-3xl text-3xl font-black text-white drop-shadow-lg sm:mb-4 sm:text-4xl md:text-6xl">
                {slide.title}
              </h1>

              {slide.description && (
                <p className="mb-4 max-w-2xl text-sm text-gray-300 line-clamp-2 sm:text-lg">
                  {slide.description}
                </p>
              )}

              {slide.dateLabel && (
                <p className="text-sm text-gray-400">{slide.dateLabel}</p>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Slideshow dots */}
      {items.length > 1 && (
        <div className="absolute bottom-4 right-4 flex gap-1.5 sm:bottom-8 sm:right-8 sm:gap-2">
          {items.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentIndex(i)}
              className={`h-1.5 rounded-full transition-all duration-300 sm:h-2 ${
                i === currentIndex ? "w-5 bg-red-500 sm:w-6" : "w-1.5 bg-white/40 hover:bg-white/60 sm:w-2"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── SlideRenderer ────────────────────────────────────────────────────
// Renders a single slide (image or video).  Only the active one is mounted.
// Videos get preload="metadata" so they don't download the whole file.
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
          {/* Poster fallback while video loads */}
          {slide.thumbnailAsset ? (
            <img
              src={`/api/media/${slide.thumbnailAsset.id}`}
              className="absolute inset-0 h-full w-full object-cover"
              alt=""
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-red-900/20" />
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
