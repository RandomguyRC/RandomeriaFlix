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
    <div className="relative h-[70vh] min-h-[500px] w-full overflow-hidden">
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
        <div className="w-full px-6 pb-24 sm:px-12 lg:px-20">
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

                <h1 className="mb-4 max-w-3xl text-4xl font-black text-white drop-shadow-lg sm:text-6xl">
                  {item.title}
                </h1>

                {item.description && (
                  <p className="mb-4 max-w-2xl text-lg text-gray-300 line-clamp-2">
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
        <div className="absolute bottom-8 right-8 flex gap-2">
          {items.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentIndex(i)}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === currentIndex ? "w-6 bg-red-500" : "w-2 bg-white/40 hover:bg-white/60"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
