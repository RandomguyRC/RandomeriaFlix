"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { MessageCircle, Bell, X } from "lucide-react";

interface LiveChatMessage {
  id: string;
  sender: "admin" | "viewer";
  content: string;
  createdAt: string;
}

interface Toast {
  id: string;
  content: string;
}

const POLL_INTERVAL_MS = 5000;
const TOAST_DURATION_MS = 6000;

export default function LiveChatNotifier({
  role,
  chatHref,
  partnerLabel,
}: {
  role: "admin" | "viewer";
  chatHref: string;
  partnerLabel: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [showPermissionPrompt, setShowPermissionPrompt] = useState(false);

  const lastSeenRef = useRef<string | null>(null);
  const storageKey = `livechat:lastSeen:${role}`;
  const onChatPage = pathname === chatHref;

  const initial = partnerLabel.trim().charAt(0).toUpperCase() || "?";

  // Load last-seen watermark from localStorage so we don't re-notify old
  // messages after a page reload/navigation.
  useEffect(() => {
    try {
      lastSeenRef.current = localStorage.getItem(storageKey);
    } catch {}
  }, [storageKey]);

  // Offer to enable browser notifications once, if the API exists and
  // permission hasn't been decided yet. (Not supported in a regular iOS
  // Safari tab — only via an installed PWA there.)
  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission === "default") {
      setShowPermissionPrompt(true);
    }
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const goToChat = useCallback(
    (id?: string) => {
      if (id) dismissToast(id);
      router.push(chatHref);
    },
    [chatHref, router, dismissToast]
  );

  const fetchNew = useCallback(async () => {
    try {
      const url = lastSeenRef.current
        ? `/api/live-chat/notifications?after=${encodeURIComponent(lastSeenRef.current)}`
        : `/api/live-chat/notifications`;
      const res = await fetch(url);
      if (!res.ok) return;
      const data = await res.json();
      const incoming: LiveChatMessage[] = data.messages ?? [];
      if (incoming.length === 0) return;

      // First-ever poll (no watermark yet): just set the watermark, don't
      // fire a wall of notifications for old history.
      const isFirstRun = lastSeenRef.current === null;
      lastSeenRef.current = incoming[incoming.length - 1].createdAt;
      try {
        localStorage.setItem(storageKey, lastSeenRef.current);
      } catch {}
      if (isFirstRun) return;

      incoming.forEach((m) => {
        if (!onChatPage) {
          setToasts((prev) => [...prev, { id: m.id, content: m.content }]);
          setTimeout(() => dismissToast(m.id), TOAST_DURATION_MS);
        }

        if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
          try {
            const n = new Notification(partnerLabel, {
              body: m.content,
              tag: m.id,
              icon: "/logo.png",
            });
            n.onclick = () => {
              window.focus();
              goToChat();
              n.close();
            };
          } catch {
            // Notification API not actually usable here (e.g. iOS Safari regular tab) — the in-app toast still covers it.
          }
        }
      });
    } catch {
      // transient network error — next poll retries
    }
  }, [onChatPage, storageKey, partnerLabel, dismissToast, goToChat]);

  useEffect(() => {
    fetchNew();
    const interval = setInterval(fetchNew, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchNew]);

  const enableNotifications = async () => {
    setShowPermissionPrompt(false);
    try {
      await Notification.requestPermission();
    } catch {}
  };

  return (
    <>
      {/* One-time permission prompt */}
      <AnimatePresence>
        {showPermissionPrompt && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="fixed left-1/2 top-3 z-[70] w-[92%] max-w-sm -translate-x-1/2 sm:left-auto sm:right-4 sm:w-auto sm:translate-x-0"
          >
            <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-[#151515]/95 px-4 py-3 shadow-2xl backdrop-blur-md">
              <Bell className="h-4 w-4 shrink-0 text-rose-400" />
              <p className="flex-1 text-xs text-gray-300">
                Get notified here when {partnerLabel} messages you
              </p>
              <button
                onClick={enableNotifications}
                className="shrink-0 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-rose-500"
              >
                Enable
              </button>
              <button
                onClick={() => setShowPermissionPrompt(false)}
                className="shrink-0 text-gray-500 hover:text-gray-300"
                aria-label="Dismiss"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating message toasts */}
      <div className="pointer-events-none fixed left-1/2 top-3 z-[60] flex w-[92%] max-w-sm -translate-x-1/2 flex-col gap-2 sm:left-auto sm:right-4 sm:w-full sm:translate-x-0">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.button
              key={t.id}
              initial={{ opacity: 0, y: -16, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.95 }}
              transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
              onClick={() => goToChat(t.id)}
              className="pointer-events-auto flex w-full items-start gap-3 rounded-2xl border border-white/10 bg-[#151515]/95 p-3 text-left shadow-2xl backdrop-blur-md transition-transform hover:scale-[1.02] active:scale-[0.98]"
            >
              <div className="relative shrink-0">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-rose-500 to-red-700 text-xs font-semibold text-white">
                  {initial}
                </div>
                <div className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#151515] text-rose-400">
                  <MessageCircle className="h-2.5 w-2.5" />
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-white">{partnerLabel}</p>
                <p className="mt-0.5 line-clamp-2 text-xs text-gray-400">{t.content}</p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  dismissToast(t.id);
                }}
                className="pointer-events-auto shrink-0 rounded-full p-1 text-gray-600 hover:bg-white/10 hover:text-gray-300"
                aria-label="Dismiss notification"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </motion.button>
          ))}
        </AnimatePresence>
      </div>
    </>
  );
}
