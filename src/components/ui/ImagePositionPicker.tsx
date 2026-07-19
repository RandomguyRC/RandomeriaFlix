"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { motion } from "motion/react";
import { X, Check, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";

interface ImagePositionPickerProps {
  imageSrc: string;
  mediaType?: "image" | "video";
  targetAspect: number;
  dynamicAspect?: "modal" | null;
  targetLabel: string;
  currentX?: number;
  currentY?: number;
  currentZoom?: number;
  mode?: "auto" | "portrait" | "landscape";
  onModeChange?: (mode: "auto" | "portrait" | "landscape") => void;
  onSave: (x: number, y: number, zoom: number) => void;
  onCancel: () => void;
  // Hide the zoom slider entirely. Use this when the consumer's final
  // render doesn't support zoom (e.g. plain object-cover + objectPosition)
  // — showing a working-looking zoom control that gets silently discarded
  // on save is worse than not offering it at all.
  hideZoom?: boolean;
}

function computeModalAspect() {
  if (typeof window === "undefined") return 16 / 9;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const modalWidth = Math.min(vw - 32, 1024);
  const imageHeight = vh * 0.55;
  return modalWidth / imageHeight;
}

export default function ImagePositionPicker({
  imageSrc,
  mediaType = "image",
  targetAspect: fallbackAspect,
  dynamicAspect,
  targetLabel,
  currentX = 50,
  currentY = 50,
  currentZoom = 1,
  mode = "auto",
  onModeChange,
  onSave,
  onCancel,
  hideZoom = false,
}: ImagePositionPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: currentX, y: currentY });
  const [isDragging, setIsDragging] = useState(false);
  const [aspect, setAspect] = useState(fallbackAspect);
  const [zoom, setZoom] = useState(currentZoom);
  const [imageNatural, setImageNatural] = useState({ w: 0, h: 0 });

  useEffect(() => {
    if (dynamicAspect === "modal") {
      setAspect(computeModalAspect());
    }
  }, [dynamicAspect]);

  const isPortrait = (() => {
    if (mode === "portrait") return true;
    if (mode === "landscape") return false;
    return imageNatural.h > imageNatural.w;
  })();

  const updatePosition = useCallback((clientX: number, clientY: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * 100;
    const y = ((clientY - rect.top) / rect.height) * 100;
    setPosition({
      x: Math.max(0, Math.min(100, x)),
      y: Math.max(0, Math.min(100, y)),
    });
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsDragging(true);
    updatePosition(e.clientX, e.clientY);
  }, [updatePosition]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;
    updatePosition(e.clientX, e.clientY);
  }, [isDragging, updatePosition]);

  const handleMouseUp = useCallback(() => setIsDragging(false), []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    setIsDragging(true);
    updatePosition(e.touches[0].clientX, e.touches[0].clientY);
  }, [updatePosition]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging) return;
    updatePosition(e.touches[0].clientX, e.touches[0].clientY);
  }, [isDragging, updatePosition]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4"
      onClick={onCancel}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl bg-gray-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-800 bg-gray-900 px-6 py-3">
          <div>
            <h3 className="text-lg font-semibold text-white">{targetLabel}</h3>
            <p className="text-xs text-gray-400">
              {isPortrait ? `Drag to move ${mediaType} • Zoom to resize` : "Drag to set focal point"}
            </p>
          </div>
          <button onClick={onCancel} className="rounded-lg p-2 text-gray-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Mode selector */}
        {onModeChange && (
          <div className="px-6 pt-3">
            <div className="flex gap-2">
              {(["auto", "portrait", "landscape"] as const).map((m) => (
                <button key={m} type="button" onClick={() => onModeChange(m)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                    mode === m ? "bg-red-600 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                  }`}>
                  {m === "auto" ? "🔍 Auto" : m === "portrait" ? "📱 Portrait" : "🖥️ Landscape"}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Zoom controls */}
        {!hideZoom && (
        <div className="flex items-center justify-center gap-3 px-6 pt-3">
          <button onClick={() => setZoom((z) => Math.max(0.5, +(z - 0.1).toFixed(1)))}
            className="rounded-lg bg-gray-800 p-1.5 text-gray-400 hover:bg-gray-700 hover:text-white">
            <ZoomOut className="h-4 w-4" />
          </button>
          <input type="range" min={0.5} max={3} step={0.05} value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="h-1 w-28 cursor-pointer accent-red-500" />
          <button onClick={() => setZoom((z) => Math.min(3, +(z + 0.1).toFixed(1)))}
            className="rounded-lg bg-gray-800 p-1.5 text-gray-400 hover:bg-gray-700 hover:text-white">
            <ZoomIn className="h-4 w-4" />
          </button>
          <button onClick={() => setZoom(1)}
            className="rounded-lg bg-gray-800 p-1.5 text-gray-400 hover:bg-gray-700 hover:text-white">
            <RotateCcw className="h-4 w-4" />
          </button>
          <span className="text-[11px] text-gray-500">{Math.round(zoom * 100)}%</span>
        </div>
        )}

        {/* Preview — always landscape container */}
        <div className="px-6 py-4">
          <div
            ref={containerRef}
            className="relative mx-auto overflow-hidden rounded-lg bg-black"
            style={{ aspectRatio: `${aspect}` }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleMouseUp}
          >
            {/* Portrait: show full image with black bars, zoom shrinks bars */}
            {isPortrait ? (
              <div className="absolute inset-0 flex items-center justify-center bg-black">
                {mediaType === "video" ? (
                  <video
                    src={imageSrc}
                    muted
                    playsInline
                    preload="metadata"
                    onLoadedMetadata={(e) => {
                      const v = e.currentTarget;
                      setImageNatural({ w: v.videoWidth, h: v.videoHeight });
                    }}
                    className="h-full object-contain transition-transform"
                    style={{
                      transform: `scale(${zoom})`,
                      transformOrigin: `${position.x}% ${position.y}%`,
                    }}
                  />
                ) : (
                  <img
                    src={imageSrc}
                    alt="Preview"
                    onLoad={(e) => {
                      const img = e.currentTarget;
                      setImageNatural({ w: img.naturalWidth, h: img.naturalHeight });
                    }}
                    className="h-full object-contain transition-transform"
                    style={{
                      transform: `scale(${zoom})`,
                      transformOrigin: `${position.x}% ${position.y}%`,
                    }}
                    draggable={false}
                  />
                )}
              </div>
            ) : mediaType === "video" ? (
              /* Landscape: crop to fill, position controls which part shows */
              <video
                src={imageSrc}
                muted
                playsInline
                preload="metadata"
                onLoadedMetadata={(e) => {
                  const v = e.currentTarget;
                  setImageNatural({ w: v.videoWidth, h: v.videoHeight });
                }}
                className="h-full w-full object-cover"
                style={{
                  objectPosition: `${position.x}% ${position.y}%`,
                  transform: `scale(${zoom})`,
                  transformOrigin: `${position.x}% ${position.y}%`,
                }}
              />
            ) : (
              /* Landscape: crop to fill, position controls which part shows */
              <img
                src={imageSrc}
                alt="Preview"
                onLoad={(e) => {
                  const img = e.currentTarget;
                  setImageNatural({ w: img.naturalWidth, h: img.naturalHeight });
                }}
                className="h-full w-full object-cover"
                style={{
                  objectPosition: `${position.x}% ${position.y}%`,
                  transform: `scale(${zoom})`,
                  transformOrigin: `${position.x}% ${position.y}%`,
                }}
                draggable={false}
              />
            )}

            {/* Crosshair — only for landscape */}
            {!isPortrait && (
              <div
                className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 transition-all"
                style={{ left: `${position.x}%`, top: `${position.y}%` }}
              >
                <div className="h-6 w-6 rounded-full border-2 border-white/80 shadow-lg" />
                <div className="absolute left-1/2 top-1/2 h-1 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white" />
              </div>
            )}
          </div>
        </div>

        {/* Info */}
        <p className="text-center text-xs text-gray-500">
          {isPortrait
            ? `Drag to reposition • ${Math.round(zoom * 100)}% zoom`
            : `${Math.round(position.x)}% horizontal, ${Math.round(position.y)}% vertical • ${Math.round(zoom * 100)}% zoom`}
        </p>

        {/* Actions */}
        <div className="sticky bottom-0 flex gap-3 border-t border-gray-800 bg-gray-900 px-6 py-4">
          <button onClick={onCancel}
            className="flex-1 rounded-lg bg-gray-800 py-3 text-sm font-medium text-gray-300 hover:bg-gray-700">
            Cancel
          </button>
          <button onClick={() => onSave(position.x, position.y, zoom)}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-red-600 py-3 text-sm font-semibold text-white hover:bg-red-700">
            <Check className="h-4 w-4" /> Save
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
