"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Send, Smile } from "lucide-react";

interface LiveChatMessage {
  id: string;
  sender: "admin" | "viewer";
  content: string;
  createdAt: string;
  readAt: string | null;
}

interface PartnerStatus {
  online: boolean;
  typing: boolean;
  lastSeen: string | null;
}

const POLL_INTERVAL_MS = 2000;
const TYPING_PING_MS = 2500;

const EMOJIS = [
  "❤️", "😂", "😍", "🥹", "😘", "🥰", "😊", "😉",
  "😢", "🥺", "😭", "😴", "🙄", "😅", "🤔", "😳",
  "🔥", "✨", "🎉", "👀", "👍", "🙏", "💯", "😴",
  "🐣", "🌙", "☕", "🍕", "🎶", "😤", "😜", "💤",
];

function timeAgo(iso: string | null): string {
  if (!iso) return "";
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDateLabel(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const isToday = d.toDateString() === today.toDateString();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const isYesterday = d.toDateString() === yesterday.toDateString();
  if (isToday) return "Today";
  if (isYesterday) return "Yesterday";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function LiveChatWindow({
  role,
  partnerLabel,
}: {
  role: "admin" | "viewer";
  partnerLabel: string;
}) {
  const [messages, setMessages] = useState<LiveChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [partnerStatus, setPartnerStatus] = useState<PartnerStatus>({
    online: false,
    typing: false,
    lastSeen: null,
  });
  const [emojiOpen, setEmojiOpen] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const lastTimestampRef = useRef<string | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastTypingPingRef = useRef(0);
  const typingStopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const emojiPopoverRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const initial = partnerLabel.trim().charAt(0).toUpperCase() || "?";

  const scrollToBottom = useCallback((smooth = true) => {
    bottomRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "auto" });
  }, []);

  const fetchMessages = useCallback(async (after?: string | null) => {
    try {
      const url = after ? `/api/live-chat?after=${encodeURIComponent(after)}` : "/api/live-chat";
      const res = await fetch(url);
      if (!res.ok) return;
      const data = await res.json();
      const incoming: LiveChatMessage[] = data.messages ?? [];

      if (data.partnerStatus) setPartnerStatus(data.partnerStatus);

      if (incoming.length === 0) return;
      setMessages((prev) => {
        const existingIds = new Set(prev.map((m) => m.id));
        return [...prev, ...incoming.filter((m) => !existingIds.has(m.id))];
      });
      lastTimestampRef.current = incoming[incoming.length - 1].createdAt;
    } catch {
      // silently ignore transient network errors; next poll will retry
    }
  }, []);

  useEffect(() => {
    (async () => {
      await fetchMessages(null);
      setLoaded(true);
    })();
  }, [fetchMessages]);

  useEffect(() => {
    pollingRef.current = setInterval(() => {
      fetchMessages(lastTimestampRef.current);
    }, POLL_INTERVAL_MS);
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [fetchMessages]);

  useEffect(() => {
    const onFocus = () => fetchMessages(lastTimestampRef.current);
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [fetchMessages]);

  // Let the server know we've left the chat / closed the tab, so we stop showing as typing.
  useEffect(() => {
    const onUnload = () => {
      navigator.sendBeacon?.(
        "/api/live-chat/typing",
        new Blob([JSON.stringify({ typing: false })], { type: "application/json" })
      );
    };
    window.addEventListener("beforeunload", onUnload);
    return () => window.removeEventListener("beforeunload", onUnload);
  }, []);

  useEffect(() => {
    if (loaded) scrollToBottom(false);
  }, [loaded, scrollToBottom]);

  useEffect(() => {
    if (messages.length > 0) scrollToBottom(true);
  }, [messages.length, scrollToBottom]);

  // Close emoji popover on outside click
  useEffect(() => {
    if (!emojiOpen) return;
    const onClick = (e: MouseEvent) => {
      if (emojiPopoverRef.current && !emojiPopoverRef.current.contains(e.target as Node)) {
        setEmojiOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [emojiOpen]);

  const pingTyping = useCallback((isTyping: boolean) => {
    fetch("/api/live-chat/typing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ typing: isTyping }),
      keepalive: true,
    }).catch(() => {});
  }, []);

  const handleDraftChange = (value: string) => {
    setDraft(value);
    const now = Date.now();
    if (now - lastTypingPingRef.current > TYPING_PING_MS) {
      lastTypingPingRef.current = now;
      pingTyping(true);
    }
    if (typingStopTimerRef.current) clearTimeout(typingStopTimerRef.current);
    typingStopTimerRef.current = setTimeout(() => pingTyping(false), 2000);
  };

  const handleSend = async () => {
    const content = draft.trim();
    if (!content || sending) return;

    setSending(true);
    setDraft("");
    pingTyping(false);
    if (typingStopTimerRef.current) clearTimeout(typingStopTimerRef.current);

    const optimisticId = `temp-${Date.now()}`;
    const optimistic: LiveChatMessage = {
      id: optimisticId,
      sender: role,
      content,
      createdAt: new Date().toISOString(),
      readAt: null,
    };
    setMessages((prev) => [...prev, optimistic]);

    try {
      const res = await fetch("/api/live-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (res.ok) {
        const data = await res.json();
        setMessages((prev) => prev.map((m) => (m.id === optimisticId ? data.message : m)));
        lastTimestampRef.current = data.message.createdAt;
      } else {
        setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
        setDraft(content);
      }
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
      setDraft(content);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const insertEmoji = (emoji: string) => {
    setDraft((prev) => prev + emoji);
    textareaRef.current?.focus();
  };

  // Group messages with date separators
  const grouped = useMemo(() => {
    const out: any[] = [];
    let lastDate = "";
    messages.forEach((m) => {
      const label = formatDateLabel(m.createdAt);
      if (label !== lastDate) {
        out.push({ type: "date", label, key: `date-${m.id}` });
        lastDate = label;
      }
      out.push({ type: "message", message: m, key: m.id });
    });
    return out;
  }, [messages]);

  const statusLine = partnerStatus.typing
    ? "typing…"
    : partnerStatus.online
      ? "Online"
      : partnerStatus.lastSeen
        ? `Last seen ${timeAgo(partnerStatus.lastSeen)}`
        : "Offline";

  return (
    <div className="relative flex h-[calc(100vh-7rem)] min-h-[420px] flex-col overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-rose-950/10 via-[#0a0a0a] to-[#0a0a0a] shadow-2xl sm:h-[calc(100vh-9rem)]">
      {/* Header */}
      <div className="flex shrink-0 items-center gap-3 border-b border-white/10 bg-white/[0.02] px-4 py-3 backdrop-blur-sm sm:px-5">
        <div className="relative shrink-0">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-rose-500 to-red-700 text-sm font-semibold text-white shadow-md">
            {initial}
          </div>
          <span
            className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[#0a0a0a] transition-colors ${
              partnerStatus.online ? "bg-emerald-400" : "bg-gray-600"
            }`}
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-white">{partnerLabel}</p>
          <p
            className={`truncate text-xs transition-colors ${
              partnerStatus.typing
                ? "font-medium text-rose-400"
                : partnerStatus.online
                  ? "text-emerald-400"
                  : "text-gray-500"
            }`}
          >
            {statusLine}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 space-y-1 overflow-y-auto px-3 py-4 sm:px-5">
        {!loaded && (
          <div className="flex h-full items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-rose-500 border-t-transparent" />
          </div>
        )}
        {loaded && messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
            <span className="text-4xl">💌</span>
            <p className="text-sm text-gray-500">No messages yet. Say hi!</p>
          </div>
        )}

        {grouped.map((item) => {
          if (item.type === "date") {
            return (
              <div key={item.key} className="flex justify-center py-2">
                <span className="rounded-full border border-white/[0.06] bg-white/[0.04] px-3 py-1 text-[11px] text-gray-400 backdrop-blur-sm">
                  {item.label}
                </span>
              </div>
            );
          }
          const m = item.message as LiveChatMessage;
          const mine = m.sender === role;
          return (
            <motion.div
              key={item.key}
              initial={{ opacity: 0, y: 6, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] }}
              className={`flex ${mine ? "justify-end" : "justify-start"} mt-1`}
            >
              <div
                className={`max-w-[78%] rounded-2xl px-4 py-2.5 shadow-sm sm:max-w-[65%] ${
                  mine
                    ? "rounded-br-sm bg-gradient-to-br from-rose-600 to-red-700 text-white"
                    : "rounded-bl-sm bg-gradient-to-br from-[#2a2d35] to-[#23262e] text-gray-100"
                }`}
              >
                <p className="whitespace-pre-wrap break-words text-[15px] leading-[1.5]">
                  {m.content}
                </p>
                <p className={`mt-1 text-right text-[10px] ${mine ? "text-white/60" : "text-white/30"}`}>
                  {formatTime(m.createdAt)}
                </p>
              </div>
            </motion.div>
          );
        })}

        {/* Typing bubble */}
        <AnimatePresence>
          {partnerStatus.typing && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              className="mt-1 flex justify-start"
            >
              <div className="flex items-center gap-1 rounded-2xl rounded-bl-sm bg-gradient-to-br from-[#2a2d35] to-[#23262e] px-4 py-3">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div className="relative shrink-0 border-t border-white/10 bg-white/[0.02] p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-sm sm:p-4">
        <AnimatePresence>
          {emojiOpen && (
            <motion.div
              ref={emojiPopoverRef}
              initial={{ opacity: 0, y: 8, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.97 }}
              transition={{ duration: 0.15 }}
              className="absolute bottom-full left-3 mb-2 grid w-64 grid-cols-8 gap-1 rounded-xl border border-white/10 bg-[#151515] p-2 shadow-2xl"
            >
              {EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => insertEmoji(emoji)}
                  className="flex h-7 w-7 items-center justify-center rounded-md text-lg transition-colors hover:bg-white/10"
                >
                  {emoji}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-end gap-2">
          {/* Emoji button — desktop only; phones already have an emoji keyboard */}
          <button
            onClick={() => setEmojiOpen((v) => !v)}
            className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-white/10 hover:text-rose-400 sm:flex"
            aria-label="Insert emoji"
          >
            <Smile className="h-5 w-5" />
          </button>

          <textarea
            ref={textareaRef}
            value={draft}
            onChange={(e) => handleDraftChange(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            placeholder="Type a message…"
            className="max-h-32 flex-1 resize-none rounded-2xl border border-white/10 bg-gray-900/80 px-4 py-2.5 text-sm text-white placeholder-gray-500 outline-none transition-colors focus:border-rose-500/50"
          />
          <button
            onClick={handleSend}
            disabled={!draft.trim() || sending}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-rose-600 to-red-700 text-white shadow-md transition-all hover:scale-105 hover:shadow-rose-900/40 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:scale-100"
            aria-label="Send message"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
