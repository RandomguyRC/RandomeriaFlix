import { NextRequest, NextResponse } from "next/server";
import { readSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { decryptToken } from "@/lib/spotify-crypto";

export async function GET(request: NextRequest) {
  const session = await readSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");

  if (!query || query.length < 2) {
    return NextResponse.json({ tracks: [] });
  }

  const config = await prisma.spotifyConfig.findUnique({ where: { id: "singleton" } });
  if (!config || !config.isConnected || !config.accessToken) {
    return NextResponse.json({ error: "Spotify not connected" }, { status: 400 });
  }

  // Refresh token if needed
  let token = config.accessToken;
  if (config.expiresAt && new Date(config.expiresAt) < new Date()) {
    try {
      const decryptedRefresh = decryptToken(config.refreshToken!);
      const response = await fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${Buffer.from(`${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`).toString("base64")}`,
        },
        body: `grant_type=refresh_token&refresh_token=${decryptedRefresh}`,
      });
      const data = await response.json();
      if (data.access_token) {
        token = data.access_token;
        await prisma.spotifyConfig.update({
          where: { id: "singleton" },
          data: { accessToken: token, expiresAt: new Date(Date.now() + data.expires_in * 1000) },
        });
      }
    } catch {}
  }

  // Search Spotify
  const searchResponse = await fetch(
    `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=10`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  const searchData = await searchResponse.json();
  const tracks = (searchData.tracks?.items || []).map((track: any) => ({
    id: track.id,
    uri: track.uri,
    name: track.name,
    artist: track.artists?.[0]?.name || "Unknown",
    album: track.album?.name || "Unknown",
    albumArt: track.album?.images?.[0]?.url || "",
    duration: track.duration_ms,
  }));

  return NextResponse.json({ tracks });
}
