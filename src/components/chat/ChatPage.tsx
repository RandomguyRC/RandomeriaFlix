"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Virtuoso, VirtuosoHandle } from "react-virtuoso";
import ChatBubble from "./ChatBubble";
import DateSeparator from "./DateSeparator";
import SearchBar from "./SearchBar";
import ChatCalendar from "./ChatCalendar";
import type { ChatMessageData } from "./types";

const PAGE_SIZE = 100;

export default function ChatPageComponent() {
  const params = useParams();
  const profileSlug = params.profileslug as string;
  const [messages, setMessages] = useState<ChatMessageData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [matchIndex, setMatchIndex] = useState(0);
  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const [bgImage, setBgImage] = useState<string | null>(null);
  const [bgY, setBgY] = useState(50);
  const [hasOlder, setHasOlder] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [firstItemIndex, setFirstItemIndex] = useState(100000);
  const [totalCount, setTotalCount] = useState(0);

  // Date calendar state
  const [showCalendar, setShowCalendar] = useState(false);
  const [availableDates, setAvailableDates] = useState<string[]>([]);

  useEffect(() => {
    async function load() {
      try {
        const [chatRes, datesRes] = await Promise.all([
          fetch(`/api/chat?profileSlug=${profileSlug}&limit=${PAGE_SIZE}`),
          fetch(`/api/chat/dates?profileSlug=${profileSlug}`),
        ]);
        if (chatRes.ok) {
          const data = await chatRes.json();
          const initialMessages = data.messages || [];
          setMessages(initialMessages);
          setHasOlder(Boolean(data.hasOlder));
          setTotalCount(data.totalCount || initialMessages.length);
          setFirstItemIndex(Math.max(0, (data.totalCount || initialMessages.length) - initialMessages.length));
          if (data.chatBackground) setBgImage(`/api/media/${data.chatBackground}`);
          if (data.chatBackgroundY) setBgY(Number(data.chatBackgroundY));
          requestAnimationFrame(() => virtuosoRef.current?.scrollToIndex({ index: initialMessages.length - 1, align: "end" }));
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

  // Find matching message indices for search. This searches only the loaded virtualized window.
  const matchIndices = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    const indices: number[] = [];
    messages.forEach((m, i) => {
      if ((m.text || "").toLowerCase().includes(q)) indices.push(i);
    });
    return indices;
  }, [searchQuery, messages]);

  const matchCount = matchIndices.length;

  function jumpToMatch(idx: number) {
    if (matchIndices.length === 0 || !virtuosoRef.current) return;
    const targetIndex = matchIndices[idx % matchIndices.length];
    setMatchIndex(idx % matchIndices.length);
    virtuosoRef.current.scrollToIndex({ index: targetIndex + firstItemIndex, align: "center" });
  }

  const loadOlder = useCallback(async () => {
    if (!hasOlder || loadingOlder || messages.length === 0) return;
    setLoadingOlder(true);
    try {
      const oldest = messages[0].sortOrder;
      const res = await fetch(`/api/chat?profileSlug=${profileSlug}&beforeSortOrder=${oldest}&limit=${PAGE_SIZE}`);
      if (res.ok) {
        const data = await res.json();
        const olderMessages: ChatMessageData[] = data.messages || [];
        if (olderMessages.length > 0) {
          setFirstItemIndex((index) => Math.max(0, index - olderMessages.length));
          setMessages((prev) => [...olderMessages, ...prev]);
        }
        setHasOlder(Boolean(data.hasOlder));
      }
    } catch {}
    setLoadingOlder(false);
  }, [hasOlder, loadingOlder, messages, profileSlug]);

  function jumpToDate(dateStr: string) {
    const idx = messages.findIndex((m) => {
      if (!m.dateLabel) return false;
      const msgDate = m.dateLabel.trim().split(/[\s,]+/)[0];
      if (msgDate === dateStr) return true;
      if (msgDate.indexOf(dateStr) !== -1 || dateStr.indexOf(msgDate) !== -1) return true;
      return false;
    });

    if (idx >= 0 && virtuosoRef.current) {
      setMatchIndex(idx);
      virtuosoRef.current.scrollToIndex({ index: idx + firstItemIndex, align: "start" });
    } else if (hasOlder) {
      loadOlder();
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
    <div className="relative flex h-[calc(100vh-56px)] w-full max-w-none flex-col overflow-hidden"
      style={{
        background: bgImage
          ? `url(${bgImage}) center ${bgY}%/cover no-repeat`
          : "#0b141a",
      }}
    >
      <div className="absolute inset-0 bg-black/55 backdrop-blur-[1px]" />

      {/* Header */}
      <div className="sticky top-14 z-10 relative border-b border-white/[0.06] bg-[#202c33]/95 backdrop-blur-xl">
        <div className="flex items-center gap-2 px-3 py-3 sm:gap-4 sm:px-6 sm:py-4">
          <div className="relative h-9 w-9 flex-shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-pink-500 to-rose-600 ring-2 ring-white/10 sm:h-10 sm:w-10">
            <span className="flex h-full w-full items-center justify-center text-sm font-bold text-white">C</span>
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-sm font-semibold text-white sm:text-base">Cherry 🍒</h2>
            <p className="text-xs text-gray-400">{totalCount.toLocaleString()} messages · latest at bottom</p>
          </div>
          {searchQuery && <span className="hidden text-xs text-gray-400 md:inline">Searching loaded messages</span>}
          <SearchBar
            query={searchQuery}
            onChange={(q) => { setSearchQuery(q); setMatchIndex(0); }}
            matchCount={matchCount}
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
      <div className="relative flex-1 overflow-hidden py-3">
        <Virtuoso
          ref={virtuosoRef}
          firstItemIndex={firstItemIndex}
          data={messages}
          overscan={24}
          followOutput="smooth"
          startReached={loadOlder}
          initialTopMostItemIndex={messages.length - 1}
          itemContent={(index, msg) => {
            const localIndex = index - firstItemIndex;
            const prev = localIndex > 0 ? messages[localIndex - 1] : null;
            const isConsecutive = prev
              ? prev.sender === msg.sender &&
                prev.dateLabel?.split(" ")[0] === msg.dateLabel?.split(" ")[0]
              : false;
            const showDate =
              localIndex === 0 ||
              (prev && prev.dateLabel?.split(" ")[0] !== msg.dateLabel?.split(" ")[0]);

            const isMatch = Boolean(searchQuery.trim() && (msg.text || "").toLowerCase().includes(searchQuery.toLowerCase()));

            return (
              <div key={msg.id} className="px-2 sm:px-6 lg:px-10 xl:px-14">
                {showDate && <DateSeparator date={msg.dateLabel?.split(" ")[0] || ""} />}
                <ChatBubble
                  message={msg}
                  isConsecutive={Boolean(isConsecutive && !showDate)}
                  searchQuery={searchQuery}
                  isHighlighted={isMatch}
                />
              </div>
            );
          }}
          components={{
            Header: () => loadingOlder ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-gray-500" />
              </div>
            ) : hasOlder ? (
              <div className="py-2 text-center text-xs text-gray-400">Scroll up to load older messages</div>
            ) : null,
          }}
        />
      </div>
    </div>
  );
}
