"use client";

import { memo, useCallback, useRef } from "react";
import type { GraphNode } from "./types";

interface BubbleNodeProps {
  node: GraphNode;
  onDragStart: (id: string) => void;
  onDragMove: (id: string, x: number, y: number) => void;
  onDragEnd: (id: string) => void;
  onClick: (node: GraphNode) => void;
}

function BubbleNodeComponent({
  node,
  onDragStart,
  onDragMove,
  onDragEnd,
  onClick,
}: BubbleNodeProps) {
  const isDragging = useRef(false);
  const didMove = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });

  const isRoot = node.type === "root";
  const isRandom = node.owner === "random";
  const r = isRoot ? 60 : node.radius;

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.stopPropagation();
      e.preventDefault();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      isDragging.current = true;
      didMove.current = false;
      lastPos.current = { x: e.clientX, y: e.clientY };
      onDragStart(node.id);
    },
    [node.id, onDragStart]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging.current) return;
      const dx = e.clientX - lastPos.current.x;
      const dy = e.clientY - lastPos.current.y;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) didMove.current = true;
      lastPos.current = { x: e.clientX, y: e.clientY };
      onDragMove(node.id, node.x + dx, node.y + dy);
    },
    [node.id, node.x, node.y, onDragMove]
  );

  const handlePointerUp = useCallback(() => {
    if (!isDragging.current) return;
    isDragging.current = false;
    onDragEnd(node.id);
  }, [node.id, onDragEnd]);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      if (didMove.current) return;
      e.stopPropagation();
      onClick(node);
    },
    [node, onClick]
  );

  return (
    <g
      transform={`translate(${node.x}, ${node.y})`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onClick={handleClick}
      style={{ cursor: "pointer" }}
    >
      {/* ═══ EARTH ═══ */}
      {isRoot && isRandom && (
        <>
          <defs>
            <radialGradient id="earth-atmo-inner" cx="50%" cy="50%" r="50%">
              <stop offset="85%" stopColor="rgba(100,200,255,0)" />
              <stop offset="100%" stopColor="rgba(100,200,255,0.30)" />
            </radialGradient>
            <radialGradient id="earth-atmo-outer" cx="50%" cy="50%" r="50%">
              <stop offset="80%" stopColor="rgba(60,140,255,0)" />
              <stop offset="100%" stopColor="rgba(60,140,255,0.12)" />
            </radialGradient>
            <radialGradient id="earth-surface" cx="35%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#5bb8e8" />
              <stop offset="25%" stopColor="#2d8ac7" />
              <stop offset="50%" stopColor="#1a6b4a" />
              <stop offset="70%" stopColor="#15593d" />
              <stop offset="100%" stopColor="#0c3d28" />
            </radialGradient>
            <radialGradient id="earth-light" cx="30%" cy="25%" r="45%">
              <stop offset="0%" stopColor="rgba(255,255,255,0.35)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0)" />
            </radialGradient>
            <radialGradient id="earth-dark" cx="72%" cy="70%" r="50%">
              <stop offset="0%" stopColor="rgba(0,0,0,0)" />
              <stop offset="100%" stopColor="rgba(0,0,0,0.45)" />
            </radialGradient>
            <filter id="earth-glow">
              <feGaussianBlur stdDeviation="5" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>

          <circle r={r + 14} fill="url(#earth-atmo-outer)"
            style={{ animation: "atmosphere-pulse 6s ease-in-out infinite" }} />
          <circle r={r + 6} fill="url(#earth-atmo-inner)"
            style={{ animation: "atmosphere-pulse 6s ease-in-out infinite" }} />

          <g style={{ animation: "earth-rotate 20s linear infinite", transformOrigin: "0 0" }}>
            <circle r={r} fill="url(#earth-surface)" filter="url(#earth-glow)" />
            <ellipse cx={-r * 0.15} cy={-r * 0.1} rx={r * 0.22} ry={r * 0.16} fill="rgba(20,80,45,0.45)" transform="rotate(-20)" />
            <ellipse cx={r * 0.25} cy={r * 0.18} rx={r * 0.14} ry={r * 0.11} fill="rgba(20,80,45,0.4)" transform="rotate(30)" />
            <ellipse cx={-r * 0.08} cy={r * 0.32} rx={r * 0.18} ry={r * 0.09} fill="rgba(20,80,45,0.35)" transform="rotate(-10)" />
            <ellipse cx={r * 0.35} cy={-r * 0.2} rx={r * 0.12} ry={r * 0.08} fill="rgba(20,80,45,0.3)" transform="rotate(15)" />
          </g>

          <g style={{ animation: "cloud-rotate 14s linear infinite, cloud-fade 5s ease-in-out infinite", transformOrigin: "0 0" }}>
            <ellipse cx={r * 0.12} cy={-r * 0.28} rx={r * 0.36} ry={r * 0.065} fill="rgba(255,255,255,0.22)" transform="rotate(-12)" />
            <ellipse cx={-r * 0.18} cy={r * 0.12} rx={r * 0.28} ry={r * 0.05} fill="rgba(255,255,255,0.16)" transform="rotate(18)" />
            <ellipse cx={r * 0.04} cy={r * 0.33} rx={r * 0.22} ry={r * 0.04} fill="rgba(255,255,255,0.12)" transform="rotate(-5)" />
            <ellipse cx={-r * 0.32} cy={-r * 0.08} rx={r * 0.18} ry={r * 0.035} fill="rgba(255,255,255,0.10)" transform="rotate(30)" />
          </g>

          <circle r={r} fill="url(#earth-light)" />
          <circle r={r} fill="url(#earth-dark)" />

          <text textAnchor="middle" dy="0.05em" className="pointer-events-none select-none" fill="white" fontSize={15} fontWeight="bold" style={{ textShadow: "0 2px 8px rgba(0,0,0,0.6)" }}>
            {node.title}
          </text>
        </>
      )}

      {/* ═══ MOON ═══ */}
      {isRoot && !isRandom && (
        <>
          <defs>
            <radialGradient id="moon-halo" cx="50%" cy="50%" r="50%">
              <stop offset="75%" stopColor="rgba(200,210,230,0)" />
              <stop offset="100%" stopColor="rgba(200,210,230,0.10)" />
            </radialGradient>
            <radialGradient id="moon-surface" cx="35%" cy="28%" r="65%">
              <stop offset="0%" stopColor="#f5f0e8" />
              <stop offset="25%" stopColor="#e0d8cc" />
              <stop offset="55%" stopColor="#c8bfb2" />
              <stop offset="80%" stopColor="#a89e92" />
              <stop offset="100%" stopColor="#7a7168" />
            </radialGradient>
            <radialGradient id="moon-light" cx="30%" cy="25%" r="40%">
              <stop offset="0%" stopColor="rgba(255,255,255,0.45)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0)" />
            </radialGradient>
            <radialGradient id="moon-dark" cx="70%" cy="68%" r="45%">
              <stop offset="0%" stopColor="rgba(0,0,0,0)" />
              <stop offset="100%" stopColor="rgba(0,0,0,0.35)" />
            </radialGradient>
            <filter id="moon-soft">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>

          <circle r={r + 10} fill="url(#moon-halo)"
            style={{ animation: "atmosphere-pulse 7s ease-in-out infinite" }} />

          <g style={{ animation: "moon-rotate 40s linear infinite", transformOrigin: "0 0" }}>
            <circle r={r} fill="url(#moon-surface)" filter="url(#moon-soft)" />
            <circle cx={-r * 0.22} cy={-r * 0.28} r={r * 0.09} fill="rgba(120,110,100,0.15)" style={{ filter: "blur(1.5px)" }} />
            <circle cx={r * 0.18} cy={r * 0.08} r={r * 0.13} fill="rgba(120,110,100,0.12)" style={{ filter: "blur(1px)" }} />
            <circle cx={-r * 0.32} cy={r * 0.22} r={r * 0.06} fill="rgba(120,110,100,0.10)" style={{ filter: "blur(1px)" }} />
            <circle cx={r * 0.28} cy={-r * 0.32} r={r * 0.05} fill="rgba(120,110,100,0.11)" style={{ filter: "blur(0.8px)" }} />
            <circle cx={r * 0.04} cy={r * 0.36} r={r * 0.07} fill="rgba(120,110,100,0.09)" style={{ filter: "blur(1.2px)" }} />
            <circle cx={-r * 0.18} cy={r * 0.03} r={r * 0.04} fill="rgba(120,110,100,0.08)" style={{ filter: "blur(0.8px)" }} />
            <circle cx={r * 0.35} cy={r * 0.15} r={r * 0.035} fill="rgba(120,110,100,0.07)" style={{ filter: "blur(0.6px)" }} />
          </g>

          <circle r={r} fill="url(#moon-light)" />
          <circle r={r} fill="url(#moon-dark)" />

          <text textAnchor="middle" dy="0.05em" className="pointer-events-none select-none" fill="white" fontSize={15} fontWeight="bold" style={{ textShadow: "0 2px 8px rgba(0,0,0,0.6)" }}>
            {node.title}
          </text>
        </>
      )}

      {/* ═══ CHERRY MEMORIES — Black Asteroid ═══ */}
      {!isRoot && node.owner === "cherry" && (
        <>
          <circle r={r + 3} fill="transparent" className="transition-all duration-300" />

          <defs>
            <radialGradient id={`mem-${node.id}`} cx="40%" cy="35%" r="65%">
              <stop offset="0%" stopColor="rgba(60,60,80,0.95)" />
              <stop offset="100%" stopColor="rgba(20,20,30,0.9)" />
            </radialGradient>
          </defs>

          <circle r={r} fill={`url(#mem-${node.id})`}
            stroke="rgba(255,255,255,0.1)" strokeWidth={1}
            className="transition-all duration-300" />

          <circle r={r * 0.7} cx={-r * 0.15} cy={-r * 0.15}
            fill="rgba(255,255,255,0.04)" />

          <text textAnchor="middle" dy="0.35em"
            className="pointer-events-none select-none" fill="white" fontSize={9}>
            {(node.paragraph || "").slice(0, 15)}{(node.paragraph || "").length > 15 ? "…" : ""}
          </text>
        </>
      )}

      {/* ═══ RANDOM MEMORIES — Ember Asteroid ═══ */}
      {!isRoot && node.owner === "random" && (
        <>
          <defs>
            <radialGradient id={`mem-random-${node.id}`} cx="38%" cy="32%" r="68%">
              <stop offset="0%" stopColor="#8a6248" />
              <stop offset="30%" stopColor="#63432e" />
              <stop offset="65%" stopColor="#3d2818" />
              <stop offset="100%" stopColor="#1c120a" />
            </radialGradient>
            <radialGradient id={`mem-random-glow-${node.id}`} cx="50%" cy="50%" r="50%">
              <stop offset="55%" stopColor="rgba(255,140,60,0)" />
              <stop offset="100%" stopColor="rgba(255,130,50,0.22)" />
            </radialGradient>
            <filter id={`mem-random-crack-${node.id}`}>
              <feGaussianBlur stdDeviation="1" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>

          {/* Warm outer glow, subtly pulsing — echoes Earth's atmosphere */}
          <circle r={r + 5} fill={`url(#mem-random-glow-${node.id})`}
            style={{ animation: "atmosphere-pulse 5s ease-in-out infinite" }} />

          {/* Rocky body */}
          <circle r={r} fill={`url(#mem-random-${node.id})`}
            stroke="rgba(255,150,80,0.22)" strokeWidth={1}
            className="transition-all duration-300" />

          {/* Craters, matched in style to Cherry's asteroids */}
          <circle cx={r * 0.22} cy={r * 0.18} r={r * 0.16} fill="rgba(0,0,0,0.22)" />
          <circle cx={-r * 0.28} cy={r * 0.02} r={r * 0.09} fill="rgba(0,0,0,0.18)" />
          <circle cx={r * 0.05} cy={-r * 0.3} r={r * 0.07} fill="rgba(0,0,0,0.15)" />
          <circle r={r * 0.65} cx={-r * 0.15} cy={-r * 0.15} fill="rgba(255,190,130,0.05)" />

          {/* Glowing molten cracks */}
          <path
            d={`M ${-r * 0.55} ${-r * 0.05} Q ${-r * 0.1} ${r * 0.12} ${r * 0.15} ${-r * 0.22} T ${r * 0.55} ${0}`}
            stroke="rgba(255,150,60,0.85)" strokeWidth={1.1} fill="none"
            filter={`url(#mem-random-crack-${node.id})`}
            style={{ animation: "ember-pulse 3.2s ease-in-out infinite" }}
          />
          <path
            d={`M ${-r * 0.3} ${r * 0.32} Q ${-r * 0.02} ${r * 0.15} ${r * 0.32} ${r * 0.4}`}
            stroke="rgba(255,120,45,0.6)" strokeWidth={0.9} fill="none"
            filter={`url(#mem-random-crack-${node.id})`}
            style={{ animation: "ember-pulse 3.8s ease-in-out infinite 0.6s" }}
          />

          <text textAnchor="middle" dy="0.35em"
            className="pointer-events-none select-none" fill="white" fontSize={9}
            style={{ textShadow: "0 1px 4px rgba(0,0,0,0.6)" }}>
            {(node.paragraph || "").slice(0, 15)}{(node.paragraph || "").length > 15 ? "…" : ""}
          </text>
        </>
      )}
    </g>
  );
}

export const BubbleNode = memo(BubbleNodeComponent);
