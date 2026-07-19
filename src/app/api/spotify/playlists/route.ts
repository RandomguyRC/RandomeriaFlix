import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { decryptToken } from "@/lib/spotify-crypto";

export async function GET() {
  const config = await prisma.spotifyConfig.findUnique({ where: { id: "singleton" } });
  if (!config || !config.isConnected || !config.accessToken) {
    return NextResponse.json({ playlists: [] });
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

  const res = await fetch("https://api.spotify.com/v1/me/playlists?limit=50&fields=items(id,name,images,tracks.total)", {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();

  // Log first playlist structure to debug
  if (data.items?.length > 0) {
    console.log("[Spotify] First playlist structure:", JSON.stringify({
      name: data.items[0].name,
      tracks: data.items[0].tracks,
    }));
  }

  const playlists = (data.items || []).map((p: any) => ({
    id: p.id,
    name: p.name,
    images: p.images,
    tracks: {
      total: p.tracks?.total ?? 0,
    },
  }));

  console.log("[Spotify Playlists]", playlists.length, "playlists");

  return NextResponse.json({ playlists });
}
