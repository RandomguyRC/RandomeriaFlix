"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { Loader2, X, ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import StickerMedia from "@/components/ui/StickerMedia";

interface Sticker {
  id: string;
  title: string;
  asset: { id: string; mimeType?: string };
}

export default function StickersPage() {
  const params = useParams();
  const profileSlug = params.profileslug as string;
  const [stickers, setStickers] = useState<Sticker[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/stickers?profileSlug=${profileSlug}`);
        if (res.ok) setStickers(await res.json());
      } catch {}
      setLoading(false);
    }
    load();
  }, [profileSlug]);

  const showPrev = useCallback(() => {
    setSelectedIndex((i) => (i === null ? null : (i - 1 + stickers.length) % stickers.length));
  }, [stickers.length]);

  const showNext = useCallback(() => {
    setSelectedIndex((i) => (i === null ? null : (i + 1) % stickers.length));
  }, [stickers.length]);

  useEffect(() => {
    if (selectedIndex === null) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") showPrev();
      else if (e.key === "ArrowRight") showNext();
      else if (e.key === "Escape") setSelectedIndex(null);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedIndex, showPrev, showNext]);

  const selectedSticker = selectedIndex !== null ? stickers[selectedIndex] : null;

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-red-500" />
      </div>
    );
  }

  if (stickers.length === 0) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-gray-500">No stickers.</p>
          <p className="mt-2 text-sm text-gray-600">All stickers got deleted with Random Guy.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 sm:px-6 sm:py-8">
      <h1 className="mb-6 text-xl font-bold text-white sm:text-2xl">Stickers</h1>

      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 sm:gap-4 md:grid-cols-6">
        {stickers.map((sticker, i) => (
          <motion.div
            key={sticker.id}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: i * 0.05 }}
            onClick={() => setSelectedIndex(i)}
            className="cursor-pointer rounded-xl border border-gray-800 bg-gray-900 p-3 transition-all hover:border-gray-600 hover:scale-105"
          >
            <div className="aspect-square overflow-hidden rounded-lg bg-gray-800">
              <StickerMedia assetId={sticker.asset.id} mimeType={sticker.asset.mimeType} title={sticker.title}
                className="h-full w-full object-contain" />
            </div>
            {sticker.title && (
              <p className="mt-2 text-center text-xs text-gray-400 truncate">{sticker.title}</p>
            )}
          </motion.div>
        ))}
      </div>

      {/* Full-size view */}
      <AnimatePresence>
        {selectedSticker && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={() => setSelectedIndex(null)}>
            {stickers.length > 1 && (
              <button
                onClick={(e) => { e.stopPropagation(); showPrev(); }}
                className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-gray-800/80 p-2 text-white hover:bg-gray-700 sm:left-6"
                aria-label="Previous sticker"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
            )}

            <motion.div
              key={selectedSticker.id}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="relative max-h-[80vh] w-[85vw] max-w-lg"
              onClick={(e) => e.stopPropagation()}
            >
              <button onClick={() => setSelectedIndex(null)}
                className="absolute -top-3 -right-3 z-10 rounded-full bg-gray-800 p-1.5 text-white hover:bg-gray-700">
                <X className="h-4 w-4" />
              </button>
              <StickerMedia assetId={selectedSticker.asset.id} mimeType={selectedSticker.asset.mimeType} title={selectedSticker.title}
                expanded
                className="max-h-[70vh] w-full rounded-xl object-contain" />
              {selectedSticker.title && (
                <p className="mt-3 text-center text-sm text-gray-400">{selectedSticker.title}</p>
              )}
            </motion.div>

            {stickers.length > 1 && (
              <button
                onClick={(e) => { e.stopPropagation(); showNext(); }}
                className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-gray-800/80 p-2 text-white hover:bg-gray-700 sm:right-6"
                aria-label="Next sticker"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            )}
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
