"use client";

import { useState, useEffect } from "react";
import { Save, Loader2, Check, Music, Link, Unlink, Upload, X } from "lucide-react";

const DEFAULT_SETTINGS: Record<string, { label: string; type: string; default: string; description: string }> = {
  slideshowInterval: {
    label: "Slideshow Interval (seconds)",
    type: "number",
    default: "10",
    description: "How long each featured image displays in the hero banner before switching",
  },
  appName: {
    label: "App Name",
    type: "text",
    default: "RandomeriaFlix",
    description: "The name shown in the UI and browser tab",
  },
  randomDescription: {
    label: "Random Bubble Description",
    type: "text",
    default: "",
    description: "Description shown when clicking the Random bubble in Memory Universe",
  },
  cherryDescription: {
    label: "Cherry Bubble Description",
    type: "text",
    default: "",
    description: "Description shown when clicking the Cherry bubble in Memory Universe",
  },
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Spotify state
  const [spotifyConnected, setSpotifyConnected] = useState(false);
  const [spotifyAccount, setSpotifyAccount] = useState("");
  const [spotifyLoading, setSpotifyLoading] = useState(true);
  const [connectingSpotify, setConnectingSpotify] = useState(false);
  const [spotifyError, setSpotifyError] = useState("");
  const [chatBg, setChatBg] = useState<string | null>(null);
  const [chatBgY, setChatBgY] = useState(50);
  const [uploadingBg, setUploadingBg] = useState(false);

  useEffect(() => {
    // Check URL params for connection status
    const params = new URLSearchParams(window.location.search);
    if (params.get("spotify") === "connected") {
      setSpotifyConnected(true);
    }
    if (params.get("spotify") === "error") {
      setSpotifyError("Connection failed. Check your Client ID and Secret.");
    }

    fetchSpotifyStatus();
    fetchChatBg();
  }, []);

  async function fetchSpotifyStatus() {
    try {
      const res = await fetch("/api/spotify");
      if (res.ok) {
        const data = await res.json();
        setSpotifyConnected(data.connected);
        setSpotifyAccount(data.accountName || "");
      }
    } catch {}
    setSpotifyLoading(false);
  }

  async function connectSpotify() {
    setConnectingSpotify(true);
    try {
      const res = await fetch("/api/spotify", { method: "POST" });
      if (res.ok) {
        const { authUrl } = await res.json();
        window.location.href = authUrl;
      }
    } catch {}
    setConnectingSpotify(false);
  }

  async function disconnectSpotify() {
    if (!confirm("Disconnect Spotify?")) return;
    await fetch("/api/spotify", { method: "DELETE" });
    setSpotifyConnected(false);
    setSpotifyAccount("");
  }

  async function fetchChatBg() {
    try {
      const res = await fetch("/api/admin/settings");
      if (res.ok) {
        const data = await res.json();
        if (data.chatBackground) setChatBg(`/api/media/${data.chatBackground}`);
        if (data.chatBackgroundY) setChatBgY(Number(data.chatBackgroundY));
      }
    } catch {}
  }

  async function handleChatBgUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingBg(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const uploadRes = await fetch("/api/admin/upload", { method: "POST", body: formData });
      if (uploadRes.ok) {
        const data = await uploadRes.json();
        await fetch("/api/admin/settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chatBackground: data.id }),
        });
        setChatBg(`/api/media/${data.id}`);
      }
    } finally {
      setUploadingBg(false);
    }
  }

  async function removeChatBg() {
    await fetch("/api/admin/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chatBackground: "", chatBackgroundY: "50" }),
    });
    setChatBg(null);
    setChatBgY(50);
  }

  function handleBgYChange(value: number) {
    setChatBgY(value);
    // Auto-save position
    fetch("/api/admin/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chatBackgroundY: String(value) }),
    });
  }
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((data) => {
        // Merge with defaults
        const merged: Record<string, string> = {};
        for (const [key, config] of Object.entries(DEFAULT_SETTINGS)) {
          merged[key] = data[key] || config.default;
        }
        setSettings(merged);
        setLoading(false);
      });
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-red-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-white">Settings</h1>
        <p className="mt-2 text-gray-400">Configure your RandomeriaFlix site</p>
      </div>

      <div className="space-y-6">
        {Object.entries(DEFAULT_SETTINGS).map(([key, config]) => (
          <div key={key}>
            <label className="mb-1 block text-sm font-medium text-gray-300">{config.label}</label>
            <p className="mb-2 text-xs text-gray-500">{config.description}</p>
            <input
              type={config.type}
              value={settings[key] || config.default}
              onChange={(e) => setSettings({ ...settings, [key]: e.target.value })}
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 text-white focus:border-red-500 focus:outline-none"
            />
          </div>
        ))}
      </div>

      {/* Chat Background */}
      <div className="mt-10 rounded-xl border border-gray-800 bg-gray-900 p-6">
        <div className="mb-4 flex items-center gap-3">
          <span className="text-lg">💬</span>
          <h2 className="text-lg font-semibold text-white">Chat Background</h2>
        </div>
        <p className="mb-4 text-sm text-gray-400">
          Set a custom background image for the Chat History page.
        </p>

        {chatBg && (
          <>
            <div className="mb-4 relative h-32 overflow-hidden rounded-lg">
              <img src={chatBg} alt="Chat background"
                className="h-full w-full object-cover"
                style={{ objectPosition: `50% ${chatBgY}%` }}
              />
              <button
                onClick={removeChatBg}
                className="absolute top-2 right-2 rounded-full bg-black/60 p-1.5 text-white backdrop-blur-sm hover:bg-black/80"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-400 w-20">Position</span>
              <input
                type="range"
                min={0}
                max={100}
                value={chatBgY}
                onChange={(e) => handleBgYChange(Number(e.target.value))}
                className="flex-1 accent-red-500"
              />
              <span className="text-xs text-gray-500 w-10">{chatBgY}%</span>
            </div>
          </>
        )}

        <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-700 bg-gray-800/50 px-6 py-4 text-sm text-gray-400 transition-colors hover:border-gray-600 hover:text-gray-300">
          <Upload className="h-4 w-4" />
          {uploadingBg ? "Uploading..." : chatBg ? "Change background" : "Choose background image..."}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleChatBgUpload}
            disabled={uploadingBg}
          />
        </label>
      </div>

      {/* Spotify Section */}
      <div className="mt-10 rounded-xl border border-gray-800 bg-gray-900 p-6">
        <div className="mb-4 flex items-center gap-3">
          <Music className="h-5 w-5 text-green-400" />
          <h2 className="text-lg font-semibold text-white">Spotify</h2>
        </div>
        <p className="mb-4 text-sm text-gray-400">
          Connect a Spotify Premium account to play music on the Storyline page.
          This is a one-time setup — viewers don&apos;t need Spotify.
        </p>

        {spotifyError && (
          <div className="mb-4 rounded-lg bg-red-900/20 border border-red-500/20 px-4 py-3 text-sm text-red-300">
            {spotifyError}
          </div>
        )}

        {spotifyLoading ? (
          <Loader2 className="h-5 w-5 animate-spin text-gray-500" />
        ) : spotifyConnected ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 rounded-lg bg-green-900/20 px-4 py-3">
              <div className="h-2 w-2 rounded-full bg-green-400" />
              <span className="text-sm text-green-300">Connected</span>
              {spotifyAccount && (
                <span className="text-sm text-gray-400">— {spotifyAccount}</span>
              )}
            </div>
            <div className="flex flex-wrap gap-3">
              <button onClick={connectSpotify} disabled={connectingSpotify}
                className="flex items-center gap-2 rounded-lg bg-gray-800 px-4 py-2.5 text-sm font-medium text-gray-300 transition-colors hover:bg-gray-700 hover:text-white disabled:opacity-50">
                <Link className="h-4 w-4" /> Reconnect
              </button>
              <button onClick={disconnectSpotify}
                className="flex items-center gap-2 rounded-lg bg-gray-800 px-4 py-2.5 text-sm font-medium text-gray-300 transition-colors hover:bg-red-900/50 hover:text-red-400">
                <Unlink className="h-4 w-4" /> Disconnect
              </button>
            </div>
          </div>
        ) : (
          <button onClick={connectSpotify} disabled={connectingSpotify}
            className="flex items-center gap-2 rounded-lg bg-[#1DB954] px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-[#1ed760] disabled:opacity-50">
            {connectingSpotify ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link className="h-4 w-4" />}
            Connect Spotify
          </button>
        )}
      </div>

      <div className="mt-8">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 rounded-lg bg-red-600 px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-red-700 disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
          {saving ? "Saving..." : saved ? "Saved!" : "Save Settings"}
        </button>
      </div>
    </div>
  );
}
