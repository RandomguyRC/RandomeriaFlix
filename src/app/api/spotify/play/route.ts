import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { decryptToken } from "@/lib/spotify-crypto";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { uris } = body;

  const config = await prisma.spotifyConfig.findUnique({ where: { id: "singleton" } });
  if (!config || !config.accessToken) {
    return NextResponse.json({ error: "Not connected" }, { status: 400 });
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

  const res = await fetch("https://api.spotify.com/v1/me/player/play", {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ uris }),
  });

  return NextResponse.json({ success: res.ok });
}
