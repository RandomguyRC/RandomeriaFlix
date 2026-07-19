"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Virtuoso, VirtuosoHandle } from "react-virtuoso";
import ChatBubble from "./ChatBubble";
import DateSeparator from "./DateSeparator";
import SearchBar from "./SearchBar";
import ChatCalendar from "./ChatCalendar";

interface ChatMessage {
  id: string;
  sortOrder: number;
  dateLabel: string | null;
  sender: string;
  senderType: string;
  text: string;
}

export default function ChatPageComponent() {
  const params = useParams();
  const profileSlug = params.profileslug as string;
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [matchIndex, setMatchIndex] = useState(0);
  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const [bgImage, setBgImage] = useState<string | null>(null);
  const [bgY, setBgY] = useState(50);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // Date calendar state
  const [showCalendar, setShowCalendar] = useState(false);
  const [availableDates, setAvailableDates] = useState<string[]>([]);

  useEffect(() => {
    async function load() {
      try {
        const [chatRes, datesRes] = await Promise.all([
          fetch(`/api/chat?profileSlug=${profileSlug}&page=0&limit=100`),
          fetch(`/api/chat/dates?profileSlug=${profileSlug}`),
        ]);
        if (chatRes.ok) {
          const data = await chatRes.json();
          setMessages(data.messages || []);
          setHasMore(data.hasMore);
          setPage(0);
          if (data.chatBackground) setBgImage(`/api/media/${data.chatBackground}`);
          if (data.chatBackgroundY) setBgY(Number(data.chatBackgroundY));
        }
        if (datesRes.ok) {
          const datesData = await datesRes.json();
          setAvailableDates(datesData.dates || []);
        }
      } catch {}
      setLoading(false);
    }
    load();
  }, [profileSlug]);

  // Find matching message indices for search
  const matchIndices = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    const indices: number[] = [];
    messages.forEach((m, i) => {
      if (m.text.toLowerCase().includes(q)) indices.push(i);
    });
    return indices;
  }, [searchQuery, messages]);

  const matchCount = matchIndices.length;
  const matchCountDisplay = matchCount;

  // Jump to a specific match
  function jumpToMatch(idx: number) {
    if (matchIndices.length === 0 || !virtuosoRef.current) return;
    const targetIndex = matchIndices[idx % matchIndices.length];
    setMatchIndex(idx % matchIndices.length);
    virtuosoRef.current.scrollToIndex({ index: targetIndex, align: "center" });
  }

  async function loadMore() {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const res = await fetch(`/api/chat?profileSlug=${profileSlug}&page=${nextPage}&limit=100`);
      if (res.ok) {
        const data = await res.json();
        setMessages((prev) => [...prev, ...(data.messages || [])]);
        setHasMore(data.hasMore);
        setPage(nextPage);
      }
    } catch {}
    setLoadingMore(false);
  }

  function jumpToDate(dateStr: string) {
    console.log("[Chat] jumpToDate called with:", JSON.stringify(dateStr));
    console.log("[Chat] First 3 message dateLabels:", messages.slice(0, 3).map((m) => m.dateLabel));

    // Try multiple matching strategies
    const idx = messages.findIndex((m) => {
      if (!m.dateLabel) return false;
      const msgDate = m.dateLabel.trim().split(/[\s,]+/)[0]; // "14/08/23"
      // Try exact match
      if (msgDate === dateStr) return true;
      // Try substring (calendar might return "14/8/23" vs message "14/08/23")
      if (msgDate.indexOf(dateStr) !== -1 || dateStr.indexOf(msgDate) !== -1) return true;
      return false;
    });

    console.log("[Chat] Found index:", idx);

    if (idx >= 0 && virtuosoRef.current) {
      setMatchIndex(idx);
      virtuosoRef.current.scrollToIndex({ index: idx, align: "start" });
    }
    setShowCalendar(false);
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-red-500" />
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="text-center">
          <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-gray-800 to-gray-900">
            <svg className="h-12 w-12 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <h2 className="mb-2 text-2xl font-bold text-white">No Messages</h2>
          <p className="text-gray-400">All the chats are now forever gone with Random Guy.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[950px] flex h-[calc(100vh-56px)] flex-col relative"
      style={{
        background: bgImage
          ? `url(${bgImage}) center ${bgY}%/cover no-repeat`
          : "#0b0e14",
      }}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-[2px]" />

      {/* Header */}
      <div className="sticky top-14 z-10 relative border-b border-white/[0.06] bg-[#1f2937]/80 backdrop-blur-xl">
        <div className="flex items-center gap-4 px-6 py-4">
          <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-pink-500 to-rose-600 ring-2 ring-white/10">
            <span className="flex h-full w-full items-center justify-center text-sm font-bold text-white">C</span>
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-semibold text-white">Cherry 🍒</h2>
            <p className="text-xs text-gray-400">Online</p>
          </div>
          <SearchBar
            query={searchQuery}
            onChange={(q) => { setSearchQuery(q); setMatchIndex(0); }}
            matchCount={matchCountDisplay}
            currentIndex={matchIndex}
            onNext={() => jumpToMatch(matchIndex + 1)}
            onPrev={() => jumpToMatch(matchIndex - 1)}
          />
          <button onClick={() => setShowCalendar(true)}
            className="rounded-full p-2 text-gray-400 transition-colors hover:bg-white/5 hover:text-white">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </button>
          {showCalendar && (
            <ChatCalendar
              activeDates={availableDates}
              onSelectDate={jumpToDate}
              onClose={() => setShowCalendar(false)}
            />
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-hidden pt-4 pb-6 relative">
        <Virtuoso
          ref={virtuosoRef}
          totalCount={messages.length}
          overscan={30}
          endReached={() => { if (hasMore && !loadingMore) loadMore(); }}
          itemContent={(index) => {
            const msg = messages[index];
            const prev = index > 0 ? messages[index - 1] : null;
            const isConsecutive = prev
              ? prev.sender === msg.sender &&
                prev.dateLabel?.split(" ")[0] === msg.dateLabel?.split(" ")[0]
              : false;
            const showDate =
              index === 0 ||
              (prev && prev.dateLabel?.split(" ")[0] !== msg.dateLabel?.split(" ")[0]);

            // Check if this message matches the search
            const isMatch = searchQuery.trim() && msg.text.toLowerCase().includes(searchQuery.toLowerCase());

            return (
              <div key={msg.id} className="px-4 sm:px-6">
                {showDate && <DateSeparator date={msg.dateLabel?.split(" ")[0] || ""} />}
                <ChatBubble
                  message={msg}
                  isConsecutive={isConsecutive && !showDate}
                  searchQuery={searchQuery}
                  isHighlighted={isMatch}
                />
              </div>
            );
          }}
          components={{
            Footer: () => loadingMore ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-gray-500" />
              </div>
            ) : null,
          }}
        />
      </div>
    </div>
  );
}
