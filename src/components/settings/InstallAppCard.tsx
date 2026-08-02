"use client";

import { useEffect, useState } from "react";
import {
  Smartphone,
  Share,
  PlusSquare,
  Bell,
  BellOff,
  Loader2,
  Check,
  AlertCircle,
} from "lucide-react";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function isIos() {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

export default function InstallAppCard() {
  const [installed, setInstalled] = useState(false);
  const [ios, setIos] = useState(false);
  const [pushSupported, setPushSupported] = useState(true);
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [testSent, setTestSent] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setInstalled(isStandalone());
    setIos(isIos());
    setPushSupported(
      typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window
    );

    fetch("/api/push/subscribe")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) setSubscribed(Boolean(data.subscribed));
      })
      .catch(() => {});
  }, []);

  async function enablePush() {
    setError("");
    setLoading(true);
    try {
      if (Notification.permission === "denied") {
        setError("Notifications are blocked for this site — enable them in your browser/phone settings first.");
        return;
      }

      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setError("Permission wasn't granted, so notifications can't be enabled.");
        return;
      }

      const keyRes = await fetch("/api/push/vapid-public-key");
      const { publicKey } = await keyRes.json();
      if (!publicKey) {
        setError("Push isn't set up on the server yet — ask the admin to add VAPID keys.");
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      const json = subscription.toJSON();
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys }),
      });

      setSubscribed(true);
    } catch (err) {
      console.error(err);
      setError("Something went wrong enabling notifications.");
    } finally {
      setLoading(false);
    }
  }

  async function disablePush() {
    setLoading(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
        await subscription.unsubscribe();
      }
      setSubscribed(false);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function sendTest() {
    setTestLoading(true);
    setError("");
    try {
      const res = await fetch("/api/push/test", { method: "POST" });
      if (res.ok) {
        setTestSent(true);
        setTimeout(() => setTestSent(false), 2500);
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Couldn't send the test notification.");
      }
    } finally {
      setTestLoading(false);
    }
  }

  // iOS can only receive push once added to the home screen (iOS 16.4+)
  const iosPushBlocked = ios && !installed;

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-5 sm:p-6">
      <div className="mb-4 flex items-center gap-3">
        <Smartphone className="h-5 w-5 text-emerald-400" />
        <h2 className="text-lg font-semibold text-white">Add to Home Screen</h2>
      </div>

      {installed ? (
        <div className="mb-5 flex items-center gap-2 rounded-lg bg-emerald-900/20 px-4 py-3 text-sm text-emerald-300">
          <Check className="h-4 w-4" />
          You're using the installed app — nice.
        </div>
      ) : ios ? (
        <div className="mb-5 space-y-3 text-sm text-gray-300">
          <p className="text-gray-400">
            Get a real app icon on your homescreen — opens full-screen, no browser bar.
          </p>
          <div className="flex items-center gap-3 rounded-lg border border-gray-800 bg-gray-800/50 px-4 py-3">
            <Share className="h-4 w-4 shrink-0 text-sky-400" />
            <span>
              Tap the <span className="font-semibold text-white">Share</span> button in Safari
            </span>
          </div>
          <div className="flex items-center gap-3 rounded-lg border border-gray-800 bg-gray-800/50 px-4 py-3">
            <PlusSquare className="h-4 w-4 shrink-0 text-sky-400" />
            <span>
              Scroll down and tap <span className="font-semibold text-white">Add to Home Screen</span>
            </span>
          </div>
          <p className="text-xs text-gray-500">
            Must be done from Safari (not Chrome) on iPhone/iPad for this to work.
          </p>
        </div>
      ) : (
        <div className="mb-5 space-y-3 text-sm text-gray-300">
          <p className="text-gray-400">
            Get a real app icon on your homescreen or desktop — opens full-screen, no browser bar.
          </p>
          <p className="text-xs text-gray-500">
            Look for an <span className="font-semibold text-gray-300">Install app</span> option in
            your browser's menu (⋮ or the icon in the address bar) — Chrome and Edge support this.
          </p>
        </div>
      )}

      {/* Push notifications */}
      <div className="border-t border-gray-800 pt-5">
        <h3 className="mb-1 text-sm font-semibold text-white">Push Notifications</h3>
        <p className="mb-3 text-xs text-gray-500">
          {iosPushBlocked
            ? "On iPhone, push notifications only work after you've added the app to your Home Screen (see above) — open it from there first, then come back to enable this."
            : "Get a notification straight from your phone/browser, even without Telegram."}
        </p>

        {!pushSupported ? (
          <div className="flex items-center gap-2 rounded-lg bg-gray-800/50 px-4 py-3 text-xs text-gray-500">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            This browser doesn't support push notifications.
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            {subscribed ? (
              <button
                onClick={disablePush}
                disabled={loading}
                className="flex items-center gap-2 rounded-lg bg-gray-800 px-4 py-2.5 text-sm font-medium text-gray-300 transition-colors hover:bg-red-900/50 hover:text-red-400 disabled:opacity-50"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <BellOff className="h-4 w-4" />}
                Turn off
              </button>
            ) : (
              <button
                onClick={enablePush}
                disabled={loading || iosPushBlocked}
                className="flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bell className="h-4 w-4" />}
                Enable notifications
              </button>
            )}

            {subscribed && (
              <button
                onClick={sendTest}
                disabled={testLoading}
                className="flex items-center gap-2 rounded-lg border border-gray-700 px-4 py-2.5 text-sm text-gray-300 transition-colors hover:bg-gray-800 disabled:opacity-50"
              >
                {testLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : testSent ? (
                  <Check className="h-4 w-4 text-emerald-400" />
                ) : null}
                {testSent ? "Sent!" : "Send test"}
              </button>
            )}
          </div>
        )}

        {error && (
          <p className="mt-3 flex items-start gap-1.5 text-xs text-red-400">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
