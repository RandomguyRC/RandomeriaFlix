"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion } from "motion/react";
import { Play, Pause, X, Check } from "lucide-react";

interface AudioTrimmerProps {
  audioSrc: string;
  currentStartMs: number;
  currentDurationMs: number;
  onSave: (startMs: number, durationMs: number) => void;
  onCancel: () => void;
}

export default function AudioTrimmer({
  audioSrc,
  currentStartMs,
  currentDurationMs,
  onSave,
  onCancel,
}: AudioTrimmerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animFrameRef = useRef<number>(0);

  const [duration, setDuration] = useState(0);
  const [waveform, setWaveform] = useState<number[]>([]);
  const [startPct, setStartPct] = useState(0);
  const [endPct, setEndPct] = useState(100);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playheadPct, setPlayheadPct] = useState(0);
  const [currentTimeMs, setCurrentTimeMs] = useState(0);
  const [dragging, setDragging] = useState<"start" | "end" | "range" | null>(null);
  const [dragOffset, setDragOffset] = useState(0);

  // Load audio and generate waveform
  useEffect(() => {
    const audio = new Audio(audioSrc);
    audio.addEventListener("loadedmetadata", () => {
      const dur = audio.duration * 1000;
      setDuration(dur);
      setStartPct(currentStartMs > 0 ? (currentStartMs / dur) * 100 : 0);
      setEndPct(currentDurationMs < dur ? ((currentStartMs + currentDurationMs) / dur) * 100 : 100);
      generateWaveform(audioSrc);
    });
  }, [audioSrc, currentStartMs, currentDurationMs]);

  async function generateWaveform(src: string) {
    try {
      const ctx = new AudioContext();
      const res = await fetch(src);
      const buffer = await res.arrayBuffer();
      const audioBuffer = await ctx.decodeAudioData(buffer);
      const rawData = audioBuffer.getChannelData(0);
      const samples = 200;
      const blockSize = Math.floor(rawData.length / samples);
      const peaks: number[] = [];
      for (let i = 0; i < samples; i++) {
        let sum = 0;
        for (let j = 0; j < blockSize; j++) {
          sum += Math.abs(rawData[i * blockSize + j]);
        }
        peaks.push(sum / blockSize);
      }
      const max = Math.max(...peaks);
      setWaveform(peaks.map((p) => p / max));
      ctx.close();
    } catch {
      setWaveform(Array.from({ length: 200 }, () => Math.random() * 0.7 + 0.3));
    }
  }

  // Draw waveform + playhead
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || waveform.length === 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    const barWidth = w / waveform.length;

    waveform.forEach((peak, i) => {
      const x = i * barWidth;
      const barH = peak * h * 0.8;
      const y = (h - barH) / 2;
      const pct = (i / waveform.length) * 100;

      if (pct >= startPct && pct <= endPct) {
        ctx.fillStyle = "#ef4444";
      } else {
        ctx.fillStyle = "#4b5563";
      }
      ctx.fillRect(x, y, barWidth - 1, barH);
    });

    // Draw playhead
    if (isPlaying) {
      const phX = (playheadPct / 100) * w;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(phX - 1, 0, 3, h);
    }
  }, [waveform, startPct, endPct, playheadPct, isPlaying]);

  // Update playhead animation
  useEffect(() => {
    if (!isPlaying) {
      cancelAnimationFrame(animFrameRef.current);
      return;
    }

    const audio = audioRef.current;
    if (!audio) return;

    function tick() {
      if (!audio || audio.paused) return;
      const startSec = (startPct / 100) * (duration / 1000);
      const endSec = (endPct / 100) * (duration / 1000);

      // Loop back if past end
      if (audio.currentTime >= endSec) {
        audio.currentTime = startSec;
      }

      const pct = (audio.currentTime / (duration / 1000)) * 100;
      setPlayheadPct(pct);
      setCurrentTimeMs(audio.currentTime * 1000);
      animFrameRef.current = requestAnimationFrame(tick);
    }

    animFrameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [isPlaying, startPct, endPct, duration]);

  function togglePreview() {
    const audio = audioRef.current;
    if (!audio || !duration) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      const startSec = (startPct / 100) * (duration / 1000);
      audio.currentTime = startSec;
      audio.play().catch(() => {});
      setIsPlaying(true);
    }
  }

  function stopPreview() {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
    setIsPlaying(false);
    setPlayheadPct(0);
    setCurrentTimeMs(0);
    cancelAnimationFrame(animFrameRef.current);
  }

  const startMs = Math.round((startPct / 100) * duration);
  const endMs = Math.round((endPct / 100) * duration);
  const selectedDurationMs = endMs - startMs;

  function formatTime(ms: number) {
    const totalSec = ms / 1000;
    const m = Math.floor(totalSec / 60);
    const sec = Math.floor(totalSec % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-2xl overflow-hidden rounded-2xl bg-gray-900 shadow-2xl"
      >
        <audio ref={audioRef} src={audioSrc} preload="auto" />

        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-800 px-6 py-4">
          <div>
            <h3 className="text-lg font-semibold text-white">Trim Audio</h3>
            <p className="text-sm text-gray-400">
              Drag handles to select the part that plays on hover
            </p>
          </div>
          <button onClick={() => { stopPreview(); onCancel(); }} className="rounded-lg p-2 text-gray-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Waveform */}
        <div className="px-6 py-4">
          <div
            ref={containerRef}
            className="relative h-24 w-full cursor-crosshair rounded-lg bg-gray-950"
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleMouseUp}
          >
            <canvas
              ref={canvasRef}
              width={800}
              height={96}
              className="h-full w-full"
            />

            {/* Start handle */}
            <div
              className="absolute top-0 z-10 h-full w-3 cursor-ew-resize"
              style={{ left: `calc(${startPct}% - 6px)` }}
              onMouseDown={(e) => handleMouseDown("start", e)}
              onTouchStart={() => setDragging("start")}
            >
              <div className="h-full w-1 rounded-full bg-white shadow-lg" />
              <div className="absolute -top-1 left-1/2 h-3 w-3 -translate-x-1/2 rounded-full bg-white" />
              <div className="absolute -bottom-1 left-1/2 h-3 w-3 -translate-x-1/2 rounded-full bg-white" />
            </div>

            {/* End handle */}
            <div
              className="absolute top-0 z-10 h-full w-3 cursor-ew-resize"
              style={{ left: `calc(${endPct}% - 6px)` }}
              onMouseDown={(e) => handleMouseDown("end", e)}
              onTouchStart={() => setDragging("end")}
            >
              <div className="h-full w-1 rounded-full bg-white shadow-lg" />
              <div className="absolute -top-1 left-1/2 h-3 w-3 -translate-x-1/2 rounded-full bg-white" />
              <div className="absolute -bottom-1 left-1/2 h-3 w-3 -translate-x-1/2 rounded-full bg-white" />
            </div>

            {/* Draggable range */}
            <div
              className="absolute top-0 z-5 h-full cursor-grab active:cursor-grabbing"
              style={{ left: `${startPct}%`, width: `${endPct - startPct}%` }}
              onMouseDown={(e) => handleMouseDown("range", e)}
              onTouchStart={() => setDragging("range")}
            />
          </div>

          {/* Time display */}
          <div className="mt-3 flex items-center justify-between text-xs text-gray-400">
            <span>{formatTime(startMs)}</span>
            <span className="font-medium text-red-400">
              {isPlaying
                ? `${formatTime(currentTimeMs)} / ${formatTime(selectedDurationMs)}`
                : `${formatTime(selectedDurationMs)} selected`}
            </span>
            <span>{formatTime(endMs)}</span>
          </div>
        </div>

        {/* Preview + Actions */}
        <div className="flex gap-3 border-t border-gray-800 px-6 py-4">
          <button
            onClick={togglePreview}
            className={`flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
              isPlaying
                ? "bg-red-600/20 text-red-400 hover:bg-red-600/30"
                : "bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white"
            }`}
          >
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            {isPlaying ? "Pause" : "Preview"}
          </button>
          <button
            onClick={() => { stopPreview(); onCancel(); }}
            className="flex-1 rounded-lg bg-gray-800 py-3 text-sm font-medium text-gray-300 transition-colors hover:bg-gray-700"
          >
            Cancel
          </button>
          <button
            onClick={() => { stopPreview(); onSave(startMs, selectedDurationMs); }}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-red-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-red-700"
          >
            <Check className="h-4 w-4" /> Save Trim
          </button>
        </div>
      </motion.div>
    </motion.div>
  );

  // Drag handlers
  function handleMouseDown(type: "start" | "end" | "range", e: React.MouseEvent) {
    e.preventDefault();
    setDragging(type);
    if (type === "range") setDragOffset(e.clientX);
  }

  function handleMouseMove(e: React.MouseEvent) {
    if (!containerRef.current || !dragging) return;
    const rect = containerRef.current.getBoundingClientRect();
    const pct = ((e.clientX - rect.left) / rect.width) * 100;
    const clamped = Math.max(0, Math.min(100, pct));

    if (dragging === "start") {
      setStartPct(Math.min(clamped, endPct - 1));
    } else if (dragging === "end") {
      setEndPct(Math.max(clamped, startPct + 1));
    } else if (dragging === "range") {
      const delta = e.clientX - dragOffset;
      const deltaPct = (delta / rect.width) * 100;
      const rangeWidth = endPct - startPct;
      let newStart = startPct + deltaPct;
      if (newStart < 0) newStart = 0;
      if (newStart + rangeWidth > 100) newStart = 100 - rangeWidth;
      setStartPct(newStart);
      setEndPct(newStart + rangeWidth);
      setDragOffset(e.clientX);
    }
  }

  function handleMouseUp() { setDragging(null); }

  function handleTouchMove(e: React.TouchEvent) {
    if (!containerRef.current || !dragging) return;
    const touch = e.touches[0];
    const rect = containerRef.current.getBoundingClientRect();
    const pct = ((touch.clientX - rect.left) / rect.width) * 100;
    const clamped = Math.max(0, Math.min(100, pct));

    if (dragging === "start") {
      setStartPct(Math.min(clamped, endPct - 1));
    } else if (dragging === "end") {
      setEndPct(Math.max(clamped, startPct + 1));
    } else if (dragging === "range") {
      const delta = touch.clientX - dragOffset;
      const deltaPct = (delta / rect.width) * 100;
      const rangeWidth = endPct - startPct;
      let newStart = startPct + deltaPct;
      if (newStart < 0) newStart = 0;
      if (newStart + rangeWidth > 100) newStart = 100 - rangeWidth;
      setStartPct(newStart);
      setEndPct(newStart + rangeWidth);
      setDragOffset(touch.clientX);
    }
  }
}
