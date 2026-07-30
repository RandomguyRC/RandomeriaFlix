"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Music } from "lucide-react";
import { useSpotifyPlayer } from "@/components/storyline/hooks/useSpotifyPlayer";
import SpotifyPlayer from "@/components/storyline/SpotifyPlayer";

export default function SpotifyPlayerShell() {
  const pathname = usePathname();
  const [token, setToken] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [enabledPages, setEnabledPages] = useState<string[] | null>(null);

  useEffect(() => {
    async function checkSpotify() {
      try {
        const res = await fetch("/api/spotify");
        if (res.ok) {
          const data = await res.json();
          setConnected(data.connected);
          setToken(data.accessToken || null);
          setEnabledPages(Array.isArray(data.enabledPages) ? data.enabledPages : []);
        }
      } catch {}
    }
    checkSpotify();
  }, []);

  // Determine current page key. "" (root of the profile) maps to "home",
  // matching the NavTab slug convention used elsewhere in the app.
  const pathParts = pathname.split("/").filter(Boolean);
  // pathParts looks like ["watch", "<profileslug>", ...rest]
  const rest = pathParts.slice(2);
  const currentTab = rest.length === 0 ? "home" : rest[rest.length - 1];

  const isPageEnabled = !!enabledPages && enabledPages.includes(currentTab);

  // Only ever hand a real token to the player hook on pages the admin has
  // enabled. On every other page this is null, so the Web Playback SDK is
  // never loaded/connected there at all — no lingering "active device",
  // nothing to pause, nothing running in the background.
  const effectiveToken = isPageEnabled ? token : null;
  const player = useSpotifyPlayer(effectiveToken);

  // Still loading the config — render nothing rather than flashing the widget.
  if (enabledPages === null) return null;

  if (!isPageEnabled) return null;

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
