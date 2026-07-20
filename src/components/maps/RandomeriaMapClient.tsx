"use client";

import { useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronLeft, ChevronRight, Film, ImageIcon, MapPin, Navigation, Pause, Play, Volume2, VolumeX, X } from "lucide-react";
import SlippyMap from "./SlippyMap";
import type { MapConfig, MapContentItem, MapMarker, MapPlace } from "./types";

interface RandomeriaMapClientProps {
  profileName: string;
  config: MapConfig;
  places: MapPlace[];
}

function mediaThumb(item: MapContentItem) {
  return `/api/media/${item.thumbnailAsset?.id || item.mainAsset.id}`;
}

function markerThumb(place: MapPlace) {
  const preferred = place.thumbnailContentId
    ? place.media.find((m) => m.contentItem.id === place.thumbnailContentId)?.contentItem
    : null;
  const fallback = place.media[0]?.contentItem;
  const item = preferred || fallback;
  return item ? mediaThumb(item) : undefined;
}

export default function RandomeriaMapClient({ profileName, config, places }: RandomeriaMapClientProps) {
  const [activeId, setActiveId] = useState<string | null>(places[0]?.id ?? null);
  const [mediaIndex, setMediaIndex] = useState(0);
  const activePlace = places.find((p) => p.id === activeId) ?? null;
  const activeMedia = activePlace?.media[mediaIndex]?.contentItem ?? null;

  const markers: MapMarker[] = useMemo(() => places.map((place) => ({
    id: place.id,
    title: place.title,
    latitude: place.latitude,
    longitude: place.longitude,
    iconEmoji: place.iconEmoji,
    color: place.color,
    thumbnailUrl: markerThumb(place),
  })), [places]);

  // When the active place changes, fly to it at city-level zoom
  const flyTo = useMemo(() => {
    if (!activePlace) return null;
    return { lat: activePlace.latitude, lng: activePlace.longitude, zoom: 17 };
  }, [activePlace]);

  function selectPlace(id: string) {
    setActiveId(id);
    setMediaIndex(0);
  }

  function moveMedia(direction: -1 | 1) {
    if (!activePlace?.media.length) return;
    setMediaIndex((current) => (current + direction + activePlace.media.length) % activePlace.media.length);
  }

  return (
    <main className="relative min-h-[calc(100vh-56px)] overflow-hidden bg-[#05070d] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_12%,rgba(244,63,94,0.22),transparent_30%),radial-gradient(circle_at_85%_18%,rgba(14,165,233,0.18),transparent_28%),radial-gradient(circle_at_50%_90%,rgba(251,191,36,0.12),transparent_34%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:56px_56px] opacity-40" />

      <section className="relative z-10 flex min-h-[calc(100vh-56px)] flex-col">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 pb-4 pt-6 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-rose-200 backdrop-blur-md">
                <Navigation className="h-3.5 w-3.5" /> Randomeria Maps
              </div>
              <h1 className="font-serif text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
                Our little universe,
                <span className="block bg-gradient-to-r from-rose-200 via-amber-100 to-sky-200 bg-clip-text text-transparent">pinned across India.</span>
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-white/62 sm:text-base">
                Tap a glowing memory marker to revisit the places that became chapters for {profileName}.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 rounded-3xl border border-white/10 bg-black/30 p-2 text-center shadow-2xl backdrop-blur-xl">
              <div className="rounded-2xl bg-white/[0.06] px-4 py-3">
                <p className="text-2xl font-bold text-white">{places.length}</p>
                <p className="text-[10px] uppercase tracking-[0.18em] text-white/45">Places</p>
              </div>
              <div className="rounded-2xl bg-white/[0.06] px-4 py-3">
                <p className="text-2xl font-bold text-white">{places.reduce((sum, p) => sum + p.media.length, 0)}</p>
                <p className="text-[10px] uppercase tracking-[0.18em] text-white/45">Memories</p>
              </div>
              <div className="rounded-2xl bg-white/[0.06] px-4 py-3">
                <p className="text-2xl font-bold text-white">∞</p>
                <p className="text-[10px] uppercase tracking-[0.18em] text-white/45">Love</p>
              </div>
            </div>
          </div>

          {places.length === 0 ? (
            <div className="flex min-h-[58vh] items-center justify-center rounded-[2rem] border border-white/10 bg-white/[0.04] text-center backdrop-blur-md">
              <div className="px-6">
                <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-rose-500/10 text-3xl ring-1 ring-rose-300/20">🗺️</div>
                <h2 className="text-2xl font-bold text-white">No places pinned yet.</h2>
                <p className="mt-2 max-w-md text-sm leading-6 text-white/50">Add your first special city from Admin → Randomeria Maps.</p>
              </div>
            </div>
          ) : (
            <div className="relative min-h-[620px] overflow-hidden rounded-[2rem] border border-white/10 bg-black/35 shadow-[0_24px_90px_rgba(0,0,0,0.45)] backdrop-blur-xl">
              <SlippyMap
                center={{ lat: config.defaultLat, lng: config.defaultLng }}
                zoom={config.defaultZoom}
                markers={markers}
                activeMarkerId={activeId}
                onMarkerClick={selectPlace}
                flyTo={flyTo ?? undefined}
                className="h-[calc(100vh-230px)] min-h-[620px] w-full"
              />

              <div className="pointer-events-none absolute left-0 top-0 z-20 h-full w-full bg-gradient-to-r from-black/55 via-transparent to-black/35 lg:from-black/50" />

              <div className="absolute left-4 top-20 z-30 hidden max-h-[calc(100%-7rem)] w-72 overflow-y-auto rounded-3xl border border-white/10 bg-black/45 p-3 shadow-2xl backdrop-blur-xl lg:block">
                <p className="mb-3 px-2 text-xs font-semibold uppercase tracking-[0.22em] text-white/45">Memory pins</p>
                <div className="space-y-2">
                  {places.map((place, index) => (
                    <button
                      key={place.id}
                      onClick={() => selectPlace(place.id)}
                      className={`flex w-full items-center gap-3 rounded-2xl border p-2 text-left transition-all ${activeId === place.id ? "border-rose-300/35 bg-rose-400/15" : "border-white/5 bg-white/[0.04] hover:border-white/15 hover:bg-white/[0.07]"}`}
                    >
                      <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white/10 text-xl">
                        {markerThumb(place) ? <img src={markerThumb(place)} alt="" className="h-full w-full object-cover" /> : place.iconEmoji}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-white">{place.title}</p>
                        <p className="text-xs text-white/45">Stop {index + 1} · {place.media.length} memories</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <AnimatePresence mode="wait">
                {activePlace && (
                  <motion.aside
                    key={activePlace.id}
                    initial={{ opacity: 0, y: 24, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 24, scale: 0.98 }}
                    transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
                    className="absolute inset-x-3 bottom-3 z-40 flex max-h-[82%] flex-col overflow-hidden rounded-[1.75rem] border border-white/15 bg-[#080b12]/85 shadow-[0_20px_80px_rgba(0,0,0,0.55)] backdrop-blur-2xl sm:inset-x-auto sm:right-4 sm:w-[420px]"
                    style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(255,255,255,0.12) transparent" }}
                  >
                    <button
                      onClick={() => setActiveId(null)}
                      className="absolute right-3 top-3 z-20 rounded-full bg-black/45 p-2 text-white/70 backdrop-blur-md transition-colors hover:text-white"
                      aria-label="Close place"
                    >
                      <X className="h-4 w-4" />
                    </button>

                    <div className="relative h-56 shrink-0 overflow-hidden bg-black/60 sm:h-64">
                      {activeMedia ? (
                        activeMedia.type === "VIDEO" ? (
                          <VideoPlayer src={`/api/media/${activeMedia.mainAsset.id}`} />
                        ) : (
                          <img src={`/api/media/${activeMedia.mainAsset.id}`} alt="" className="h-full w-full object-cover" />
                        )
                      ) : (
                        <div className="flex h-full items-center justify-center text-6xl">{activePlace.iconEmoji}</div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-[#080b12] via-transparent to-black/15" />
                      {activePlace.media.length > 1 && (
                        <>
                          <button onClick={() => moveMedia(-1)} className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-md transition-transform hover:scale-105" aria-label="Previous media">
                            <ChevronLeft className="h-5 w-5" />
                          </button>
                          <button onClick={() => moveMedia(1)} className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-md transition-transform hover:scale-105" aria-label="Next media">
                            <ChevronRight className="h-5 w-5" />
                          </button>
                          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
                            {activePlace.media.map((m, i) => (
                              <button key={m.id} onClick={() => setMediaIndex(i)} className={`h-1.5 rounded-full transition-all ${i === mediaIndex ? "w-7 bg-white" : "w-1.5 bg-white/45"}`} aria-label={`Show media ${i + 1}`} />
                            ))}
                          </div>
                        </>
                      )}
                    </div>

                    <div className="min-h-0 flex-1 overflow-y-auto">
                      <div className="p-5 pb-6 sm:p-6">
                        <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-rose-200/80">
                          <MapPin className="h-3.5 w-3.5" /> Special place
                        </div>
                        <h2 className="text-2xl font-bold text-white">{activePlace.title}</h2>
                        {activePlace.description && <p className="mt-3 text-sm leading-6 text-white/65">{activePlace.description}</p>}

                        {activePlace.media.length > 0 && (
                          <div className="mt-5">
                            <div className="relative flex items-center">
                              {activePlace.media.length > 4 && (
                                <button type="button" onClick={() => { const el = document.getElementById(`ms-${activePlace.id}`); if (el) el.scrollBy({ left: -160, behavior: "smooth" }); }}
                                  className="absolute -left-1.5 top-1/2 z-10 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white/80 backdrop-blur-md transition-all hover:bg-black/80 hover:text-white">
                                  <ChevronLeft className="h-3.5 w-3.5" />
                                </button>
                              )}
                              <div id={`ms-${activePlace.id}`} className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
                                {activePlace.media.map((media, index) => (
                                  <button key={media.id} onClick={() => setMediaIndex(index)}
                                    className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl border transition-all ${index === mediaIndex ? "border-rose-300 ring-2 ring-rose-300/25" : "border-white/10 opacity-70 hover:opacity-100"}`}>
                                    <img src={mediaThumb(media.contentItem)} alt="" className="h-full w-full object-cover" />
                                    <span className="absolute bottom-1 right-1 rounded-full bg-black/60 p-1 text-white">
                                      {media.contentItem.type === "VIDEO" ? <Film className="h-3 w-3" /> : <ImageIcon className="h-3 w-3" />}
                                    </span>
                                  </button>
                                ))}
                              </div>
                              {activePlace.media.length > 4 && (
                                <button type="button" onClick={() => { const el = document.getElementById(`ms-${activePlace.id}`); if (el) el.scrollBy({ left: 160, behavior: "smooth" }); }}
                                  className="absolute -right-1.5 top-1/2 z-10 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white/80 backdrop-blur-md transition-all hover:bg-black/80 hover:text-white">
                                  <ChevronRight className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.aside>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

// ─── Custom video player (simplified) ───
// CSS group-hover reveals controls on any hover, no timer shenanigans.
// Click the video to toggle play/pause; a centered play button appears when paused.
function VideoPlayer({ src }: { src: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [volume, setVolume] = useState(1);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  function togglePlay() {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) { v.play().catch(() => {}); setPlaying(true); }
    else { v.pause(); setPlaying(false); }
  }

  function handleSeek(e: React.MouseEvent<HTMLDivElement>) {
    const v = videoRef.current;
    const bar = e.currentTarget;
    if (!v || !duration) return;
    const pct2 = Math.max(0, Math.min(1, (e.clientX - bar.getBoundingClientRect().left) / bar.clientWidth));
    v.currentTime = pct2 * duration;
  }

  const pct = duration ? (progress / duration) * 100 : 0;
  const fmt = (s: number) => {
    if (!isFinite(s)) return "0:00";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <div className="group/player relative h-full w-full bg-black">
      <video
        ref={videoRef}
        src={src}
        muted={muted}
        loop
        playsInline
        preload="metadata"
        onClick={togglePlay}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onTimeUpdate={(e) => setProgress(e.currentTarget.currentTime)}
        className="h-full w-full cursor-pointer object-cover"
      />

      {/* Big play button in the center — visible when paused + fades in on hover when playing */}
      <button
        onClick={togglePlay}
        aria-label={playing ? "Pause" : "Play"}
        className="absolute inset-0 z-10 flex items-center justify-center transition-opacity duration-200"
        style={{ opacity: playing ? 0 : 1 }}
      >
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-md ring-1 ring-white/20 transition-transform hover:scale-110">
          <Play className="ml-0.5 h-5 w-5" fill="currentColor" />
        </span>
      </button>

      {/* Controls bar — hidden by default, shown on group hover */}
      <div className="absolute inset-x-0 bottom-0 z-20 flex flex-col gap-1.5 bg-gradient-to-t from-black/80 via-black/30 to-transparent px-3 pb-2 pt-8 opacity-0 transition-opacity duration-200 pointer-events-none group-hover/player:opacity-100 group-hover/player:pointer-events-auto">
        <div className="h-1 w-full cursor-pointer rounded-full bg-white/20" onClick={handleSeek}>
          <div className="h-full rounded-full bg-gradient-to-r from-red-500 via-rose-400 to-amber-300" style={{ width: `${pct}%`, boxShadow: "0 0 6px rgba(244,63,94,0.6)" }} />
        </div>

        <div className="flex items-center gap-2">
          <button onClick={(e) => { e.stopPropagation(); togglePlay(); }} aria-label={playing ? "Pause" : "Play"}
            className="flex h-7 w-7 items-center justify-center rounded-full text-white/90 transition-colors hover:text-white">
            {playing ? <Pause className="h-4 w-4" fill="currentColor" /> : <Play className="ml-0.5 h-4 w-4" fill="currentColor" />}
          </button>

          <div className="group/vol flex items-center gap-1">
            <button onClick={(e) => { e.stopPropagation(); const n = !muted; setMuted(n); if (videoRef.current) videoRef.current.muted = n; }}
              className="flex h-7 w-7 items-center justify-center rounded-full text-white/70 transition-colors hover:text-white">
              {muted || volume === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>
            <input type="range" min={0} max={1} step={0.05} value={muted ? 0 : volume}
              onChange={(e) => { const v = parseFloat(e.target.value); setVolume(v); setMuted(v === 0); if (videoRef.current) { videoRef.current.volume = v; videoRef.current.muted = v === 0; } }}
              className="h-1 w-0 cursor-pointer accent-red-500 transition-[width] duration-200 group-hover/vol:w-16" aria-label="Volume" />
          </div>

          <span className="ml-auto text-[10px] tabular-nums text-white/60">{fmt(progress)} / {fmt(duration)}</span>
        </div>
      </div>
    </div>
  );
}
