"use client";

import { useRef, useEffect, useState, useCallback } from "react";

interface WaveformProgressProps {
  src: string;
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
  color?: string;
  height?: number;
}

export default function WaveformProgress({
  src,
  currentTime,
  duration,
  onSeek,
  color = "#ef4444",
  height = 48,
}: WaveformProgressProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [waveform, setWaveform] = useState<number[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  // Generate waveform from audio
  useEffect(() => {
    async function generate() {
      try {
        const ctx = new AudioContext();
        const res = await fetch(src);
        const buffer = await res.arrayBuffer();
        const audioBuffer = await ctx.decodeAudioData(buffer);
        const rawData = audioBuffer.getChannelData(0);
        const samples = 150;
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
        setWaveform(Array.from({ length: 150 }, () => Math.random() * 0.6 + 0.4));
      }
    }
    generate();
  }, [src]);

  // Draw waveform
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || waveform.length === 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;
    ctx.clearRect(0, 0, w, h);

    const progressPct = duration > 0 ? currentTime / duration : 0;
    const barWidth = w / waveform.length;
    const gap = 2;

    waveform.forEach((peak, i) => {
      const x = i * barWidth;
      const barH = Math.max(2, peak * h * 0.9);
      const y = (h - barH) / 2;
      const pct = i / waveform.length;

      // Played portion = colored, unplayed = dim
      if (pct <= progressPct) {
        ctx.fillStyle = color;
      } else {
        ctx.fillStyle = "rgba(255,255,255,0.15)";
      }

      // Rounded bars
      const bw = Math.max(1, barWidth - gap);
      const radius = Math.min(bw / 2, 2);
      ctx.beginPath();
      ctx.roundRect(x, y, bw, barH, radius);
      ctx.fill();
    });
  }, [waveform, currentTime, duration, color]);

  function getTimeFromX(clientX: number) {
    if (!containerRef.current || !duration) return 0;
    const rect = containerRef.current.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return pct * duration;
  }

  function handleMouseDown(e: React.MouseEvent) {
    setIsDragging(true);
    onSeek(getTimeFromX(e.clientX));
  }

  const handleMouseMove = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (!isDragging) return;
      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      onSeek(getTimeFromX(clientX));
    },
    [isDragging, duration, onSeek]
  );

  const handleMouseUp = useCallback(() => setIsDragging(false), []);

  const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      ref={containerRef}
      className="group relative cursor-pointer"
      style={{ height }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={(e) => { setIsDragging(true); onSeek(getTimeFromX(e.touches[0].clientX)); }}
      onTouchMove={handleMouseMove}
      onTouchEnd={handleMouseUp}
    >
      <canvas
        ref={canvasRef}
        className="h-full w-full"
        style={{ height: "100%", width: "100%" }}
      />

      {/* Playhead line */}
      <div
        className="absolute top-0 h-full w-0.5 bg-white shadow-[0_0_6px_rgba(255,255,255,0.5)] transition-[left] group-hover:w-1"
        style={{ left: `${progressPct}%` }}
      />

      {/* Time tooltip on hover */}
      <div
        className="absolute -top-8 -translate-x-1/2 rounded bg-gray-800 px-2 py-1 text-[10px] text-white opacity-0 transition-opacity group-hover:opacity-100"
        style={{ left: `${progressPct}%` }}
      >
        {formatTime(currentTime)}
      </div>
    </div>
  );
}

function formatTime(s: number) {
  if (!isFinite(s)) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}
