"use client";

import { motion } from "motion/react";
import { X } from "lucide-react";
import { useEffect, useState } from "react";
import type { GraphNode } from "./types";

interface MemoryModalProps {
  node: GraphNode;
  onClose: () => void;
}

export default function MemoryModal({ node, onClose }: MemoryModalProps) {
  const isRoot = node.type === "root";
  const isRandom = node.owner === "random";

  // Track viewport so the planet/bubble never overflows a small phone screen
  const [viewport, setViewport] = useState({ w: 1200, h: 800 });
  useEffect(() => {
    function update() {
      setViewport({ w: window.innerWidth, h: window.innerHeight });
    }
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  // Bigger planets, scales with text — then shrunk to fit the viewport
  const textLength = (node.paragraph || "").length;
  const rawR = isRoot ? 220 : Math.min(120 + textLength * 0.2, 220);
  const rawDiameter = rawR * 2 + 40;
  const maxAvailable = Math.min(viewport.w, viewport.h) * 0.86;
  const fitScale = Math.min(1, maxAvailable / rawDiameter);
  const r = rawR * fitScale;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md"
      onClick={onClose}
    >
      <style>{`.planet-scroll::-webkit-scrollbar { display: none; } .planet-scroll { -ms-overflow-style: none; scrollbar-width: none; }`}</style>

      <motion.div
        initial={{ scale: 0.3, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.3, opacity: 0 }}
        transition={{ type: "spring", damping: 20, stiffness: 200 }}
        onClick={(e) => e.stopPropagation()}
        className="relative flex items-center justify-center"
        style={{ width: r * 2 + 40, height: r * 2 + 40 }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-0 top-0 z-20 rounded-full bg-white/10 p-2 text-white/60 backdrop-blur-sm transition-colors hover:bg-white/20 hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>

        {/* ═══ EARTH ═══ */}
        {isRoot && isRandom && (
          <svg width={r * 2 + 40} height={r * 2 + 40} viewBox={`${-(r + 20)} ${-(r + 20)} ${(r + 20) * 2} ${(r + 20) * 2}`}>
            <defs>
              <radialGradient id="m-ea" cx="50%" cy="50%" r="50%">
                <stop offset="80%" stopColor="rgba(60,140,255,0)" />
                <stop offset="100%" stopColor="rgba(60,140,255,0.15)" />
              </radialGradient>
              <radialGradient id="m-es" cx="35%" cy="30%" r="70%">
                <stop offset="0%" stopColor="#5bb8e8" />
                <stop offset="25%" stopColor="#2d8ac7" />
                <stop offset="50%" stopColor="#1a6b4a" />
                <stop offset="70%" stopColor="#15593d" />
                <stop offset="100%" stopColor="#0c3d28" />
              </radialGradient>
              <radialGradient id="m-el" cx="30%" cy="25%" r="45%">
                <stop offset="0%" stopColor="rgba(255,255,255,0.35)" />
                <stop offset="100%" stopColor="rgba(255,255,255,0)" />
              </radialGradient>
              <radialGradient id="m-ed" cx="72%" cy="70%" r="50%">
                <stop offset="0%" stopColor="rgba(0,0,0,0)" />
                <stop offset="100%" stopColor="rgba(0,0,0,0.45)" />
              </radialGradient>
              <filter id="m-eg"><feGaussianBlur stdDeviation="6" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
            </defs>

            <circle r={r + 14} fill="url(#m-ea)" style={{ animation: "atmosphere-pulse 6s ease-in-out infinite" }} />

            <g style={{ animation: "earth-rotate 20s linear infinite", transformOrigin: "0 0" }}>
              <circle r={r} fill="url(#m-es)" filter="url(#m-eg)" />
              <ellipse cx={-r * 0.15} cy={-r * 0.1} rx={r * 0.22} ry={r * 0.16} fill="rgba(20,80,45,0.45)" transform="rotate(-20)" />
              <ellipse cx={r * 0.25} cy={r * 0.18} rx={r * 0.14} ry={r * 0.11} fill="rgba(20,80,45,0.4)" transform="rotate(30)" />
              <ellipse cx={-r * 0.08} cy={r * 0.32} rx={r * 0.18} ry={r * 0.09} fill="rgba(20,80,45,0.35)" transform="rotate(-10)" />
              <ellipse cx={r * 0.35} cy={-r * 0.2} rx={r * 0.12} ry={r * 0.08} fill="rgba(20,80,45,0.3)" transform="rotate(15)" />
            </g>

            <g style={{ animation: "cloud-rotate 14s linear infinite, cloud-fade 5s ease-in-out infinite", transformOrigin: "0 0" }}>
              <ellipse cx={r * 0.12} cy={-r * 0.28} rx={r * 0.36} ry={r * 0.065} fill="rgba(255,255,255,0.22)" transform="rotate(-12)" />
              <ellipse cx={-r * 0.18} cy={r * 0.12} rx={r * 0.28} ry={r * 0.05} fill="rgba(255,255,255,0.16)" transform="rotate(18)" />
              <ellipse cx={r * 0.04} cy={r * 0.33} rx={r * 0.22} ry={r * 0.04} fill="rgba(255,255,255,0.12)" transform="rotate(-5)" />
            </g>

            <circle r={r} fill="url(#m-el)" />
            <circle r={r} fill="url(#m-ed)" />

            {/* Scrollable text inside planet */}
            <foreignObject x={-r * 0.75} y={-r * 0.55} width={r * 1.5} height={r * 1.1} overflow="hidden">
              <div xmlns="http://www.w3.org/1999/xhtml"
                className="planet-scroll overflow-y-auto text-center text-sm leading-relaxed text-white/90"
                style={{ maxHeight: r * 1.1 + "px", wordBreak: "break-word" }}>
                {node.paragraph || "No description."}
              </div>
            </foreignObject>
          </svg>
        )}

        {/* ═══ MOON ═══ */}
        {isRoot && !isRandom && (
          <svg width={r * 2 + 40} height={r * 2 + 40} viewBox={`${-(r + 20)} ${-(r + 20)} ${(r + 20) * 2} ${(r + 20) * 2}`}>
            <defs>
              <radialGradient id="m-mh" cx="50%" cy="50%" r="50%">
                <stop offset="75%" stopColor="rgba(200,210,230,0)" />
                <stop offset="100%" stopColor="rgba(200,210,230,0.10)" />
              </radialGradient>
              <radialGradient id="m-ms" cx="35%" cy="28%" r="65%">
                <stop offset="0%" stopColor="#f5f0e8" />
                <stop offset="25%" stopColor="#e0d8cc" />
                <stop offset="55%" stopColor="#c8bfb2" />
                <stop offset="80%" stopColor="#a89e92" />
                <stop offset="100%" stopColor="#7a7168" />
              </radialGradient>
              <radialGradient id="m-ml" cx="30%" cy="25%" r="40%">
                <stop offset="0%" stopColor="rgba(255,255,255,0.45)" />
                <stop offset="100%" stopColor="rgba(255,255,255,0)" />
              </radialGradient>
              <radialGradient id="m-md" cx="70%" cy="68%" r="45%">
                <stop offset="0%" stopColor="rgba(0,0,0,0)" />
                <stop offset="100%" stopColor="rgba(0,0,0,0.35)" />
              </radialGradient>
              <filter id="m-msoft"><feGaussianBlur stdDeviation="3" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
            </defs>

            <circle r={r + 10} fill="url(#m-mh)" style={{ animation: "atmosphere-pulse 7s ease-in-out infinite" }} />

            <g style={{ animation: "moon-rotate 40s linear infinite", transformOrigin: "0 0" }}>
              <circle r={r} fill="url(#m-ms)" filter="url(#m-msoft)" />
              <circle cx={-r * 0.22} cy={-r * 0.28} r={r * 0.09} fill="rgba(120,110,100,0.15)" style={{ filter: "blur(1.5px)" }} />
              <circle cx={r * 0.18} cy={r * 0.08} r={r * 0.13} fill="rgba(120,110,100,0.12)" style={{ filter: "blur(1px)" }} />
              <circle cx={-r * 0.32} cy={r * 0.22} r={r * 0.06} fill="rgba(120,110,100,0.10)" style={{ filter: "blur(1px)" }} />
              <circle cx={r * 0.28} cy={-r * 0.32} r={r * 0.05} fill="rgba(120,110,100,0.11)" style={{ filter: "blur(0.8px)" }} />
              <circle cx={r * 0.04} cy={r * 0.36} r={r * 0.07} fill="rgba(120,110,100,0.09)" style={{ filter: "blur(1.2px)" }} />
              <circle cx={-r * 0.18} cy={r * 0.03} r={r * 0.04} fill="rgba(120,110,100,0.08)" style={{ filter: "blur(0.8px)" }} />
            </g>

            <circle r={r} fill="url(#m-ml)" />
            <circle r={r} fill="url(#m-md)" />

            {/* Scrollable text inside planet */}
            <foreignObject x={-r * 0.75} y={-r * 0.55} width={r * 1.5} height={r * 1.1} overflow="hidden">
              <div xmlns="http://www.w3.org/1999/xhtml"
                className="planet-scroll overflow-y-auto text-center text-sm leading-relaxed text-white/90"
                style={{ maxHeight: r * 1.1 + "px", wordBreak: "break-word" }}>
                {node.paragraph || "No description."}
              </div>
            </foreignObject>
          </svg>
        )}

        {/* ═══ MEMORY BUBBLE — Random (red/orange) ═══ */}
        {!isRoot && node.owner === "random" && (
          <svg width={r * 2 + 40} height={r * 2 + 40} viewBox={`${-(r + 20)} ${-(r + 20)} ${(r + 20) * 2} ${(r + 20) * 2}`}>
            <defs>
              <radialGradient id="m-mem-random" cx="35%" cy="30%" r="65%">
                <stop offset="0%" stopColor="rgba(255,130,60,0.95)" />
                <stop offset="40%" stopColor="rgba(220,70,30,0.92)" />
                <stop offset="70%" stopColor="rgba(180,45,20,0.88)" />
                <stop offset="100%" stopColor="rgba(120,25,10,0.85)" />
              </radialGradient>
            </defs>

            <circle r={r} fill="url(#m-mem-random)" stroke="rgba(255,120,60,0.3)" strokeWidth={2} />
            <circle r={r * 0.5} cx={-r * 0.15} cy={-r * 0.15} fill="rgba(255,200,120,0.1)" />
            <circle r={r + 4} fill="rgba(255,80,30,0.06)" />

            {/* Scrollable text inside bubble */}
            <foreignObject x={-r * 0.8} y={-r * 0.6} width={r * 1.6} height={r * 1.2} overflow="hidden">
              <div xmlns="http://www.w3.org/1999/xhtml"
                className="planet-scroll overflow-y-auto text-center text-sm leading-relaxed text-gray-200"
                style={{ maxHeight: r * 1.2 + "px", wordBreak: "break-word" }}>
                {node.paragraph || "No description."}
              </div>
            </foreignObject>
          </svg>
        )}

        {/* ═══ MEMORY BUBBLE — Cherry (black) ═══ */}
        {!isRoot && node.owner === "cherry" && (
          <svg width={r * 2 + 40} height={r * 2 + 40} viewBox={`${-(r + 20)} ${-(r + 20)} ${(r + 20) * 2} ${(r + 20) * 2}`}>
            <defs>
              <radialGradient id="m-mem" cx="40%" cy="35%" r="65%">
                <stop offset="0%" stopColor="rgba(60,60,80,0.95)" />
                <stop offset="100%" stopColor="rgba(20,20,30,0.9)" />
              </radialGradient>
            </defs>

            <circle r={r} fill="url(#m-mem)" stroke="rgba(255,255,255,0.2)" strokeWidth={2} />
            <circle r={r * 0.7} cx={-r * 0.15} cy={-r * 0.15} fill="rgba(255,255,255,0.04)" />

            {/* Scrollable text inside bubble */}
            <foreignObject x={-r * 0.8} y={-r * 0.6} width={r * 1.6} height={r * 1.2} overflow="hidden">
              <div xmlns="http://www.w3.org/1999/xhtml"
                className="planet-scroll overflow-y-auto text-center text-sm leading-relaxed text-gray-200"
                style={{ maxHeight: r * 1.2 + "px", wordBreak: "break-word" }}>
                {node.paragraph || "No description."}
              </div>
            </foreignObject>
          </svg>
        )}
      </motion.div>
    </motion.div>
  );
}
