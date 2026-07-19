import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { encryptToken } from "@/lib/spotify-crypto";

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID || "";
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET || "";
const REDIRECT_URI = process.env.SPOTIFY_REDIRECT_URI || "http://127.0.0.1:3000/api/spotify/callback";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error || !code) {
    return NextResponse.redirect(new URL("/admin/settings?spotify=error", request.url));
  }

  try {
    // Exchange code for tokens
    const tokenResponse = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString("base64")}`,
      },
      body: `grant_type=authorization_code&code=${code}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}`,
    });

    const tokenData = await tokenResponse.json();
    if (!tokenData.access_token || !tokenData.refresh_token) {
      return NextResponse.redirect(new URL("/admin/settings?spotify=token_error", request.url));
    }

    // Get user profile
    const profileResponse = await fetch("https://api.spotify.com/v1/me", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const profileData = await profileResponse.json();

    // Encrypt and save refresh token
    const encryptedRefresh = encryptToken(tokenData.refresh_token);

    await prisma.spotifyConfig.upsert({
      where: { id: "singleton" },
      update: {
        accessToken: tokenData.access_token,
        refreshToken: encryptedRefresh,
        expiresAt: new Date(Date.now() + tokenData.expires_in * 1000),
        accountName: profileData.display_name || "Spotify User",
        isConnected: true,
      },
      create: {
        id: "singleton",
        accessToken: tokenData.access_token,
        refreshToken: encryptedRefresh,
        expiresAt: new Date(Date.now() + tokenData.expires_in * 1000),
        accountName: profileData.display_name || "Spotify User",
        isConnected: true,
      },
    });

    // Verify DB write before redirecting
    const verify = await prisma.spotifyConfig.findUnique({ where: { id: "singleton" } });
    if (!verify?.isConnected || !verify?.refreshToken) {
      return NextResponse.redirect(new URL("/admin/settings?spotify=error", request.url));
    }

    return NextResponse.redirect(new URL("/admin/settings?spotify=connected", request.url));
  } catch (err) {
    console.error("Spotify callback error:", err);
    return NextResponse.redirect(new URL("/admin/settings?spotify=error", request.url));
  }
}
