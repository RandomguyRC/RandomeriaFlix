"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Renders a still frame from a video file by seeking to the beginning
 * and painting the first frame onto a canvas. Use this for videos that
 * don't have a thumbnailAsset — avoids broken <img src=video> icons.
 */
export default function VideoFrameThumb({
  src,
  alt,
  className,
}: {
  src: string;
  alt?: string;
  className?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    let cancelled = false;

    function capture() {
      if (cancelled || !video || !canvas) return;
      // Seek to 0.5s for a more representative frame (not the first black frame)
      video.currentTime = 0.5;
    }

    function paint() {
      if (cancelled || !video || !canvas) return;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      setReady(true);
    }

    // Handle both the seeked event and the case where the frame is already decoded
    video.addEventListener("seeked", paint, { once: true });
    video.addEventListener("loadeddata", capture);

    // If the video is already loaded enough, trigger capture directly
    if (video.readyState >= 2) {
      capture();
    }

    return () => {
      cancelled = true;
      video.removeEventListener("seeked", paint);
      video.removeEventListener("loadeddata", capture);
    };
  }, [src]);

  if (ready && canvasRef.current) {
    return (
      <img
        src={canvasRef.current.toDataURL("image/webp", 0.7)}
        alt={alt || ""}
        className={className}
      />
    );
  }

  // Show a dark placeholder while the video loads and we capture the frame
  return (
    <>
      <video
        ref={videoRef}
        src={src}
        preload="metadata"
        muted
        className="hidden"
      />
      <canvas ref={canvasRef} className="hidden" />
      <div className={`flex items-center justify-center bg-gray-800 ${className || ""}`}>
        <svg className="h-6 w-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
    </>
  );
}
