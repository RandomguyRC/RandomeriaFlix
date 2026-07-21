"use client";

import { PointerEvent, useEffect, useMemo, useRef, useState } from "react";
import { Minus, Plus } from "lucide-react";
import type { MapMarker } from "./types";

const TILE_SIZE = 256;
const MIN_ZOOM = 3;
const MAX_ZOOM = 18;
const INDIA_BOUNDS = {
  north: 37.6,
  south: 6.4,
  west: 68.1,
  east: 97.4,
};

interface SlippyMapProps {
  center: { lat: number; lng: number };
  zoom: number;
  markers?: MapMarker[];
  activeMarkerId?: string | null;
  className?: string;
  onMarkerClick?: (id: string) => void;
  onMapClick?: (point: { lat: number; lng: number }) => void;
  onViewChange?: (view: { lat: number; lng: number; zoom: number }) => void;
  clickToPlace?: boolean;
  /** When this changes, smoothly fly to the given center+zoom */
  flyTo?: { lat: number; lng: number; zoom: number };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function wrapLng(lng: number) {
  return ((((lng + 180) % 360) + 360) % 360) - 180;
}

function project(lat: number, lng: number, zoom: number) {
  const scale = TILE_SIZE * 2 ** zoom;
  const sinLat = Math.sin((clamp(lat, -85.05112878, 85.05112878) * Math.PI) / 180);
  return {
    x: ((wrapLng(lng) + 180) / 360) * scale,
    y: (0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)) * scale,
  };
}

function unproject(x: number, y: number, zoom: number) {
  const scale = TILE_SIZE * 2 ** zoom;
  const lng = (x / scale) * 360 - 180;
  const n = Math.PI - (2 * Math.PI * y) / scale;
  const lat = (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
  return { lat, lng };
}

function normalizeCenter(lat: number, lng: number) {
  return {
    lat: clamp(lat, INDIA_BOUNDS.south - 4, INDIA_BOUNDS.north + 4),
    lng: clamp(wrapLng(lng), INDIA_BOUNDS.west - 6, INDIA_BOUNDS.east + 6),
  };
}

function markerClass(color?: string) {
  switch (color) {
    case "amber":
      return "from-amber-300 via-orange-400 to-rose-500 shadow-amber-500/35";
    case "violet":
      return "from-violet-300 via-fuchsia-400 to-rose-500 shadow-fuchsia-500/35";
    case "sky":
      return "from-sky-300 via-cyan-400 to-teal-500 shadow-cyan-500/35";
    case "emerald":
      return "from-emerald-300 via-teal-400 to-cyan-500 shadow-emerald-500/35";
    default:
      return "from-rose-300 via-red-400 to-pink-500 shadow-rose-500/35";
  }
}

export default function SlippyMap({
  center,
  zoom,
  markers = [],
  activeMarkerId,
  className = "",
  onMarkerClick,
  onMapClick,
  onViewChange,
  clickToPlace = false,
  flyTo,
}: SlippyMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    centerWorld: { x: number; y: number };
    moved: boolean;
  } | null>(null);
  const [size, setSize] = useState({ width: 900, height: 560 });
  const [view, setView] = useState(() => ({ ...normalizeCenter(center.lat, center.lng), zoom: clamp(zoom, MIN_ZOOM, MAX_ZOOM) }));
  // Fly‑to animation ref — holds the active interpolation if one is running
  const flyRef = useRef<number | null>(null);
  const flyStartRef = useRef<{ from: typeof view; to: typeof view; t0: number; dur: number } | null>(null);

  useEffect(() => {
    const next = { ...normalizeCenter(center.lat, center.lng), zoom: clamp(zoom, MIN_ZOOM, MAX_ZOOM) };
    setView(next);
  }, [center.lat, center.lng, zoom]);

  // Fly‑to: whenever flyTo changes (by identity or deep value) animate there
  useEffect(() => {
    if (!flyTo) return;
    // Cancel any in‑flight fly
    if (flyRef.current) { cancelAnimationFrame(flyRef.current); flyRef.current = null; }
    flyStartRef.current = {
      from: { ...view },
      to: { ...normalizeCenter(flyTo.lat, flyTo.lng), zoom: clamp(flyTo.zoom, MIN_ZOOM, MAX_ZOOM) },
      t0: performance.now(),
      dur: 600,
    };
    const tick = (now: number) => {
      const s = flyStartRef.current;
      if (!s) return;
      let t = Math.min((now - s.t0) / s.dur, 1);
      // Cubic ease‑out
      const e = 1 - Math.pow(1 - t, 3);
      const lat = s.from.lat + (s.to.lat - s.from.lat) * e;
      const lng = s.from.lng + (s.to.lng - s.from.lng) * e;
      const zoom = s.from.zoom + (s.to.zoom - s.from.zoom) * e;
      setView({ lat, lng, zoom: Math.round(zoom * 100) / 100 });
      if (t < 1) { flyRef.current = requestAnimationFrame(tick); }
      else { flyRef.current = null; flyStartRef.current = null; }
    };
    flyRef.current = requestAnimationFrame(tick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flyTo?.lat, flyTo?.lng, flyTo?.zoom]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      const rect = el.getBoundingClientRect();
      setSize({ width: rect.width || 900, height: rect.height || 560 });
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Non-passive wheel handler — prevents page scroll while zooming the map
  // Uses refs to avoid stale closures in setView's updater callback.
  const viewRef = useRef(view);
  viewRef.current = view;
  const sizeRef = useRef(size);
  sizeRef.current = size;
  const emitRef = useRef(emit);
  emitRef.current = emit;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    function onWheel(e: WheelEvent) {
      e.preventDefault();
      setView((current) => {
        const dz = e.deltaY < 0 ? 1 : -1;
        const z = clamp(current.zoom + dz, MIN_ZOOM, MAX_ZOOM);
        if (z === current.zoom) return current;
        const rect = el.getBoundingClientRect();
        const tl = project(current.lat, current.lng, current.zoom);
        const topL = { x: tl.x - sizeRef.current.width / 2, y: tl.y - sizeRef.current.height / 2 };
        const pointLngLat = unproject(topL.x + e.clientX - rect.left, topL.y + e.clientY - rect.top, current.zoom);
        const pointAtNewZoom = project(pointLngLat.lat, pointLngLat.lng, z);
        const newCenterWorld = {
          x: pointAtNewZoom.x - (e.clientX - rect.left - sizeRef.current.width / 2),
          y: pointAtNewZoom.y - (e.clientY - rect.top - sizeRef.current.height / 2),
        };
        const nextCenter = normalizeCenter(unproject(newCenterWorld.x, newCenterWorld.y, z).lat, unproject(newCenterWorld.x, newCenterWorld.y, z).lng);
        const next = { ...nextCenter, zoom: z };
        emitRef.current(next);
        return next;
      });
    }
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const centerWorld = useMemo(() => project(view.lat, view.lng, view.zoom), [view]);
  const topLeft = {
    x: centerWorld.x - size.width / 2,
    y: centerWorld.y - size.height / 2,
  };
  const scale = TILE_SIZE * 2 ** view.zoom;
  const tileMinX = Math.floor(topLeft.x / TILE_SIZE) - 1;
  const tileMaxX = Math.floor((topLeft.x + size.width) / TILE_SIZE) + 1;
  const tileMinY = Math.max(0, Math.floor(topLeft.y / TILE_SIZE) - 1);
  const tileMaxY = Math.min(2 ** view.zoom - 1, Math.floor((topLeft.y + size.height) / TILE_SIZE) + 1);

  const tiles = [];
  const tilesPerSide = 2 ** view.zoom;
  for (let x = tileMinX; x <= tileMaxX; x++) {
    for (let y = tileMinY; y <= tileMaxY; y++) {
      const wrappedX = ((x % tilesPerSide) + tilesPerSide) % tilesPerSide;
      tiles.push({
        key: `${x}:${y}:${view.zoom}`,
        url: `https://a.tile.openstreetmap.org/${view.zoom}/${wrappedX}/${y}.png`,
        left: x * TILE_SIZE - topLeft.x,
        top: y * TILE_SIZE - topLeft.y,
      });
    }
  }

  function emit(next: { lat: number; lng: number; zoom: number }) {
    setView(next);
    onViewChange?.(next);
  }

  function setZoom(nextZoom: number, around?: { clientX: number; clientY: number }) {
    const z = clamp(nextZoom, MIN_ZOOM, MAX_ZOOM);
    if (z === view.zoom) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect || !around) {
      emit({ ...view, zoom: z });
      return;
    }
    const pointLngLat = unproject(topLeft.x + around.clientX - rect.left, topLeft.y + around.clientY - rect.top, view.zoom);
    const pointAtNewZoom = project(pointLngLat.lat, pointLngLat.lng, z);
    const newCenterWorld = {
      x: pointAtNewZoom.x - (around.clientX - rect.left - size.width / 2),
      y: pointAtNewZoom.y - (around.clientY - rect.top - size.height / 2),
    };
    const nextCenter = normalizeCenter(unproject(newCenterWorld.x, newCenterWorld.y, z).lat, unproject(newCenterWorld.x, newCenterWorld.y, z).lng);
    emit({ ...nextCenter, zoom: z });
  }

  function pointerPoint(e: PointerEvent<HTMLDivElement>) {
    const rect = containerRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function handlePointerDown(e: PointerEvent<HTMLDivElement>) {
    if ((e.target as HTMLElement).closest("button")) return;
    dragRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      centerWorld,
      moved: false,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e: PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;
    if (Math.abs(dx) + Math.abs(dy) > 5) drag.moved = true;
    const nextWorld = { x: drag.centerWorld.x - dx, y: drag.centerWorld.y - dy };
    const next = unproject(nextWorld.x, nextWorld.y, view.zoom);
    emit({ ...normalizeCenter(next.lat, next.lng), zoom: view.zoom });
  }

  function handlePointerUp(e: PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    dragRef.current = null;
    if (!drag.moved && onMapClick) {
      const p = pointerPoint(e);
      const clicked = unproject(topLeft.x + p.x, topLeft.y + p.y, view.zoom);
      onMapClick(normalizeCenter(clicked.lat, clicked.lng));
    }
  }

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden bg-[#08111f] ${clickToPlace ? "cursor-crosshair" : "cursor-grab active:cursor-grabbing"} ${className}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={() => { dragRef.current = null; }}
    >
      <div className="absolute inset-0">
        {tiles.map((tile) => (
          <img
            key={tile.key}
            src={tile.url}
            alt=""
            draggable={false}
            className="absolute h-64 w-64 select-none"
            style={{ left: tile.left, top: tile.top }}
          />
        ))}
      </div>

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,transparent_0%,rgba(4,7,12,0.05)_42%,rgba(4,7,12,0.42)_100%)]" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#0a0a0a]/15 via-transparent to-[#0a0a0a]/30 mix-blend-multiply" />

      {markers.map((marker) => {
        const point = project(marker.latitude, marker.longitude, view.zoom);
        const left = point.x - topLeft.x;
        const top = point.y - topLeft.y;
        const active = marker.id === activeMarkerId;
        if (left < -80 || top < -90 || left > size.width + 80 || top > size.height + 80) return null;
        return (
          <button
            key={marker.id}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onMarkerClick?.(marker.id);
            }}
            className={`absolute z-20 flex -translate-x-1/2 -translate-y-full flex-col items-center outline-none transition-transform duration-300 hover:scale-110 ${active ? "scale-110" : ""}`}
            style={{ left, top }}
            aria-label={marker.title}
          >
            <span className={`relative flex h-16 w-16 items-center justify-center rounded-[1.4rem] bg-gradient-to-br ${markerClass(marker.color)} p-1 shadow-2xl ring-2 ring-white/70`}>
              <span className="absolute -inset-2 rounded-[1.65rem] bg-white/20 blur-xl" />
              <span className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-[1.1rem] bg-black/30 text-2xl backdrop-blur-sm">
                {marker.thumbnailUrl ? (
                  <img src={marker.thumbnailUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  marker.iconEmoji || "💖"
                )}
              </span>
            </span>
            <span className={`mt-1 h-4 w-4 rotate-45 bg-gradient-to-br ${markerClass(marker.color)} shadow-lg`} />
            <span className="mt-1 max-w-32 truncate rounded-full border border-white/15 bg-black/55 px-3 py-1 text-[11px] font-semibold text-white shadow-lg backdrop-blur-md">
              {marker.title}
            </span>
          </button>
        );
      })}

      <div className="absolute left-4 top-4 z-30 flex overflow-hidden rounded-2xl border border-white/15 bg-black/45 shadow-2xl backdrop-blur-md">
        <button type="button" onClick={() => setZoom(view.zoom + 1)} className="p-3 text-white transition-colors hover:bg-white/10" aria-label="Zoom in">
          <Plus className="h-4 w-4" />
        </button>
        <button type="button" onClick={() => setZoom(view.zoom - 1)} className="border-l border-white/10 p-3 text-white transition-colors hover:bg-white/10" aria-label="Zoom out">
          <Minus className="h-4 w-4" />
        </button>
      </div>

      <div className="absolute bottom-3 right-3 z-30 rounded-full bg-black/45 px-2 py-1 text-[10px] text-white/60 backdrop-blur-md">
        © OpenStreetMap
      </div>
    </div>
  );
}
