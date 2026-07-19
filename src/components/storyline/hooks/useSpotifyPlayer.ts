"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface SpotifyTrack {
  id: string;
  name: string;
  artist: string;
  album: string;
  albumArt: string;
  duration: number;
}

interface UseSpotifyPlayerReturn {
  isReady: boolean;
  isPlaying: boolean;
  currentTrack: SpotifyTrack | null;
  position: number;
  volume: number;
  play: () => void;
  pause: () => void;
  next: () => void;
  previous: () => void;
  seek: (positionMs: number) => void;
  setVolume: (vol: number) => void;
  playTrack: (trackUri: string) => void;
}

export function useSpotifyPlayer(accessToken: string | null): UseSpotifyPlayerReturn {
  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrack, setCurrentTrack] = useState<SpotifyTrack | null>(null);
  const [position, setPosition] = useState(0);
  const [volume, setVolumeState] = useState(50);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const playerRef = useRef<any>(null);
  const intervalRef = useRef<any>(null);
  const tokenRef = useRef(accessToken);
  const mountedRef = useRef(true);
  tokenRef.current = accessToken;

  useEffect(() => {
    return () => { mountedRef.current = false; };
  }, []);

  // Initialize Spotify Web Playback SDK
  useEffect(() => {
    if (!accessToken) return;

    console.log("[Spotify] Loading Web Playback SDK...");

    // Set handler BEFORE loading script to avoid race condition
    (window as any).onSpotifyWebPlaybackSDKReady = () => {
      console.log("[Spotify] SDK loaded, creating player...");

      const player = new (window as any).Spotify.Player({
        name: "RandomeriaFlix",
        getOAuthToken: (cb: (token: string) => void) => cb(tokenRef.current || ""),
        volume: 0.5,
      });

      player.addListener("ready", async ({ device_id }: string) => {
        console.log("[Spotify] Player ready, device_id:", device_id);
        setDeviceId(device_id);
        setIsReady(true);

        // Transfer playback to browser device
        try {
          const res = await fetch("https://api.spotify.com/v1/me/player", {
            method: "PUT",
            headers: {
              Authorization: `Bearer ${tokenRef.current}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ device_ids: [device_id], play: false }),
          });
          console.log("[Spotify] Transfer playback:", res.status);
        } catch (err) {
          console.error("[Spotify] Transfer failed:", err);
        }
      });

      player.addListener("player_state_changed", (state: any) => {
        if (!state || !mountedRef.current) return;
        const track = state.track_window?.current_track;
        if (track) {
          setCurrentTrack({
            id: track.id,
            name: track.name,
            artist: track.artists?.[0]?.name || "Unknown",
            album: track.album?.name || "Unknown",
            albumArt: track.album?.images?.[0]?.url || "",
            duration: track.duration_ms || 0,
          });
        }
        setIsPlaying(!state.paused);
        setPosition(state.position || 0);
      });

      player.addListener("playback_error", ({ message }: any) => {
        console.error("[Spotify] Playback error:", message);
      });

      player.addListener("authentication_error", ({ message }: any) => {
        console.error("[Spotify] Auth error:", message);
      });

      player.addListener("account_error", ({ message }: any) => {
        console.error("[Spotify] Account error:", message);
      });

      player.connect().then((success: boolean) => {
        console.log("[Spotify] Connected:", success);
      });

      playerRef.current = player;
    };

    // Load script AFTER setting handler to avoid race condition
    const script = document.createElement("script");
    script.src = "https://sdk.scdn.co/spotify-player.js";
    script.async = true;
    document.body.appendChild(script);

    return () => {
      if (playerRef.current) {
        playerRef.current.disconnect();
      }
    };
  }, [accessToken]);

  // Poll playback state every 3s
  const lastInteractionRef = useRef(0);

  useEffect(() => {
    if (!accessToken) return;

    async function poll() {
      if (Date.now() - lastInteractionRef.current < 1000) return;
      try {
        const res = await fetch("https://api.spotify.com/v1/me/player", {
          headers: { Authorization: `Bearer ${tokenRef.current}` },
        });
        if (!res.ok) return;
        const state = await res.json();
        if (!state) return;

        const track = state.item;
        if (track) {
          setCurrentTrack({
            id: track.id,
            name: track.name,
            artist: track.artists?.[0]?.name || "Unknown",
            album: track.album?.name || "Unknown",
            albumArt: track.album?.images?.[0]?.url || "",
            duration: track.duration_ms || 0,
          });
          setPosition(state.progress_ms || 0);
          setIsPlaying(!!state.is_playing);
          setVolumeState(Math.round(state.device?.volume_percent || 50));
        }
        setIsReady(true);
      } catch {}
    }

    poll();
    const pollInterval = setInterval(poll, 3000);
    return () => clearInterval(pollInterval);
  }, [accessToken]);

  // Position tick — interpolate between polls, clamped to track duration
  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        setPosition((p) => {
          const max = currentTrack?.duration || 0;
          return Math.min(p + 1000, max); // +1000ms = 1 second
        });
      }, 1000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [isPlaying, currentTrack?.duration]);

  const apiCall = useCallback(async (method: string, path: string, body?: any) => {
    try {
      const separator = path.includes("?") ? "&" : "?";
      const devicePath = deviceId ? `${path}${separator}device_id=${deviceId}` : path;
      const res = await fetch(`https://api.spotify.com/v1${devicePath}`, {
        method,
        headers: {
          Authorization: `Bearer ${tokenRef.current}`,
          ...(body ? { "Content-Type": "application/json" } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
      });
      console.log("[Spotify] API:", method, path, "->", res.status);
    } catch (err) {
      console.error("[Spotify] API call failed:", err);
    }
  }, [deviceId]);

  const play = useCallback(() => {
    lastInteractionRef.current = Date.now();
    setIsPlaying(true);
    apiCall("PUT", "/me/player/play");
  }, [apiCall]);

  const pause = useCallback(() => {
    lastInteractionRef.current = Date.now();
    setIsPlaying(false);
    apiCall("PUT", "/me/player/pause");
  }, [apiCall]);

  const next = useCallback(() => apiCall("POST", "/me/player/next"), [apiCall]);
  const previous = useCallback(() => apiCall("POST", "/me/player/previous"), [apiCall]);

  const seek = useCallback((positionMs: number) => {
    lastInteractionRef.current = Date.now();
    setPosition(positionMs);
    // Use direct fetch to ensure device_id is included
    const url = deviceId
      ? `https://api.spotify.com/v1/me/player/seek?position_ms=${positionMs}&device_id=${deviceId}`
      : `https://api.spotify.com/v1/me/player/seek?position_ms=${positionMs}`;
    fetch(url, {
      method: "PUT",
      headers: { Authorization: `Bearer ${tokenRef.current}` },
    }).then((res) => console.log("[Spotify] Seek:", res.status)).catch(console.error);
  }, [deviceId]);

  const setVolume = useCallback((vol: number) => {
    setVolumeState(vol);
    apiCall("PUT", `/me/player/volume?volume_percent=${vol}`);
  }, [apiCall]);

  const playTrack = useCallback(async (trackUri: string) => {
    if (!deviceId) {
      console.warn("[Spotify] No device_id yet, cannot play");
      return;
    }

    lastInteractionRef.current = Date.now();
    setIsPlaying(true);
    apiCall("PUT", "/me/player/play", { uris: [trackUri] });
  }, [apiCall, deviceId]);

  return {
    isReady,
    isPlaying,
    currentTrack,
    position,
    volume,
    play,
    pause,
    next,
    previous,
    seek,
    setVolume,
    playTrack,
  };
}
