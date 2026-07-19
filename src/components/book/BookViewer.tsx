"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { renderPDF, clearCache, type RenderedPage } from "./PDFRenderer";

interface BookViewerProps {
  pdfUrl: string;
}

export default function BookViewer({ pdfUrl }: BookViewerProps) {
  const [pages, setPages] = useState<RenderedPage[]>([]);
  const [currentPage, setCurrentPage] = useState(0); // 0-indexed left page
  const [isFlipping, setIsFlipping] = useState(false);
  const [flipDir, setFlipDir] = useState<"next" | "prev">("next");
  const [loading, setLoading] = useState(true);
  const [containerWidth, setContainerWidth] = useState(800);

  const isMobile = containerWidth < 768;
  const pagesPerView = isMobile ? 1 : 2;

  // Responsive width
  useEffect(() => {
    function update() {
      setContainerWidth(window.innerWidth);
    }
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  // Render PDF on mount
  useEffect(() => {
    let cancelled = false;
    async function load() {
      clearCache(); // Clear old book pages when loading a new book
      const maxPageWidth = isMobile
        ? Math.min(containerWidth - 32, 500)
        : Math.min((containerWidth - 100) / 2, 450);

      const { pages: rendered } = await renderPDF(pdfUrl, maxPageWidth);
      if (!cancelled) {
        setPages(rendered);
        setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [pdfUrl, containerWidth, isMobile]);

  const totalPages = pages.length;
  const leftPage = pages[currentPage] || null;
  const rightPage = pages[currentPage + 1] || null;

  // Container uses max display width, height based on A4 ratio
  const displayWidth = isMobile
    ? Math.min(containerWidth - 32, 500)
    : Math.min((containerWidth - 100) / 2, 450);
  const pageWidth = leftPage ? displayWidth : 400;
  const pageHeight = leftPage ? displayWidth * 1.414 : 566;

  const canGoNext = currentPage + pagesPerView < totalPages;
  const canGoPrev = currentPage > 0;

  const goNext = useCallback(() => {
    if (!canGoNext || isFlipping) return;
    setFlipDir("next");
    setIsFlipping(true);
    setTimeout(() => {
      setCurrentPage((p) => Math.min(p + pagesPerView, totalPages - 1));
      setTimeout(() => setIsFlipping(false), 350);
    }, 200);
  }, [canGoNext, isFlipping, pagesPerView, totalPages]);

  const goPrev = useCallback(() => {
    if (!canGoPrev || isFlipping) return;
    setFlipDir("prev");
    setIsFlipping(true);
    setTimeout(() => {
      setCurrentPage((p) => Math.max(p - pagesPerView, 0));
      setTimeout(() => setIsFlipping(false), 350);
    }, 200);
  }, [canGoPrev, isFlipping, pagesPerView]);

  // Keyboard navigation
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight" || e.key === " ") { e.preventDefault(); goNext(); }
      if (e.key === "ArrowLeft") { e.preventDefault(); goPrev(); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goNext, goPrev]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-red-500" />
        <span className="ml-3 text-gray-400">Loading book...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Book spread */}
      <div
        className="relative flex items-center justify-center"
        style={{ perspective: 2000, minHeight: pageHeight + 20 }}
      >
        {/* Left page */}
        {leftPage && (
          <div
            className={`relative overflow-hidden rounded-r-lg bg-white shadow-[4px_4px_20px_rgba(0,0,0,0.4)] transition-transform duration-350 ease-in-out ${
              isFlipping && flipDir === "prev" ? "origin-right rotate-y-[12deg] scale-[0.97]" : ""
            }`}
            style={{ width: pageWidth, height: pageHeight, transformStyle: "preserve-3d" }}
          >
            <img src={leftPage.dataUrl} alt={`Page ${leftPage.pageNumber}`} className="h-full w-full object-contain" draggable={false} />
            <span className="absolute bottom-2 left-0 right-0 text-center text-[10px] text-gray-400">{leftPage.pageNumber}</span>
          </div>
        )}

        {/* Right page */}
        {rightPage && !isMobile && (
          <div
            className={`relative overflow-hidden rounded-l-lg bg-white shadow-[-4px_4px_20px_rgba(0,0,0,0.4)] transition-transform duration-350 ease-in-out ${
              isFlipping && flipDir === "next" ? "origin-left rotate-y-[-12deg] scale-[0.97]" : ""
            }`}
            style={{ width: pageWidth, height: pageHeight, transformStyle: "preserve-3d" }}
          >
            <img src={rightPage.dataUrl} alt={`Page ${rightPage.pageNumber}`} className="h-full w-full object-contain" draggable={false} />
            <span className="absolute bottom-2 left-0 right-0 text-center text-[10px] text-gray-400">{rightPage.pageNumber}</span>
          </div>
        )}

        {/* Center spine shadow */}
        {!isMobile && leftPage && rightPage && (
          <div
            className="absolute left-1/2 top-0 h-full w-3 -translate-x-1/2 pointer-events-none"
            style={{ background: "linear-gradient(to right, rgba(0,0,0,0.12), transparent 40%, transparent 60%, rgba(0,0,0,0.12))" }}
          />
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4">
        <button onClick={goPrev} disabled={!canGoPrev}
          className="rounded-lg bg-gray-800 px-4 py-2 text-sm font-medium text-gray-300 transition-colors hover:bg-gray-700 hover:text-white disabled:opacity-30">
          <ChevronLeft className="inline h-4 w-4" /> Previous
        </button>

        <span className="min-w-[120px] text-center text-sm text-gray-400">
          {leftPage ? leftPage.pageNumber : 0}
          {rightPage ? `–${rightPage.pageNumber}` : ""} / {totalPages}
        </span>

        <button onClick={goNext} disabled={!canGoNext}
          className="rounded-lg bg-gray-800 px-4 py-2 text-sm font-medium text-gray-300 transition-colors hover:bg-gray-700 hover:text-white disabled:opacity-30">
          Next <ChevronRight className="inline h-4 w-4" />
        </button>
      </div>

      {/* Page dots */}
      {totalPages > 0 && (
        <div className="flex flex-wrap justify-center gap-1.5 max-w-lg">
          {Array.from({ length: Math.ceil(totalPages / pagesPerView) }, (_, i) => {
            const page = i * pagesPerView;
            const isActive = currentPage === page;
            return (
              <button key={i} onClick={() => { if (!isFlipping) { setFlipDir(page > currentPage ? "next" : "prev"); setIsFlipping(true); setTimeout(() => { setCurrentPage(page); setTimeout(() => setIsFlipping(false), 350); }, 200); } }}
                className={`h-2 rounded-full transition-all duration-200 ${isActive ? "w-6 bg-red-500" : "w-2 bg-gray-600 hover:bg-gray-500"}`}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
