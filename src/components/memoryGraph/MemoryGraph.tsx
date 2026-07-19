"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { AnimatePresence } from "motion/react";
import { ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import { useForceSimulation } from "./hooks/useForceSimulation";
import { BubbleNode } from "./BubbleNode";
import MemoryModal from "./MemoryModal";
import HeartsShower from "./HeartsShower";
import type { GraphNode, GraphEdge } from "./types";

interface Memory {
  id: string;
  title: string;
  paragraph: string;
  owner: "random" | "cherry";
  createdAt: string;
}

interface MemoryGraphProps {
  memories: Memory[];
  randomDescription?: string;
  cherryDescription?: string;
}

export default function MemoryGraph({ memories, randomDescription = "", cherryDescription = "" }: MemoryGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [height, setHeight] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [filter, setFilter] = useState<"all" | "random" | "cherry">("all");

  // Resize observer
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      const { width: w, height: h } = entries[0].contentRect;
      setWidth(w);
      setHeight(h);
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Build graph data
  const { nodes, edges } = useMemo(() => {
    const rootRandom: GraphNode = {
      id: "root-random",
      type: "root",
      owner: "random",
      title: "Random",
      paragraph: randomDescription || "Random",
      x: width * 0.25,
      y: height * 0.5,
      vx: 0,
      vy: 0,
      fx: null,
      fy: null,
      radius: 55,
      expanded: false,
    };

    const rootCherry: GraphNode = {
      id: "root-cherry",
      type: "root",
      owner: "cherry",
      title: "Cherry",
      paragraph: cherryDescription || "Cherry",
      x: width * 0.75,
      y: height * 0.5,
      vx: 0,
      vy: 0,
      fx: null,
      fy: null,
      radius: 55,
      expanded: false,
    };

    const memoryNodes: GraphNode[] = memories.map((m) => ({
      id: m.id,
      type: "memory" as const,
      owner: m.owner,
      title: m.title,
      paragraph: m.paragraph,
      createdAt: m.createdAt,
      x: width / 2 + (Math.random() - 0.5) * 300,
      y: height / 2 + (Math.random() - 0.5) * 300,
      vx: 0,
      vy: 0,
      fx: null,
      fy: null,
      radius: 30 + Math.min(m.paragraph.length / 40, 15),
      expanded: false,
    }));

    const memoryEdges: GraphEdge[] = memories.map((m) => ({
      source: `root-${m.owner}`,
      target: m.id,
    }));

    // Always connect roots
    const rootEdge: GraphEdge = {
      source: "root-random",
      target: "root-cherry",
    };

    return {
      nodes: [rootRandom, rootCherry, ...memoryNodes],
      edges: [rootEdge, ...memoryEdges],
    };
  }, [memories, width, height]);

  // Filter
  const filteredNodes = useMemo(() => {
    if (filter === "all") return nodes;
    return nodes.filter((n) => n.owner === filter || n.type === "root");
  }, [nodes, filter]);

  const filteredEdges = useMemo(() => {
    const nodeIds = new Set(filteredNodes.map((n) => n.id));
    return edges.filter((e) => nodeIds.has(e.source) && nodeIds.has(e.target));
  }, [edges, filteredNodes]);

  // Force simulation
  const { getNodes, getEdges, dragStart, dragMove, dragEnd } =
    useForceSimulation({
      width,
      height,
      nodes: filteredNodes,
      edges: filteredEdges,
    });

  const currentNodes = getNodes();
  const currentEdges = getEdges();

  // ── Planet touch detection (Random ↔ Cherry) ──
  // Rendered root radius is fixed at 60 in BubbleNode regardless of the
  // underlying data radius, so we match that here for an accurate touch feel.
  const ROOT_RENDER_RADIUS = 60;
  const rootRandomNode = currentNodes.find((n) => n.id === "root-random");
  const rootCherryNode = currentNodes.find((n) => n.id === "root-cherry");

  const isPlanetsTouching = useMemo(() => {
    if (!rootRandomNode || !rootCherryNode) return false;
    const dx = rootRandomNode.x - rootCherryNode.x;
    const dy = rootRandomNode.y - rootCherryNode.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    return dist <= ROOT_RENDER_RADIUS * 2 + 6;
  }, [rootRandomNode?.x, rootRandomNode?.y, rootCherryNode?.x, rootCherryNode?.y]);

  const heartOrigin = useMemo(() => {
    if (!rootRandomNode || !rootCherryNode || width === 0 || height === 0) {
      return { xPct: 50, yPct: 50 };
    }
    const midX = (rootRandomNode.x + rootCherryNode.x) / 2;
    const midY = (rootRandomNode.y + rootCherryNode.y) / 2;
    const screenX = midX * zoom + pan.x;
    const screenY = midY * zoom + pan.y;
    return { xPct: (screenX / width) * 100, yPct: (screenY / height) * 100 };
  }, [rootRandomNode?.x, rootRandomNode?.y, rootCherryNode?.x, rootCherryNode?.y, zoom, pan, width, height]);

  // Open modal on click
  const handleClick = useCallback(
    (node: GraphNode) => {
      setSelectedNode(node);
    },
    []
  );

  // Zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setZoom((z) => Math.max(0.3, Math.min(3, z + (e.deltaY > 0 ? -0.1 : 0.1))));
  }, []);

  // Pan
  const panRef = useRef({ startX: 0, startY: 0, startPanX: 0, startPanY: 0 });
  const [isPanning, setIsPanning] = useState(false);

  const handlePanStart = useCallback(
    (e: React.PointerEvent) => {
      if (e.target === containerRef.current || (e.target as HTMLElement).tagName === "svg") {
        setIsPanning(true);
        panRef.current = {
          startX: e.clientX,
          startY: e.clientY,
          startPanX: pan.x,
          startPanY: pan.y,
        };
      }
    },
    [pan]
  );

  const handlePanMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isPanning) return;
      setPan({
        x: panRef.current.startPanX + (e.clientX - panRef.current.startX),
        y: panRef.current.startPanY + (e.clientY - panRef.current.startY),
      });
    },
    [isPanning]
  );

  const handlePanEnd = useCallback(() => setIsPanning(false), []);

  const resetView = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  return (
    <div className="relative h-full w-full overflow-hidden rounded-xl" style={{ background: "radial-gradient(ellipse at center, #0d1117 0%, #010409 70%, #000000 100%)" }}>
      {/* Controls */}
      <div className="absolute top-2 right-2 z-10 flex flex-wrap items-center justify-end gap-1.5 sm:top-4 sm:right-4 sm:gap-2">
        {/* Filter */}
        <div className="flex rounded-lg border border-gray-800 bg-gray-900/80 backdrop-blur-sm">
          {(["all", "random", "cherry"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-2 py-1 text-[11px] font-medium transition-colors sm:px-3 sm:py-1.5 sm:text-xs ${
                filter === f
                  ? f === "random"
                    ? "bg-red-600 text-white"
                    : f === "cherry"
                    ? "bg-pink-500 text-white"
                    : "bg-gray-700 text-white"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              {f === "all" ? "All" : f === "random" ? "Random" : "Cherry"}
            </button>
          ))}
        </div>

        <button
          onClick={() => setZoom((z) => Math.min(3, z + 0.2))}
          className="rounded-lg border border-gray-800 bg-gray-900/80 p-1.5 text-gray-400 backdrop-blur-sm hover:text-white sm:p-2"
        >
          <ZoomIn className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
        </button>
        <button
          onClick={() => setZoom((z) => Math.max(0.3, z - 0.2))}
          className="rounded-lg border border-gray-800 bg-gray-900/80 p-1.5 text-gray-400 backdrop-blur-sm hover:text-white sm:p-2"
        >
          <ZoomOut className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
        </button>
        <button
          onClick={resetView}
          className="rounded-lg border border-gray-800 bg-gray-900/80 p-1.5 text-gray-400 backdrop-blur-sm hover:text-white sm:p-2"
        >
          <RotateCcw className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
        </button>
      </div>

      {/* Stats */}
      <div className="absolute bottom-2 left-2 z-10 text-[10px] text-gray-500 sm:bottom-4 sm:left-4 sm:text-xs">
        {memories.length} memories · zoom {Math.round(zoom * 100)}%
      </div>

      {/* SVG Canvas */}
      <svg
        ref={containerRef as any}
        width="100%"
        height="100%"
        onWheel={handleWheel}
        onPointerDown={handlePanStart}
        onPointerMove={handlePanMove}
        onPointerUp={handlePanEnd}
        onPointerLeave={handlePanEnd}
        style={{ cursor: isPanning ? "grabbing" : "grab", touchAction: "none" }}
      >
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Stars — truly random positions via seeded hash */}
        {(() => {
          // Simple hash function for deterministic "random" positions
          const hash = (n: number) => {
            let h = n * 2654435761;
            h = ((h >>> 16) ^ h) * 0x45d9f3b;
            h = ((h >>> 16) ^ h) * 0x45d9f3b;
            h = (h >>> 16) ^ h;
            return (h & 0x7fffffff) / 0x7fffffff; // 0..1
          };

          return Array.from({ length: 120 }, (_, i) => {
            const x = hash(i * 3 + 1) * 100;
            const y = hash(i * 3 + 7) * 100;
            const twinkle = i % 3 === 0 ? "twinkle-1" : i % 3 === 1 ? "twinkle-2" : i % 5 === 0 ? "twinkle-3" : "";
            const dur = 2 + (hash(i * 5) * 4);
            const del = hash(i * 11) * 5;
            const sz = 0.3 + hash(i * 13) * 0.7;
            const bri = 0.1 + hash(i * 17) * 0.4;
            return (
              <circle
                key={`star-${i}`}
                cx={`${x}%`}
                cy={`${y}%`}
                r={sz}
                fill="white"
                opacity={bri}
                style={twinkle ? { animation: `${twinkle} ${dur}s ease-in-out ${del}s infinite` } : undefined}
              />
            );
          });
        })()}

        {/* Heart constellation — bottom-left, compact */}
        {(() => {
          const heartPoints: [number, number][] = [];
          for (let t = 0; t <= Math.PI * 2; t += 0.2) {
            const hx = 16 * Math.pow(Math.sin(t), 3);
            const hy = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
            heartPoints.push([hx, hy]);
          }
          // Compact heart: narrower, tucked in bottom-left
          const cx = 7;
          const cy = 90;
          const scaleX = 0.12; // narrow
          const scaleY = 0.22; // keep height

          return heartPoints
            .filter((_, i) => i % 2 === 0)
            .map(([hx, hy], i) => (
              <circle
                key={`heart-${i}`}
                cx={`${cx + hx * scaleX}%`}
                cy={`${cy + hy * scaleY}%`}
                r={0.6 + (i % 3) * 0.2}
                fill="white"
                opacity={0.4 + (i % 4) * 0.15}
                style={{
                  animation: `twinkle-${(i % 3) + 1} ${3 + (i % 3)}s ease-in-out ${i * 0.25}s infinite`,
                }}
              />
            ));
        })()}

        <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
          {/* Edges */}
          {currentEdges.map((edge, i) => {
            const source = currentNodes.find((n) => n.id === edge.source);
            const target = currentNodes.find((n) => n.id === edge.target);
            if (!source || !target) return null;

            const isRootEdge =
              source.type === "root" && target.type === "root";

            return (
              <line
                key={`${edge.source}-${edge.target}-${i}`}
                x1={source.x}
                y1={source.y}
                x2={target.x}
                y2={target.y}
                stroke={
                  isRootEdge
                    ? isPlanetsTouching
                      ? "rgba(255,90,130,0.85)"
                      : "rgba(255,255,255,0.15)"
                    : "rgba(255,255,255,0.08)"
                }
                strokeWidth={isRootEdge ? (isPlanetsTouching ? 3 : 2) : 1}
                strokeDasharray={isRootEdge ? "none" : "4 4"}
                filter={isRootEdge && isPlanetsTouching ? "url(#glow)" : undefined}
                style={
                  isRootEdge && isPlanetsTouching
                    ? { animation: "atmosphere-pulse 1.4s ease-in-out infinite" }
                    : undefined
                }
              />
            );
          })}

          {/* Nodes */}
          {currentNodes.map((node) => (
            <BubbleNode
              key={node.id}
              node={node}
              onDragStart={dragStart}
              onDragMove={dragMove}
              onDragEnd={dragEnd}
              onClick={handleClick}
            />
          ))}
        </g>
      </svg>

      {/* Heart shower — plays whenever Random and Cherry's planets touch */}
      <HeartsShower
        active={isPlanetsTouching}
        originXPct={heartOrigin.xPct}
        originYPct={heartOrigin.yPct}
      />

      {/* Memory Modal */}
      <AnimatePresence>
        {selectedNode && (
          <MemoryModal
            node={selectedNode}
            onClose={() => setSelectedNode(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
