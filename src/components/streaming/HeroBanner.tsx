"use client";

import { useState, useEffect } from "react";
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

  const item = items.length > 0 ? items[currentIndex] : null;

  return (
    <div className="relative h-[60vh] min-h-[380px] w-full overflow-hidden sm:h-[70vh] sm:min-h-[500px]">
      {/* Slideshow */}
      <AnimatePresence mode="popLayout">
        {items.length > 0 ? (
          items.map((slide, i) => {
            const isVideo = slide.type === "VIDEO";
            const isActive = i === currentIndex;

            return (
              <motion.div
                key={slide.mainAsset.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: isActive ? 1 : 0 }}
                transition={{ duration: 1.2, ease: "easeInOut" }}
                className="absolute inset-0"
              >
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
                      preload="auto"
                    />
                  </>
                ) : (
                  <img
                    src={`/api/media/${slide.mainAsset.id}`}
                    alt={slide.title}
                    className="h-full w-full object-cover"
                    style={{
                      objectPosition: `${slide.detailCropX ?? 50}% ${slide.detailCropY ?? 50}%`,
                    }}
                  />
                )}
              </motion.div>
            );
          })
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-red-900/30" />
        )}
      </AnimatePresence>

      {/* Gradient: fade from bottom to dark */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/60 to-transparent" />
      {/* Gradient: fade from left for text readability */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0a]/80 to-transparent" />

      {/* Text content */}
      <div className="absolute inset-0 flex items-end">
        <div className="w-full px-4 pb-14 sm:px-12 sm:pb-24 lg:px-20">
          <AnimatePresence mode="wait">
            {item && (
              <motion.div
                key={item.mainAsset.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
              >
                <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-red-400">
                  {profileName}&apos;s memories
                </p>

                <h1 className="mb-3 max-w-3xl text-3xl font-black text-white drop-shadow-lg sm:mb-4 sm:text-4xl md:text-6xl">
                  {item.title}
                </h1>

                {item.description && (
                  <p className="mb-4 max-w-2xl text-sm text-gray-300 line-clamp-2 sm:text-lg">
                    {item.description}
                  </p>
                )}

                {item.dateLabel && (
                  <p className="text-sm text-gray-400">{item.dateLabel}</p>
                )}
              </motion.div>
            )}
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
