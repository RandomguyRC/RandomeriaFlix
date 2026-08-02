"use client";

import { useState, useEffect } from "react";
import { Save, Loader2, Check, Music, Link, Unlink, Upload, X, Send, Mail, Bell, BellOff, Eye, EyeOff } from "lucide-react";
import InstallAppCard from "@/components/settings/InstallAppCard";

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

function ToggleSwitch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`flex items-center gap-3 rounded-lg border px-4 py-3 transition-colors ${
        checked ? "border-red-500/40 bg-red-900/10" : "border-gray-800 bg-gray-800/50"
      }`}
    >
      <span
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
          checked ? "bg-red-600" : "bg-gray-700"
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
            checked ? "translate-x-5" : "translate-x-0.5"
          }`}
        />
      </span>
      <span className="flex items-center gap-2 text-sm font-medium text-white">
        {checked ? <Bell className="h-4 w-4 text-red-400" /> : <BellOff className="h-4 w-4 text-gray-500" />}
        {label}
      </span>
    </button>
  );
}

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
  const [chatStartDate, setChatStartDate] = useState("");
  const [savingStartDate, setSavingStartDate] = useState(false);

  // Spotify page-visibility state
  const [availablePages, setAvailablePages] = useState<{ slug: string; label: string }[]>([]);
  const [enabledPages, setEnabledPages] = useState<string[]>([]);
  const [savingPages, setSavingPages] = useState(false);
  const [savedPages, setSavedPages] = useState(false);

  // Notification settings (Telegram + email, per role)
  const [notifyAdminEnabled, setNotifyAdminEnabled] = useState(false);
  const [notifyAdminTelegramChatId, setNotifyAdminTelegramChatId] = useState("");
  const [notifyAdminEmail, setNotifyAdminEmail] = useState("");
  const [notifyViewerEnabled, setNotifyViewerEnabled] = useState(false);
  const [notifyViewerTelegramChatId, setNotifyViewerTelegramChatId] = useState("");
  const [notifyViewerEmail, setNotifyViewerEmail] = useState("");
  const [telegramBotUsername, setTelegramBotUsername] = useState("");
  const [savingNotify, setSavingNotify] = useState(false);
  const [savedNotify, setSavedNotify] = useState(false);

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
    fetchNavTabs();
  }, []);

  async function fetchSpotifyStatus() {
    try {
      const res = await fetch("/api/spotify");
      if (res.ok) {
        const data = await res.json();
        setSpotifyConnected(data.connected);
        setSpotifyAccount(data.accountName || "");
        setEnabledPages(Array.isArray(data.enabledPages) ? data.enabledPages : []);
      }
    } catch {}
    setSpotifyLoading(false);
  }

  async function fetchNavTabs() {
    try {
      const res = await fetch("/api/admin/nav-tabs");
      if (res.ok) {
        const tabs = await res.json();
        setAvailablePages(tabs.map((t: any) => ({ slug: t.slug, label: t.label })));
      }
    } catch {}
  }

  function togglePage(slug: string) {
    setEnabledPages((prev) =>
      prev.includes(slug) ? prev.filter((p) => p !== slug) : [...prev, slug]
    );
  }

  async function saveEnabledPages() {
    setSavingPages(true);
    try {
      await fetch("/api/spotify", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabledPages }),
      });
      setSavedPages(true);
      setTimeout(() => setSavedPages(false), 2000);
    } finally {
      setSavingPages(false);
    }
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
        if (data.chatStartDate) setChatStartDate(data.chatStartDate);

        setNotifyAdminEnabled(data.notifyAdminEnabled === "true");
        setNotifyAdminTelegramChatId(data.notifyAdminTelegramChatId || "");
        setNotifyAdminEmail(data.notifyAdminEmail || "");
        setNotifyViewerEnabled(data.notifyViewerEnabled === "true");
        setNotifyViewerTelegramChatId(data.notifyViewerTelegramChatId || "");
        setNotifyViewerEmail(data.notifyViewerEmail || "");
        setTelegramBotUsername(data.telegramBotUsername || "randomeria_bot");
      }
    } catch {}
  }

  async function saveNotifySettings() {
    setSavingNotify(true);
    try {
      await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notifyAdminEnabled: String(notifyAdminEnabled),
          notifyAdminTelegramChatId,
          notifyAdminEmail,
          notifyViewerEnabled: String(notifyViewerEnabled),
          notifyViewerTelegramChatId,
          notifyViewerEmail,
          telegramBotUsername,
        }),
      });
      setSavedNotify(true);
      setTimeout(() => setSavedNotify(false), 2000);
    } finally {
      setSavingNotify(false);
    }
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

  async function saveChatStartDate(value: string) {
    setChatStartDate(value);
    setSavingStartDate(true);
    try {
      await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatStartDate: value }),
      });
    } finally {
      setSavingStartDate(false);
    }
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

      {/* Chat History */}
      <div className="mt-10 rounded-xl border border-gray-800 bg-gray-900 p-6">
        <div className="mb-4 flex items-center gap-3">
          <span className="text-lg">💬</span>
          <h2 className="text-lg font-semibold text-white">Chat History</h2>
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

        {/* Chat History Start Date */}
        <div className="mt-6 border-t border-gray-800 pt-5">
          <h3 className="mb-1 text-sm font-semibold text-white">Chat History Start Date</h3>
          <p className="mb-4 text-xs text-gray-500">
            When someone opens Chat History, it lands here instead of at the very latest
            message — they can still scroll up for earlier history or down toward today.
            Leave blank to always open at the most recent message.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="date"
              value={chatStartDate}
              onChange={(e) => saveChatStartDate(e.target.value)}
              className="rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 text-white focus:border-red-500 focus:outline-none"
            />
            {chatStartDate && (
              <button
                onClick={() => saveChatStartDate("")}
                className="flex items-center gap-1.5 rounded-lg border border-gray-700 px-3 py-2.5 text-xs text-gray-300 hover:bg-gray-800"
              >
                <X className="h-3.5 w-3.5" /> Clear
              </button>
            )}
            {savingStartDate && <Loader2 className="h-4 w-4 animate-spin text-gray-500" />}
          </div>
          {chatStartDate && (
            <p className="mt-2 text-[11px] text-gray-500">
              If there are no messages on or after this date, it falls back to showing the latest messages.
            </p>
          )}
        </div>
      </div>

      {/* Notifications Section */}
      <div className="mt-10 rounded-xl border border-gray-800 bg-gray-900 p-6">
        <div className="mb-4 flex items-center gap-3">
          <Send className="h-5 w-5 text-sky-400" />
          <h2 className="text-lg font-semibold text-white">Chat Notifications</h2>
        </div>
        <p className="mb-6 text-sm text-gray-400">
          Get pinged on Telegram and/or email whenever a new live chat message comes in.
          Note this is a <span className="text-gray-300">Telegram Chat ID</span>, not a phone
          number — message{" "}
          <a
            href="https://t.me/userinfobot"
            target="_blank"
            rel="noreferrer"
            className="text-sky-400 underline hover:text-sky-300"
          >
            @userinfobot
          </a>{" "}
          on Telegram to get yours. The bot itself is configured once on the server via{" "}
          <code className="rounded bg-gray-800 px-1 py-0.5 text-xs">TELEGRAM_BOT_TOKEN</code> in{" "}
          <code className="rounded bg-gray-800 px-1 py-0.5 text-xs">.env</code>.
        </p>

        <div className="mb-6 rounded-lg border border-sky-500/20 bg-sky-900/10 px-4 py-3 text-sm text-sky-200">
          <span className="font-semibold">Reply from Telegram (admin only):</span> send{" "}
          <code className="rounded bg-gray-800 px-1 py-0.5 text-xs">/chat</code> to your bot to
          switch it into live chat mode — after that, anything you type is sent straight to your
          viewer and their replies show up as normal Telegram messages, not notifications. Send{" "}
          <code className="rounded bg-gray-800 px-1 py-0.5 text-xs">/stop</code> to exit.
        </div>

        <div className="mb-6">
          <label className="mb-1 block text-sm font-medium text-gray-300">Telegram Bot Username</label>
          <p className="mb-2 text-xs text-gray-500">
            Your bot's @username (without the @), e.g. <code className="rounded bg-gray-800 px-1 py-0.5 text-xs">randomeriaflix_bot</code>.
            Used to build the "message the bot" link shown on the viewer's own Settings page, so
            she can self-serve her Telegram Chat ID and email without needing this admin panel.
          </p>
          <input
            type="text"
            placeholder="your_bot_username"
            value={telegramBotUsername}
            onChange={(e) => setTelegramBotUsername(e.target.value.replace(/^@/, ""))}
            className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 text-sm text-white focus:border-red-500 focus:outline-none"
          />
        </div>

        <div className="space-y-6">
          {/* Admin notifications */}
          <div className="rounded-lg border border-gray-800 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-white">
                Notify Admin <span className="text-gray-500 font-normal">(when viewer messages)</span>
              </h3>
            </div>
            <ToggleSwitch
              checked={notifyAdminEnabled}
              onChange={setNotifyAdminEnabled}
              label={notifyAdminEnabled ? "Enabled" : "Disabled"}
            />
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 flex items-center gap-1.5 text-xs font-medium text-gray-400">
                  <Send className="h-3.5 w-3.5" /> Telegram Chat ID
                </label>
                <input
                  type="text"
                  placeholder="e.g. 123456789"
                  value={notifyAdminTelegramChatId}
                  onChange={(e) => setNotifyAdminTelegramChatId(e.target.value)}
                  className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-red-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 flex items-center gap-1.5 text-xs font-medium text-gray-400">
                  <Mail className="h-3.5 w-3.5" /> Email
                </label>
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={notifyAdminEmail}
                  onChange={(e) => setNotifyAdminEmail(e.target.value)}
                  className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-red-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Viewer notifications */}
          <div className="rounded-lg border border-gray-800 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-white">
                Notify Viewer <span className="text-gray-500 font-normal">(when admin messages)</span>
              </h3>
            </div>
            <p className="mb-3 text-xs text-gray-500">
              The viewer can't set this themselves — you configure it on their behalf here.
            </p>
            <ToggleSwitch
              checked={notifyViewerEnabled}
              onChange={setNotifyViewerEnabled}
              label={notifyViewerEnabled ? "Enabled" : "Disabled"}
            />
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 flex items-center gap-1.5 text-xs font-medium text-gray-400">
                  <Send className="h-3.5 w-3.5" /> Telegram Chat ID
                </label>
                <input
                  type="text"
                  placeholder="e.g. 987654321"
                  value={notifyViewerTelegramChatId}
                  onChange={(e) => setNotifyViewerTelegramChatId(e.target.value)}
                  className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-red-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 flex items-center gap-1.5 text-xs font-medium text-gray-400">
                  <Mail className="h-3.5 w-3.5" /> Email
                </label>
                <input
                  type="email"
                  placeholder="her@example.com"
                  value={notifyViewerEmail}
                  onChange={(e) => setNotifyViewerEmail(e.target.value)}
                  className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-red-500 focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={saveNotifySettings}
          disabled={savingNotify}
          className="mt-5 flex items-center gap-2 rounded-lg bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-sky-500 disabled:opacity-50"
        >
          {savingNotify ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : savedNotify ? (
            <Check className="h-4 w-4" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {savingNotify ? "Saving..." : savedNotify ? "Saved!" : "Save Notification Settings"}
        </button>
      </div>

      {/* Install App / Push Notifications */}
      <div className="mt-10">
        <InstallAppCard />
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

        {/* Page visibility */}
        <div className="mt-6 border-t border-gray-800 pt-5">
          <h3 className="mb-1 text-sm font-semibold text-white">Show player on</h3>
          <p className="mb-4 text-xs text-gray-500">
            Only checked pages ever connect to Spotify. On every other page the player is
            fully disconnected — not just hidden — so it won&apos;t show up as an active
            device and won&apos;t interrupt playback on your phone.
          </p>

          {availablePages.length === 0 ? (
            <p className="text-xs text-gray-500">No pages found yet — add tabs under Nav Tabs first.</p>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {availablePages.map((page) => {
                const isChecked = enabledPages.includes(page.slug);
                return (
                  <button
                    key={page.slug}
                    type="button"
                    onClick={() => togglePage(page.slug)}
                    className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-xs font-medium transition-colors ${
                      isChecked
                        ? "border-green-500/40 bg-green-900/10 text-green-300"
                        : "border-gray-800 bg-gray-800/50 text-gray-400 hover:text-gray-300"
                    }`}
                  >
                    {isChecked ? <Eye className="h-3.5 w-3.5 flex-shrink-0" /> : <EyeOff className="h-3.5 w-3.5 flex-shrink-0" />}
                    <span className="truncate">{page.label}</span>
                  </button>
                );
              })}
            </div>
          )}

          <button
            onClick={saveEnabledPages}
            disabled={savingPages}
            className="mt-4 flex items-center gap-2 rounded-lg bg-green-700 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-green-600 disabled:opacity-50"
          >
            {savingPages ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : savedPages ? (
              <Check className="h-4 w-4" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {savingPages ? "Saving..." : savedPages ? "Saved!" : "Save Page Visibility"}
          </button>
        </div>
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
