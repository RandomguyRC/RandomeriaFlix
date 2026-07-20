"use client";

import { useState, useRef, useEffect } from "react";
import { Loader2, ExternalLink, AlertTriangle } from "lucide-react";

const SPACE_SELFIE_URL = "https://space.crunchlabs.com/selfie/ppIDhla";
// If the iframe hasn't successfully loaded within this window, we assume
// the site is blocking embedding (X-Frame-Options / CSP frame-ancestors)
// and show a fallback instead of a blank frame.
const LOAD_TIMEOUT_MS = 6000;

export default function SpaceSelfiePage() {
  const [status, setStatus] = useState<"loading" | "loaded" | "blocked">("loading");
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    timeoutRef.current = setTimeout(() => {
      setStatus((s) => (s === "loading" ? "blocked" : s));
    }, LOAD_TIMEOUT_MS);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const handleLoad = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setStatus("loaded");
  };

  return (
    <div className="relative h-[calc(100vh-56px)] w-full">
      {status !== "loaded" && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#0a0a0a]">
          {status === "loading" ? (
            <div className="flex flex-col items-center gap-3 text-gray-400">
              <Loader2 className="h-8 w-8 animate-spin text-red-500" />
              <p className="text-sm">Loading Space Selfie...</p>
            </div>
          ) : (
            <div className="flex max-w-sm flex-col items-center gap-4 px-6 text-center">
              <AlertTriangle className="h-8 w-8 text-yellow-500" />
              <p className="text-lg font-medium text-white">
                This page can&apos;t be embedded here
              </p>
              <p className="text-sm text-gray-400">
                CrunchLabs doesn&apos;t allow their Space Selfie page to load inside
                another site. You can still open it directly below.
              </p>
              <a
                href={SPACE_SELFIE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 flex items-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-500"
              >
                Open Space Selfie <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          )}
        </div>
      )}

      <iframe
        src={SPACE_SELFIE_URL}
        onLoad={handleLoad}
        title="Space Selfie"
        className="h-full w-full border-0"
        allow="camera; microphone; fullscreen"
      />
    </div>
  );
}
