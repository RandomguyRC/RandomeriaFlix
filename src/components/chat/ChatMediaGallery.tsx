"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, FileText, Music, Loader2, ArrowRight, Play, Image as ImageIcon, ChevronLeft, ChevronRight } from "lucide-react";

interface GalleryItem {
  id: string;
  kind: string;
  url: string | null;
  downloadUrl: string | null;
  mimeType: string | null;
  originalName: string;
  sizeBytes: number | null;
  sortOrder: number;
  dateLabel: string | null;
}

function formatSize(size: number | null) {
  if (!size) return "";
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`;
  return `${(size / 1024 / 1024).toFixed(size > 100 * 1024 * 1024 ? 0 : 1)} MB`;
}

function formatDateLabel(dateLabel: string | null): string {
  if (!dateLabel) return "";
  return dateLabel.split(" ")[0] || "";
}

export default function ChatMediaGallery({
  profileSlug,
  onClose,
  onGoToMessage,
}: {
  profileSlug: string;
  onClose: () => void;
  onGoToMessage: (sortOrder: number) => void;
}) {
  const [tab, setTab] = useState<"media" | "docs">("media");
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [lightbox, setLightbox] = useState<GalleryItem | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState(-1);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Reset and reload when switching tabs
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setItems([]);
    setPage(0);
    fetch(`/api/chat/media?profileSlug=${profileSlug}&tab=${tab}&page=0`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        setItems(data.items || []);
        setHasMore(Boolean(data.hasMore));
        setTotalCount(data.totalCount || 0);
      })
      .catch(() => {})
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [tab, profileSlug]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const res = await fetch(`/api/chat/media?profileSlug=${profileSlug}&tab=${tab}&page=${nextPage}`);
      if (res.ok) {
        const data = await res.json();
        setItems((prev) => [...prev, ...(data.items || [])]);
        setHasMore(Boolean(data.hasMore));
        setPage(nextPage);
      }
    } catch {}
    setLoadingMore(false);
  }, [loadingMore, hasMore, page, profileSlug, tab]);

  // Infinite scroll via IntersectionObserver on a sentinel at the bottom.
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { rootMargin: "300px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [loadMore]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (lightbox) setLightbox(null);
        else onClose();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox, onClose]);

  function openLightbox(item: GalleryItem, index: number) {
    if (item.kind === "IMAGE" || item.kind === "VIDEO") {
      setLightbox(item);
      setLightboxIndex(index);
    } else if (item.url) {
      window.open(item.url, "_blank", "noreferrer");
    }
  }

  function goToMessageAndClose(sortOrder: number) {
    onGoToMessage(sortOrder);
    setLightbox(null);
    onClose();
  }

  function navigateLightbox(dir: 1 | -1) {
    const nextIndex = lightboxIndex + dir;
    if (nextIndex < 0 || nextIndex >= items.length) return;
    const nextItem = items[nextIndex];
    if (nextItem.kind === "IMAGE" || nextItem.kind === "VIDEO") {
      setLightbox(nextItem);
      setLightboxIndex(nextIndex);
    }
  }

  return (
    <>
      <AnimatePresence>
        <motion.div
          key="gallery-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4"
          onClick={onClose}
        >
          <motion.div
            key="gallery-panel"
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ type: "spring", damping: 26, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className="flex h-full w-full flex-col overflow-hidden border border-white/10 bg-[#101619] shadow-2xl sm:h-[85vh] sm:max-h-[720px] sm:w-full sm:max-w-lg sm:rounded-3xl"
          >
            {/* Header */}
            <div className="flex flex-shrink-0 items-center justify-between border-b border-white/[0.06] bg-[#1a2329] px-4 py-3.5 sm:px-5">
              <div>
                <h3 className="text-sm font-semibold text-white">Cherry 🍒</h3>
                <p className="text-xs text-gray-400">{totalCount.toLocaleString()} {tab === "media" ? "media items" : "documents"}</p>
              </div>
              <button
                onClick={onClose}
                className="rounded-full p-2 text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex flex-shrink-0 gap-1 border-b border-white/[0.06] px-4 pt-2 sm:px-5">
              {(["media", "docs"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`relative px-3 py-2.5 text-sm font-medium capitalize transition-colors ${
                    tab === t ? "text-emerald-400" : "text-gray-400 hover:text-gray-200"
                  }`}
                >
                  {t === "media" ? "Media" : "Docs"}
                  {tab === t && (
                    <motion.div layoutId="gallery-tab-underline" className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-emerald-400" />
                  )}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-4">
              {loading ? (
                <div className="flex h-full items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
                </div>
              ) : items.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-gray-500">
                  {tab === "media" ? <ImageIcon className="h-8 w-8" /> : <FileText className="h-8 w-8" />}
                  <p className="text-sm">No {tab === "media" ? "photos or videos" : "documents"} yet</p>
                </div>
              ) : tab === "media" ? (
                <div className="grid grid-cols-3 gap-1 sm:gap-1.5">
                  {items.map((item, i) => (
                    <button
                      key={item.id}
                      onClick={() => openLightbox(item, i)}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        goToMessageAndClose(item.sortOrder);
                      }}
                      className="group relative aspect-square overflow-hidden rounded-md bg-black/30"
                    >
                      {item.kind === "IMAGE" ? (
                        <img src={`${item.url}?w=240`} alt={item.originalName} loading="lazy" className="h-full w-full object-cover transition duration-200 group-hover:scale-105" />
                      ) : (
                        <>
                          <video src={item.url || undefined} preload="metadata" className="h-full w-full object-cover" />
                          <span className="absolute inset-0 flex items-center justify-center bg-black/25">
                            <Play className="h-5 w-5 fill-white text-white" />
                          </span>
                        </>
                      )}
                      <span className="absolute bottom-0 left-0 right-0 truncate bg-gradient-to-t from-black/70 to-transparent px-1.5 py-1 text-left text-[10px] text-white/80 opacity-0 transition-opacity group-hover:opacity-100">
                        {formatDateLabel(item.dateLabel)}
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        goToMessageAndClose(item.sortOrder);
                      }}
                      className="group flex items-center gap-3 rounded-xl bg-white/[0.04] p-3 transition-colors hover:bg-white/[0.08]"
                    >
                      <a
                        href={item.downloadUrl || item.url || "#"}
                        target="_blank"
                        rel="noreferrer"
                        className="flex min-w-0 flex-1 items-center gap-3"
                      >
                        <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-black/30">
                          {item.kind === "AUDIO" ? (
                            <Music className="h-5 w-5 text-emerald-300" />
                          ) : (
                            <FileText className="h-5 w-5 text-red-300" />
                          )}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-white/90">{item.originalName}</span>
                          <span className="text-xs text-white/45">
                            {formatDateLabel(item.dateLabel)}{formatSize(item.sizeBytes) ? ` · ${formatSize(item.sizeBytes)}` : ""}
                          </span>
                        </span>
                      </a>
                      <button
                        onClick={() => goToMessageAndClose(item.sortOrder)}
                        className="flex-shrink-0 rounded-full p-2 text-gray-500 opacity-0 transition-opacity hover:bg-white/10 hover:text-white group-hover:opacity-100"
                        aria-label="Go to message"
                        title="Go to message"
                      >
                        <ArrowRight className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div ref={sentinelRef} className="h-1" />
              {loadingMore && (
                <div className="flex justify-center py-3">
                  <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>

      {/* Lightbox for media tab, with go-to-message + prev/next through the loaded grid */}
      <AnimatePresence>
        {lightbox && (
          <motion.div
            key="gallery-lightbox"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4"
            onClick={() => setLightbox(null)}
          >
            <button
              onClick={() => setLightbox(null)}
              className="absolute right-4 top-4 z-10 rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20"
              aria-label="Close preview"
            >
              <X className="h-6 w-6" />
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                goToMessageAndClose(lightbox.sortOrder);
              }}
              className="absolute left-4 top-4 z-10 flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-2 text-sm text-white transition hover:bg-white/20"
            >
              <ArrowRight className="h-4 w-4" /> Go to message
            </button>

            {lightboxIndex > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigateLightbox(-1);
                }}
                className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20 sm:left-4"
                aria-label="Previous"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
            )}
            {lightboxIndex < items.length - 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigateLightbox(1);
                }}
                className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20 sm:right-4"
                aria-label="Next"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            )}

            <div className="max-h-[85vh] max-w-[92vw]" onClick={(e) => e.stopPropagation()}>
              {lightbox.kind === "IMAGE" ? (
                <img src={lightbox.url || undefined} alt={lightbox.originalName} className="max-h-[85vh] max-w-[92vw] rounded-lg object-contain" />
              ) : (
                <video src={lightbox.url || undefined} controls autoPlay className="max-h-[85vh] max-w-[92vw] rounded-lg" />
              )}
              <p className="mt-2 text-center text-xs text-white/50">
                {formatDateLabel(lightbox.dateLabel)} · right-click a thumbnail to jump to it directly
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

