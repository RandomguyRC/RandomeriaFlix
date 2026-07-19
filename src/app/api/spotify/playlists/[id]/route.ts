import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { decryptToken } from "@/lib/spotify-crypto";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const config = await prisma.spotifyConfig.findUnique({ where: { id: "singleton" } });
  if (!config || !config.isConnected || !config.accessToken) {
    return NextResponse.json({ tracks: [] });
  }

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

  const { id } = await params;
  const res = await fetch(`https://api.spotify.com/v1/playlists/${id}/tracks?limit=100`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();

  console.log("[Spotify] Playlist tracks response:", JSON.stringify({
    itemCount: data.items?.length,
    firstItem: data.items?.[0],
  }));

  const tracks = (data.items || [])
    .filter((item: any) => item.track)
    .map((item: any) => ({
      id: item.track.id,
      uri: item.track.uri,
      name: item.track.name,
      artist: item.track.artists?.[0]?.name || "Unknown",
      albumArt: item.track.album?.images?.[0]?.url || "",
    }));

  return NextResponse.json({ tracks });
}
