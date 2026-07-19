"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Music, Search, ListMusic, RotateCcw } from "lucide-react";

interface SpotifyPlayerProps {
  isReady: boolean;
  isPlaying: boolean;
  currentTrack: { name: string; artist: string; album: string; albumArt: string; duration: number } | null;
  position: number;
  volume: number;
  onPlay: () => void;
  onPause: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onSeek: (ms: number) => void;
  onVolumeChange: (vol: number) => void;
  onPlayTrack: (uri: string) => void;
}

export default function SpotifyPlayer({
  isReady,
  isPlaying,
  currentTrack,
  position,
  volume,
  onPlay,
  onPause,
  onNext,
  onPrevious,
  onSeek,
  onVolumeChange,
  onPlayTrack,
}: SpotifyPlayerProps) {
  const [expanded, setExpanded] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const prevVolumeRef = useRef(50);
  const [showLibrary, setShowLibrary] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState<any>(null);
  const [playlistTracks, setPlaylistTracks] = useState<any[]>([]);
  const progressRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didDrag = useRef(false);

  // Drag
  const dragRef = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0, ox: 0, oy: 0 });

  function handlePointerDown(e: React.PointerEvent) {
    isDragging.current = true;
    dragStart.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!isDragging.current) return;
    if (Math.abs(e.clientX - dragStart.current.x) > 3 || Math.abs(e.clientY - dragStart.current.y) > 3) {
      didDrag.current = true;
    }
    setOffset({
      x: dragStart.current.ox + (e.clientX - dragStart.current.x),
      y: Math.min(0, dragStart.current.oy + (e.clientY - dragStart.current.y)),
    });
  }

  function handlePointerUp() { isDragging.current = false; }

  function resetPosition() { setOffset({ x: 0, y: 0 }); }

  const progress = currentTrack?.duration ? (position / currentTrack.duration) * 100 : 0;

  // Close on click outside
  useEffect(() => {
    if (!expanded) return;
    function handleClick(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-island]")) {
        setExpanded(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [expanded]);

  function formatTime(ms: number) {
    const totalSec = Math.floor(ms / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  function handleProgressClick(e: React.MouseEvent) {
    if (!progressRef.current || !currentTrack?.duration) return;
    const rect = progressRef.current.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    onSeek(Math.round(pct * currentTrack.duration));
  }

  async function searchSpotify(q: string) {
    if (q.length < 2) { setSearchResults([]); return; }
    setSearching(true);
    try {
      const res = await fetch(`/api/spotify/search?q=${encodeURIComponent(q)}`);
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data.tracks || []);
      }
    } catch {}
    setSearching(false);
  }

  function handleSearch(e: React.ChangeEvent<HTMLInputElement>) {
    const q = e.target.value;
    setSearchQuery(q);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => searchSpotify(q), 400);
  }

  async function loadPlaylists() {
    try {
      const res = await fetch("/api/spotify/playlists");
      if (res.ok) {
        const data = await res.json();
        setPlaylists(data.playlists || []);
      }
    } catch {}
  }

  async function loadPlaylistTracks(playlistId: string) {
    try {
      const res = await fetch(`/api/spotify/playlists/${playlistId}`);
      if (res.ok) {
        const data = await res.json();
        setPlaylistTracks(data.tracks || []);
      }
    } catch {}
  }

  function toggleMute() {
    if (isMuted) {
      onVolumeChange(prevVolumeRef.current || 50);
      setIsMuted(false);
    } else {
      prevVolumeRef.current = volume;
      onVolumeChange(0);
      setIsMuted(true);
    }
  }

  if (!isReady) return null;

  return (
    <div
      ref={dragRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      data-island
      className="fixed bottom-8 z-50"
      style={{
        left: `calc(50% + ${offset.x}px)`,
        transform: `translateX(-50%) translateY(${offset.y}px)`,
        cursor: isDragging.current ? "grabbing" : "grab",
      }}
    >
      <AnimatePresence mode="wait">
        {expanded ? (
          /* ═══ EXPANDED — Dynamic Island ═══ */
          <motion.div
            key="expanded"
            initial={{ width: 60, height: 44, borderRadius: 22 }}
            animate={{ width: "min(340px, 92vw)", height: "auto", borderRadius: 20 }}
            exit={{ width: 60, height: 44, borderRadius: 22 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="overflow-hidden bg-black/90 backdrop-blur-xl border border-white/10 shadow-2xl"
          >
            {/* Progress bar at top */}
            <div className="h-0.5 w-full bg-white/10">
              <div
                className="h-full bg-red-500 transition-all duration-300"
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>

            <div className="p-4">
              {/* Top row: poster + info + close */}
              <div className="flex items-center gap-3 mb-3">
                {/* Album art */}
                <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg bg-gray-800">
                  {currentTrack?.albumArt ? (
                    <img src={currentTrack.albumArt} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-gray-600">
                      <Music className="h-5 w-5" />
                    </div>
                  )}
                </div>

                {/* Track info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">
                    {currentTrack?.name || "No track"}
                  </p>
                  <p className="text-xs text-gray-400 truncate">
                    {currentTrack?.artist || "—"}
                  </p>
                </div>

                {/* Close / Collapse */}
                <button
                  onClick={() => setExpanded(false)}
                  className="h-6 w-6 rounded-full bg-white/10 flex items-center justify-center text-gray-400 hover:text-white"
                >
                  <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 12 12">
                    <path d="M9.5 3.5L2.5 10.5M2.5 3.5l7 7" stroke="currentColor" strokeWidth="1.5" fill="none" />
                  </svg>
                </button>
              </div>

              {/* Progress bar — clickable */}
              <div
                ref={progressRef}
                className="relative h-1.5 w-full cursor-pointer rounded-full bg-white/10 mb-3"
                onClick={handleProgressClick}
              >
                <div
                  className="absolute left-0 top-0 h-full rounded-full bg-white/80"
                  style={{ width: `${Math.min(progress, 100)}%` }}
                />
                <div
                  className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white opacity-0 hover:opacity-100 transition-opacity"
                  style={{ left: `${Math.min(progress, 100)}%` }}
                />
              </div>

              {/* Time */}
              <div className="flex justify-between text-[10px] text-gray-500 mb-3">
                <span>{formatTime(position)}</span>
                <span>{formatTime(currentTrack?.duration || 0)}</span>
              </div>

              {/* Library / Search toggle */}
              <div className="flex gap-2 mb-3">
                <button
                  onClick={() => { setShowLibrary(!showLibrary); if (!showLibrary) loadPlaylists(); }}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-medium transition-colors ${
                    showLibrary ? "bg-white/15 text-white" : "text-gray-500 hover:text-gray-300"
                  }`}
                >
                  <ListMusic className="h-3.5 w-3.5" /> Library
                </button>
              </div>

              {/* Library panel */}
              {showLibrary && (
                <div className="mb-3 max-h-40 overflow-y-auto rounded-lg bg-white/5 p-2 scrollbar-hide">
                  {!selectedPlaylist ? (
                    // Playlist list
                    playlists.length === 0 ? (
                      <p className="py-2 text-center text-[11px] text-gray-500">No playlists found</p>
                    ) : (
                      playlists.map((pl: any) => (
                        <button
                          key={pl.id}
                          onClick={() => { setSelectedPlaylist(pl); loadPlaylistTracks(pl.id); }}
                          className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs text-gray-300 hover:bg-white/5"
                        >
                          {pl.images?.[0]?.url ? (
                            <img src={pl.images[0].url} alt="" className="h-8 w-8 rounded" />
                          ) : (
                            <div className="h-8 w-8 rounded bg-gray-700 flex items-center justify-center text-[10px]">🎵</div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="truncate font-medium text-white">{pl.name}</p>
                            <p className="truncate text-[10px] text-gray-500">{pl.tracks?.total ?? 0} tracks</p>
                          </div>
                        </button>
                      ))
                    )
                  ) : (
                    // Track list from selected playlist
                    <>
                      <button onClick={() => setSelectedPlaylist(null)}
                        className="mb-2 text-[11px] text-gray-500 hover:text-gray-300">
                        ← Back to playlists
                      </button>
                      {playlistTracks.map((track: any) => (
                        <button
                          key={track.id}
                          onClick={() => onPlayTrack(track.uri)}
                          className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs text-gray-300 hover:bg-white/5"
                        >
                          {track.albumArt ? (
                            <img src={track.albumArt} alt="" className="h-6 w-6 rounded" />
                          ) : (
                            <div className="h-6 w-6 rounded bg-gray-700" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="truncate text-white">{track.name}</p>
                            <p className="truncate text-[10px] text-gray-500">{track.artist}</p>
                          </div>
                        </button>
                      ))}
                    </>
                  )}
                </div>
              )}

              {/* Search input */}
              {!showLibrary && (
                <div className="mb-3">
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-500" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={handleSearch}
                      placeholder="Search Spotify..."
                      className="w-full rounded-lg bg-white/5 pl-7 pr-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-white/20"
                    />
                  </div>
                  {searchResults.length > 0 && (
                    <div className="mt-1 max-h-32 overflow-y-auto rounded-lg bg-white/5 p-1 scrollbar-hide">
                      {searchResults.map((track: any) => (
                        <button
                          key={track.id}
                          onClick={() => onPlayTrack(track.uri)}
                          className="flex w-full items-center gap-2 rounded-md px-2 py-1 text-left text-xs text-gray-300 hover:bg-white/5"
                        >
                          {track.albumArt ? (
                            <img src={track.albumArt} alt="" className="h-6 w-6 rounded" />
                          ) : (
                            <div className="h-6 w-6 rounded bg-gray-700" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="truncate text-white">{track.name}</p>
                            <p className="truncate text-[10px] text-gray-500">{track.artist}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  {searching && <p className="py-1 text-center text-[10px] text-gray-500">Searching...</p>}
                </div>
              )}

              {/* Controls */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-5">
                  <button onClick={onPrevious} className="text-gray-400 hover:text-white transition-colors">
                    <SkipBack className="h-4 w-4" />
                  </button>
                  <button
                    onClick={isPlaying ? onPause : onPlay}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-black hover:scale-105 transition-transform"
                  >
                    {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="ml-0.5 h-3.5 w-3.5" />}
                  </button>
                  <button onClick={onNext} className="text-gray-400 hover:text-white transition-colors">
                    <SkipForward className="h-4 w-4" />
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button onClick={toggleMute} className="text-gray-400 hover:text-white">
                    {isMuted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
                  </button>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={volume}
                    onChange={(e) => onVolumeChange(Number(e.target.value))}
                    className="w-14 h-1 accent-white cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          /* ═══ COLLAPSED — Pill ═══ */
          <motion.div
            key="collapsed"
            initial={{ width: 340, height: "auto", borderRadius: 20 }}
            animate={{ width: "min(220px, 80vw)", height: 44, borderRadius: 22 }}
            exit={{ width: 340, height: "auto", borderRadius: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="cursor-pointer overflow-hidden bg-black/90 backdrop-blur-xl border border-white/10 shadow-2xl flex items-center px-2 gap-2"
            onClick={() => { if (!didDrag.current) setExpanded(true); }}
            onPointerDown={() => { didDrag.current = false; }}
          >
            {/* Mini album art */}
            <div className="h-8 w-8 flex-shrink-0 overflow-hidden rounded-full bg-gray-800">
              {currentTrack?.albumArt ? (
                <img src={currentTrack.albumArt} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full flex items-center justify-center text-gray-600">
                  <Music className="h-3.5 w-3.5" />
                </div>
              )}
            </div>

            {/* Track name */}
            <p className="flex-1 text-xs font-medium text-white truncate">
              {currentTrack?.name || "No track"}
            </p>

            {/* Play/Pause */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                isPlaying ? onPause() : onPlay();
              }}
              className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
            >
              {isPlaying ? <Pause className="h-3 w-3" /> : <Play className="ml-0.5 h-3 w-3" />}
            </button>

            {/* Reset position */}
            {(offset.x !== 0 || offset.y !== 0) && (
              <button
                onClick={(e) => { e.stopPropagation(); resetPosition(); }}
                onPointerDown={(e) => e.stopPropagation()}
                className="flex-shrink-0 text-gray-500 hover:text-white"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
