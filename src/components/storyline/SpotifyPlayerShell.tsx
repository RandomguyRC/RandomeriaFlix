"use client";

import { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { Music } from "lucide-react";
import { useSpotifyPlayer } from "@/components/storyline/hooks/useSpotifyPlayer";
import SpotifyPlayer from "@/components/storyline/SpotifyPlayer";

const ALLOWED_TABS = ["memories", "stickers", "chat", "book", "storyline"];

export default function SpotifyPlayerShell() {
  const pathname = usePathname();
  const [token, setToken] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    async function checkSpotify() {
      try {
        const res = await fetch("/api/spotify");
        if (res.ok) {
          const data = await res.json();
          setConnected(data.connected);
          setToken(data.accessToken || null);
        }
      } catch {}
    }
    checkSpotify();
  }, []);

  const player = useSpotifyPlayer(token);

  // Pause music when navigating away from allowed tabs
  const pathParts = pathname.split("/").filter(Boolean);
  const currentTab = pathParts[pathParts.length - 1];
  const wasVisibleRef = useRef(ALLOWED_TABS.includes(currentTab));

  useEffect(() => {
    const isVisible = ALLOWED_TABS.includes(currentTab);
    if (wasVisibleRef.current && !isVisible) {
      player.pause();
    }
    wasVisibleRef.current = isVisible;
  }, [currentTab, player]);

  if (!ALLOWED_TABS.includes(currentTab)) return null;

  if (!connected) {
    return (
      <div className="fixed bottom-8 left-1/2 z-50 -translate-x-1/2 rounded-[22px] bg-black/90 backdrop-blur-xl border border-white/10 px-4 py-2.5 text-xs text-gray-500">
        <Music className="inline h-3.5 w-3.5 mr-1.5" />
        Spotify not configured by administrator
      </div>
    );
  }

  return (
    <SpotifyPlayer
      isReady={true}
      isPlaying={player.isPlaying}
      currentTrack={player.currentTrack}
      position={player.position}
      volume={player.volume}
      onPlay={player.play}
      onPause={player.pause}
      onNext={player.next}
      onPrevious={player.previous}
      onSeek={player.seek}
      onVolumeChange={player.setVolume}
      onPlayTrack={player.playTrack}
    />
  );
}
