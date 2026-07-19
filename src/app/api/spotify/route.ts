import { NextRequest, NextResponse } from "next/server";
import { readSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { decryptToken } from "@/lib/spotify-crypto";

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID || "";
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET || "";
const REDIRECT_URI = process.env.SPOTIFY_REDIRECT_URI || "http://127.0.0.1:3000/api/spotify/callback";
const SCOPES = "streaming user-read-email user-read-private user-read-playback-state user-modify-playback-state user-read-currently-playing playlist-read-private playlist-read-collaborative";

// GET — status + access token
export async function GET(request: NextRequest) {
  const session = await readSession();
  if (!session) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const config = await prisma.spotifyConfig.findUnique({ where: { id: "singleton" } });

  if (!config || !config.isConnected || !config.refreshToken) {
    return NextResponse.json({ connected: false });
  }

  let accessToken = config.accessToken;

  // Auto-refresh if expired
  if (config.expiresAt && new Date(config.expiresAt) < new Date()) {
    try {
      const decryptedRefresh = decryptToken(config.refreshToken);
      accessToken = await refreshAccessToken(decryptedRefresh);
    } catch {
      return NextResponse.json({ connected: false, error: "Token refresh failed" });
    }
  }

  return NextResponse.json({
    connected: true,
    accessToken,
    accountName: config.accountName,
  });
}

// POST — start OAuth
export async function POST() {
  const session = await readSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!SPOTIFY_CLIENT_ID) {
    return NextResponse.json(
      { error: "Set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET in .env" },
      { status: 400 }
    );
  }

  const state = Math.random().toString(36).substring(2);
  // show_dialog=true forces Spotify to show the authorization page again
  // This ensures the new scopes are granted
  const authUrl = `https://accounts.spotify.com/authorize?client_id=${SPOTIFY_CLIENT_ID}&response_type=code&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=${encodeURIComponent(SCOPES)}&state=${state}&show_dialog=true`;

  return NextResponse.json({ authUrl });
}

// DELETE — disconnect
export async function DELETE() {
  const session = await readSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await prisma.spotifyConfig.update({
    where: { id: "singleton" },
    data: { isConnected: false, accessToken: null, refreshToken: null, expiresAt: null, accountName: null },
  });

  return NextResponse.json({ message: "Disconnected" });
}

async function refreshAccessToken(refreshToken: string): Promise<string | null> {
  try {
    const response = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString("base64")}`,
      },
      body: `grant_type=refresh_token&refresh_token=${refreshToken}`,
    });

    const data = await response.json();
    if (data.access_token) {
      const expiresAt = new Date(Date.now() + data.expires_in * 1000);
      await prisma.spotifyConfig.update({
        where: { id: "singleton" },
        data: { accessToken: data.access_token, expiresAt },
      });
      return data.access_token;
    }
    return null;
  } catch {
    return null;
  }
}
