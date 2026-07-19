"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Send } from "lucide-react";

interface LiveChatMessage {
  id: string;
  sender: "admin" | "viewer";
  content: string;
  createdAt: string;
  readAt: string | null;
}

const POLL_INTERVAL_MS = 2000;

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
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastTimestampRef = useRef<string | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
      if (incoming.length === 0) return;

      setMessages((prev) => {
        const existingIds = new Set(prev.map((m) => m.id));
        const merged = [...prev, ...incoming.filter((m) => !existingIds.has(m.id))];
        return merged;
      });
      lastTimestampRef.current = incoming[incoming.length - 1].createdAt;
    } catch {
      // silently ignore transient network errors; next poll will retry
    }
  }, []);

  // Initial load
  useEffect(() => {
    (async () => {
      await fetchMessages(null);
      setLoaded(true);
    })();
  }, [fetchMessages]);

  // Polling loop
  useEffect(() => {
    pollingRef.current = setInterval(() => {
      fetchMessages(lastTimestampRef.current);
    }, POLL_INTERVAL_MS);
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [fetchMessages]);

  // Refresh immediately when the tab regains focus (feels snappier than waiting for the next poll)
  useEffect(() => {
    const onFocus = () => fetchMessages(lastTimestampRef.current);
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [fetchMessages]);

  useEffect(() => {
    if (loaded) scrollToBottom(false);
  }, [loaded, scrollToBottom]);

  useEffect(() => {
    if (messages.length > 0) scrollToBottom(true);
  }, [messages.length, scrollToBottom]);

  const handleSend = async () => {
    const content = draft.trim();
    if (!content || sending) return;

    setSending(true);
    setDraft("");

    // Optimistic bubble
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
        // revert on failure
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

  return (
    <div className="flex h-full min-h-[70vh] flex-col overflow-hidden rounded-xl border border-white/10 bg-[#0a0a0a]">
      <div className="border-b border-white/10 px-4 py-3">
        <p className="text-sm font-semibold text-white">{partnerLabel}</p>
        <p className="text-xs text-gray-500">Live chat</p>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto px-4 py-4">
        {!loaded && (
          <p className="text-center text-sm text-gray-500">Loading messages…</p>
        )}
        {loaded && messages.length === 0 && (
          <p className="text-center text-sm text-gray-500">
            No messages yet. Say hi 👋
          </p>
        )}
        {messages.map((m) => {
          const mine = m.sender === role;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${
                  mine
                    ? "rounded-br-sm bg-red-600 text-white"
                    : "rounded-bl-sm bg-gray-800 text-gray-100"
                }`}
              >
                <p className="whitespace-pre-wrap break-words">{m.content}</p>
                <p className={`mt-1 text-[10px] ${mine ? "text-red-100/70" : "text-gray-400"}`}>
                  {new Date(m.createdAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div className="flex items-end gap-2 border-t border-white/10 p-3">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          placeholder="Type a message…"
          className="max-h-32 flex-1 resize-none rounded-lg border border-white/10 bg-gray-900 px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-red-500"
        />
        <button
          onClick={handleSend}
          disabled={!draft.trim() || sending}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-600 text-white transition-colors hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Send message"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
