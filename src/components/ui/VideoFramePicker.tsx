"use client";

import { useState, useRef, useCallback } from "react";
import { motion } from "motion/react";
import { X, Check, Loader2 } from "lucide-react";

interface VideoFramePickerProps {
  videoSrc: string;
  onSave: (blob: Blob) => void;
  onCancel: () => void;
}

export default function VideoFramePicker({ videoSrc, onSave, onCancel }: VideoFramePickerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [frames, setFrames] = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);

  function handleLoadedMetadata() {
    const video = videoRef.current;
    if (!video) return;
    const dur = video.duration;
    setDuration(dur);

    // Generate 8 evenly spaced frame previews
    const count = 8;
    const interval = dur / (count + 1);
    const previews: string[] = [];
    let loaded = 0;

    for (let i = 1; i <= count; i++) {
      const time = interval * i;
      const tempVideo = document.createElement("video");
      tempVideo.src = videoSrc;
      tempVideo.muted = true;
      tempVideo.preload = "auto";

      tempVideo.addEventListener("loadeddata", () => {
        tempVideo.currentTime = time;
      });

      tempVideo.addEventListener("seeked", () => {
        const canvas = document.createElement("canvas");
        canvas.width = 320;
        canvas.height = 180;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(tempVideo, 0, 0, 320, 180);
        previews[i - 1] = canvas.toDataURL("image/jpeg", 0.8);
        loaded++;
        if (loaded === count) {
          setFrames([...previews]);
        }
      });
    }
  }

  function handleTimeChange(e: React.ChangeEvent<HTMLInputElement>) {
    const time = Number(e.target.value);
    setCurrentTime(time);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
  }

  function handleSeeked() {
    // Redraw current frame on the preview canvas
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    const ctx = canvas.getContext("2d")!;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);
  }

  const captureFrame = useCallback(async (time: number) => {
    setSaving(true);
    const video = document.createElement("video");
    video.src = videoSrc;
    video.muted = true;
    video.preload = "auto";

    return new Promise<Blob>((resolve) => {
      video.addEventListener("loadeddata", () => {
        video.currentTime = time;
      });
      video.addEventListener("seeked", () => {
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(video, 0, 0);
        canvas.toBlob((blob) => {
          resolve(blob!);
        }, "image/jpeg", 0.92);
      });
    });
  }, [videoSrc]);

  async function handleSaveFrame(time: number) {
    const blob = await captureFrame(time);
    setSaving(false);
    onSave(blob);
  }

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
        className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl bg-gray-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Hidden video + canvas */}
        <video ref={videoRef} src={videoSrc} className="hidden" onLoadedMetadata={handleLoadedMetadata} onSeeked={handleSeeked} muted />
        <canvas ref={canvasRef} className="hidden" />

        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-800 px-6 py-3">
          <div>
            <h3 className="text-lg font-semibold text-white">Choose Thumbnail Frame</h3>
            <p className="text-xs text-gray-400">Pick a frame or scrub through the video</p>
          </div>
          <button onClick={onCancel} className="rounded-lg p-2 text-gray-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Video preview */}
        <div className="px-6 pt-4">
          <div className="relative mx-auto max-h-[40vh] overflow-hidden rounded-lg bg-black">
            <video
              ref={videoRef}
              src={videoSrc}
              className="mx-auto max-h-[40vh]"
              muted
              onLoadedMetadata={handleLoadedMetadata}
              onSeeked={handleSeeked}
              playsInline
            />
          </div>
        </div>

        {/* Timeline scrubber */}
        <div className="px-6 pt-4">
          <input
            type="range"
            min={0}
            max={duration || 100}
            step={0.1}
            value={currentTime}
            onChange={handleTimeChange}
            className="w-full cursor-pointer accent-red-500"
          />
          <div className="mt-1 flex justify-between text-[11px] text-gray-500">
            <span>{formatTime(currentTime * 1000)}</span>
            <span>{formatTime(duration * 1000)}</span>
          </div>
        </div>

        {/* Use current frame button */}
        <div className="px-6 pt-3">
          <button
            onClick={() => handleSaveFrame(currentTime)}
            disabled={saving}
            className="w-full rounded-lg bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
          >
            {saving ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "Use This Frame"}
          </button>
        </div>

        {/* Frame grid */}
        {frames.length > 0 && (
          <div className="px-6 py-4">
            <p className="mb-2 text-xs text-gray-500">Or pick from these frames:</p>
            <div className="grid grid-cols-4 gap-2">
              {frames.map((frame, i) => {
                const frameTime = (duration / 9) * (i + 1);
                return (
                  <button
                    key={i}
                    onClick={() => handleSaveFrame(frameTime)}
                    disabled={saving}
                    className="group relative overflow-hidden rounded-lg border-2 border-transparent transition-all hover:border-red-500"
                  >
                    <img src={frame} alt={`Frame ${i + 1}`} className="h-full w-full object-cover" />
                    <span className="absolute bottom-0 left-0 right-0 bg-black/60 py-0.5 text-center text-[10px] text-white">
                      {formatTime(frameTime * 1000)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {generating && (
          <div className="px-6 pb-4">
            <p className="text-center text-xs text-gray-500">Generating frame previews...</p>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

function formatTime(ms: number) {
  const totalSec = ms / 1000;
  const m = Math.floor(totalSec / 60);
  const s = Math.floor(totalSec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}
