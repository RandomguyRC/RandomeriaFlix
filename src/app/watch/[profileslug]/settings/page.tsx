"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import {
  Bell,
  BellOff,
  Send,
  Mail,
  Save,
  Loader2,
  Check,
  HelpCircle,
  ExternalLink,
  ArrowRight,
} from "lucide-react";
import InstallAppCard from "@/components/settings/InstallAppCard";

function ToggleSwitch({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
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
        {checked ? "Notifications on" : "Notifications off"}
      </span>
    </button>
  );
}

export default function ViewerSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [enabled, setEnabled] = useState(false);
  const [telegramChatId, setTelegramChatId] = useState("");
  const [email, setEmail] = useState("");
  const [telegramBotUsername, setTelegramBotUsername] = useState("");

  useEffect(() => {
    fetch("/api/viewer/notifications")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) {
          setEnabled(Boolean(data.enabled));
          setTelegramChatId(data.telegramChatId || "");
          setEmail(data.email || "");
          setTelegramBotUsername(data.telegramBotUsername || "");
        }
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      await fetch("/api/viewer/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled, telegramChatId, email }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  const botLink = telegramBotUsername ? `https://t.me/${telegramBotUsername}` : null;

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-red-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-10">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      >
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white sm:text-3xl">Settings</h1>
          <p className="mt-2 text-gray-400">Manage how you get notified.</p>
        </div>

        {/* Notifications card */}
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-5 sm:p-6">
          <div className="mb-4 flex items-center gap-3">
            <Send className="h-5 w-5 text-sky-400" />
            <h2 className="text-lg font-semibold text-white">Notifications</h2>
          </div>
          <p className="mb-5 text-sm text-gray-400">
            Get pinged on Telegram and/or email whenever a new message comes in, so you never have
            to keep the app open to know someone's messaged you.
          </p>

          <ToggleSwitch checked={enabled} onChange={setEnabled} />

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-gray-400">
                <Send className="h-3.5 w-3.5" /> Telegram Chat ID
              </label>
              <input
                type="text"
                placeholder="e.g. 123456789"
                value={telegramChatId}
                onChange={(e) => setTelegramChatId(e.target.value)}
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2.5 text-sm text-white focus:border-red-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-gray-400">
                <Mail className="h-3.5 w-3.5" /> Email
              </label>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2.5 text-sm text-white focus:border-red-500 focus:outline-none"
              />
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="mt-5 flex items-center gap-2 rounded-lg bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-red-700 disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : saved ? (
              <Check className="h-4 w-4" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {saving ? "Saving..." : saved ? "Saved!" : "Save Settings"}
          </button>
        </div>

        {/* Install app / push notifications card */}
        <div className="mt-6">
          <InstallAppCard />
        </div>

        {/* Guide card */}
        <div className="mt-6 rounded-xl border border-sky-500/20 bg-sky-900/10 p-5 sm:p-6">
          <div className="mb-4 flex items-center gap-3">
            <HelpCircle className="h-5 w-5 text-sky-400" />
            <h2 className="text-lg font-semibold text-white">How to get your Telegram Chat ID</h2>
          </div>

          <ol className="space-y-4 text-sm text-gray-300">
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sky-500/20 text-xs font-bold text-sky-300">
                1
              </span>
              <span>
                On Telegram, open a chat with{" "}
                <a
                  href="https://t.me/userinfobot"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-sky-400 underline hover:text-sky-300"
                >
                  @userinfobot <ExternalLink className="h-3 w-3" />
                </a>{" "}
                and send it any message. It'll reply with your account details — copy the number
                next to <span className="text-gray-200">Id</span>. That's your Chat ID, paste it above.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sky-500/20 text-xs font-bold text-sky-300">
                2
              </span>
              <span>
                Telegram bots can only message people who've messaged them first. So open a chat
                with{" "}
                {botLink ? (
                  <a
                    href={botLink}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-sky-400 underline hover:text-sky-300"
                  >
                    @{telegramBotUsername} <ExternalLink className="h-3 w-3" />
                  </a>
                ) : (
                  <span className="text-gray-200">the notification bot</span>
                )}{" "}
                and send it a quick "hi" or <code className="rounded bg-gray-800 px-1 py-0.5 text-xs">/start</code> —
                otherwise Telegram will silently block the notifications from ever reaching you.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sky-500/20 text-xs font-bold text-sky-300">
                3
              </span>
              <span>
                Flip the toggle above to on, paste your Chat ID (and email, if you'd like that
                too), and hit Save. You're all set!
              </span>
            </li>
          </ol>

          {!botLink && (
            <p className="mt-4 flex items-center gap-1.5 text-xs text-gray-500">
              <ArrowRight className="h-3.5 w-3.5" />
              The bot link isn't set up yet — just ask for the bot's username so step 2 above works.
            </p>
          )}
        </div>
      </motion.div>
    </div>
  );
}
