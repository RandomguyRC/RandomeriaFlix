"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import { Loader2, ChevronDown, Calendar } from "lucide-react";
import { Virtuoso, VirtuosoHandle } from "react-virtuoso";
import ChatBubble from "./ChatBubble";
import DateSeparator from "./DateSeparator";
import SearchBar from "./SearchBar";
import ChatCalendar from "./ChatCalendar";
import ChatMediaGallery from "./ChatMediaGallery";
import type { ChatMessageData } from "./types";

const PAGE_SIZE = 100;

interface SearchMatch {
  id: string;
  sortOrder: number;
  dateLabel: string | null;
  snippet: string;
}

export default function ChatPageComponent() {
  const params = useParams();
  const profileSlug = params.profileslug as string;

  const [messages, setMessages] = useState<ChatMessageData[]>([]);
  const [loading, setLoading] = useState(true);
  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const [bgImage, setBgImage] = useState<string | null>(null);
  const [bgY, setBgY] = useState(50);
  const [hasOlder, setHasOlder] = useState(false);
  const [hasNewer, setHasNewer] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [loadingNewer, setLoadingNewer] = useState(false);
  const [firstItemIndex, setFirstItemIndex] = useState(100000);
  const [totalCount, setTotalCount] = useState(0);
  const [jumping, setJumping] = useState(false);
  const [atBottom, setAtBottom] = useState(true);

  // Jump-to-message support (search + calendar both funnel through this)
  const [pendingScroll, setPendingScroll] = useState<{ sortOrder: number; persist: boolean } | null>(null);
  const [highlightSortOrder, setHighlightSortOrder] = useState<number | null>(null);
  const highlightTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Date calendar state
  const [showCalendar, setShowCalendar] = useState(false);
  const [showMediaGallery, setShowMediaGallery] = useState(false);
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [dateAnchors, setDateAnchors] = useState<Record<string, number>>({});

  // WhatsApp-style global search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchMatches, setSearchMatches] = useState<SearchMatch[]>([]);
  const [searchIndex, setSearchIndex] = useState(-1);
  const [searchTruncated, setSearchTruncated] = useState(false);

  const messagesRef = useRef(messages);
  messagesRef.current = messages;
  const firstItemIndexRef = useRef(firstItemIndex);
  firstItemIndexRef.current = firstItemIndex;

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
          setHasNewer(Boolean(data.hasNewer));
          setTotalCount(data.totalCount || initialMessages.length);
          setFirstItemIndex(Math.max(0, (data.totalCount || initialMessages.length) - initialMessages.length));
          if (data.chatBackground) setBgImage(`/api/media/${data.chatBackground}`);
          if (data.chatBackgroundY) setBgY(Number(data.chatBackgroundY));
          requestAnimationFrame(() => virtuosoRef.current?.scrollToIndex({ index: initialMessages.length - 1, align: "end" }));
        }
        if (datesRes.ok) {
          const datesData = await datesRes.json();
          setAvailableDates(datesData.dates || []);
          setDateAnchors(datesData.anchors || {});
        }
      } catch {}
      setLoading(false);
    }
    load();
  }, [profileSlug]);

  const flashHighlight = useCallback((sortOrder: number, persist: boolean) => {
    setHighlightSortOrder(sortOrder);
    if (highlightTimeoutRef.current) clearTimeout(highlightTimeoutRef.current);
    if (!persist) {
      highlightTimeoutRef.current = setTimeout(() => setHighlightSortOrder(null), 2200);
    }
  }, []);

  // The single entry point for "go to this message", used by both calendar
  // jumps and search navigation. If the message is already in the loaded
  // window it just scrolls; otherwise it fetches a fresh window centered on
  // it (via aroundSortOrder) and scrolls once that window has rendered.
  const jumpToSortOrder = useCallback(async (target: number, persist = false) => {
    const idx = messagesRef.current.findIndex((m) => m.sortOrder === target);
    if (idx >= 0) {
      virtuosoRef.current?.scrollToIndex({ index: idx + firstItemIndexRef.current, align: "center", behavior: "smooth" });
      flashHighlight(target, persist);
      return;
    }
    setJumping(true);
    try {
      const res = await fetch(`/api/chat?profileSlug=${profileSlug}&aroundSortOrder=${target}&limit=${PAGE_SIZE}`);
      if (res.ok) {
        const data = await res.json();
        const win: ChatMessageData[] = data.messages || [];
        setMessages(win);
        setFirstItemIndex(Math.max(0, data.olderCount ?? 0));
        setHasOlder(Boolean(data.hasOlder));
        setHasNewer(Boolean(data.hasNewer));
        if (data.totalCount) setTotalCount(data.totalCount);
        setPendingScroll({ sortOrder: target, persist });
      }
    } catch {}
    setJumping(false);
  }, [profileSlug, flashHighlight]);

  // Fires once a jumped-to window has actually rendered with the target message in it.
  useEffect(() => {
    if (!pendingScroll) return;
    const idx = messages.findIndex((m) => m.sortOrder === pendingScroll.sortOrder);
    if (idx >= 0) {
      virtuosoRef.current?.scrollToIndex({ index: idx + firstItemIndex, align: "center" });
      flashHighlight(pendingScroll.sortOrder, pendingScroll.persist);
      setPendingScroll(null);
    }
  }, [messages, firstItemIndex, pendingScroll, flashHighlight]);

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

  const loadNewer = useCallback(async () => {
    if (!hasNewer || loadingNewer || messages.length === 0) return;
    setLoadingNewer(true);
    try {
      const newest = messages[messages.length - 1].sortOrder;
      const res = await fetch(`/api/chat?profileSlug=${profileSlug}&afterSortOrder=${newest}&limit=${PAGE_SIZE}`);
      if (res.ok) {
        const data = await res.json();
        const newerMessages: ChatMessageData[] = data.messages || [];
        if (newerMessages.length > 0) {
          setMessages((prev) => [...prev, ...newerMessages]);
        }
        setHasNewer(Boolean(data.hasNewer));
      }
    } catch {}
    setLoadingNewer(false);
  }, [hasNewer, loadingNewer, messages, profileSlug]);

  async function scrollToLatest() {
    if (!hasNewer) {
      virtuosoRef.current?.scrollToIndex({ index: messages.length - 1 + firstItemIndex, align: "end", behavior: "smooth" });
      return;
    }
    setJumping(true);
    try {
      const res = await fetch(`/api/chat?profileSlug=${profileSlug}&limit=${PAGE_SIZE}`);
      if (res.ok) {
        const data = await res.json();
        const latest: ChatMessageData[] = data.messages || [];
        setMessages(latest);
        setTotalCount(data.totalCount || latest.length);
        setFirstItemIndex(Math.max(0, (data.totalCount || latest.length) - latest.length));
        setHasOlder(Boolean(data.hasOlder));
        setHasNewer(false);
        requestAnimationFrame(() => virtuosoRef.current?.scrollToIndex({ index: latest.length - 1, align: "end" }));
      }
    } catch {}
    setJumping(false);
  }

  function jumpToDate(dateStr: string) {
    const anchor = dateAnchors[dateStr];
    if (anchor !== undefined) {
      jumpToSortOrder(anchor, false);
    }
    setShowCalendar(false);
  }

  // Debounced WhatsApp-style global search: query the whole conversation
  // server-side (not just the currently loaded window), then step through
  // every match, fetching whatever window is needed as you go.
  useEffect(() => {
    const q = searchQuery.trim();
    if (!q) {
      setSearchMatches([]);
      setSearchIndex(-1);
      setSearchLoading(false);
      setSearchTruncated(false);
      setHighlightSortOrder(null);
      return;
    }
    setSearchLoading(true);
    const handle = setTimeout(async () => {
      try {
        const res = await fetch(`/api/chat/search?profileSlug=${profileSlug}&q=${encodeURIComponent(q)}`);
        if (res.ok) {
          const data = await res.json();
          const m: SearchMatch[] = data.matches || [];
          setSearchMatches(m);
          setSearchTruncated(Boolean(data.truncated));
          if (m.length > 0) {
            const startIdx = m.length - 1; // land on the most recent match first
            setSearchIndex(startIdx);
            jumpToSortOrder(m[startIdx].sortOrder, true);
          } else {
            setSearchIndex(-1);
            setHighlightSortOrder(null);
          }
        }
      } catch {}
      setSearchLoading(false);
    }, 350);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, profileSlug]);

  function goToMatch(newIndex: number) {
    if (searchMatches.length === 0) return;
    const wrapped = ((newIndex % searchMatches.length) + searchMatches.length) % searchMatches.length;
    setSearchIndex(wrapped);
    jumpToSortOrder(searchMatches[wrapped].sortOrder, true);
  }

  function closeSearch() {
    setSearchQuery("");
    setSearchMatches([]);
    setSearchIndex(-1);
    setHighlightSortOrder(null);
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

      {/* Header — a normal flex child, not sticky. It already sits below the
          fixed TopNav thanks to the layout's pt-14, and this component isn't
          the scroll container (Virtuoso is), so sticky positioning here only
          added a phantom gap above it. */}
      <div className="relative z-20 flex-shrink-0 border-b border-white/[0.06] bg-[#202c33]/95 backdrop-blur-xl">
        <div className="flex items-center gap-2 px-3 py-2.5 sm:gap-4 sm:px-6 sm:py-3.5">
          <button
            onClick={() => setShowMediaGallery(true)}
            className="flex min-w-0 flex-1 items-center gap-2 rounded-xl py-1 text-left transition-colors hover:bg-white/5 sm:gap-3"
            aria-label="View shared media and docs"
          >
            <div className="relative h-9 w-9 flex-shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-pink-500 to-rose-600 ring-2 ring-white/10 sm:h-10 sm:w-10">
              <span className="flex h-full w-full items-center justify-center text-sm font-bold text-white">C</span>
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-sm font-semibold text-white sm:text-base">Cherry 🍒</h2>
              <p className="truncate text-xs text-gray-400">{totalCount.toLocaleString()} messages · tap for media &amp; docs</p>
            </div>
          </button>

          <SearchBar
            query={searchQuery}
            onChange={setSearchQuery}
            loading={searchLoading}
            matchCount={searchMatches.length}
            currentIndex={searchIndex}
            truncated={searchTruncated}
            onNext={() => goToMatch(searchIndex + 1)}
            onPrev={() => goToMatch(searchIndex - 1)}
            onClose={closeSearch}
          />

          <button onClick={() => setShowCalendar((v) => !v)}
            className={`flex-shrink-0 rounded-full p-2 transition-colors hover:bg-white/5 hover:text-white ${showCalendar ? "bg-white/5 text-white" : "text-gray-400"}`}
            aria-label="Jump to date">
            <Calendar className="h-5 w-5" />
          </button>
          {showCalendar && (
            <ChatCalendar
              activeDates={availableDates}
              onSelectDate={jumpToDate}
              onClose={() => setShowCalendar(false)}
            />
          )}
          {showMediaGallery && (
            <ChatMediaGallery
              profileSlug={profileSlug}
              onGoToMessage={(sortOrder) => jumpToSortOrder(sortOrder, true)}
              onClose={() => setShowMediaGallery(false)}
            />
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="relative min-h-0 flex-1 overflow-hidden py-3">
        {jumping && (
          <div className="absolute inset-x-0 top-2 z-20 flex justify-center">
            <div className="flex items-center gap-2 rounded-full bg-black/70 px-3 py-1.5 text-xs text-white shadow-lg backdrop-blur-sm">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Jumping to message…
            </div>
          </div>
        )}
        <Virtuoso
          ref={virtuosoRef}
          firstItemIndex={firstItemIndex}
          data={messages}
          overscan={24}
          followOutput={(isAtBottom) => (pendingScroll ? false : isAtBottom ? "smooth" : false)}
          startReached={loadOlder}
          endReached={loadNewer}
          atBottomStateChange={setAtBottom}
          atBottomThreshold={80}
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

            const isHighlighted = highlightSortOrder !== null && msg.sortOrder === highlightSortOrder;

            return (
              <div key={msg.id} className="px-2 sm:px-6 lg:px-10 xl:px-14">
                {showDate && <DateSeparator date={msg.dateLabel?.split(" ")[0] || ""} />}
                <ChatBubble
                  message={msg}
                  isConsecutive={Boolean(isConsecutive && !showDate)}
                  searchQuery={searchQuery}
                  isHighlighted={isHighlighted}
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
            Footer: () => loadingNewer ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-gray-500" />
              </div>
            ) : null,
          }}
        />

        {!atBottom && (
          <button
            onClick={scrollToLatest}
            className="absolute bottom-4 right-4 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-[#202c33] text-white shadow-lg ring-1 ring-white/10 transition-transform hover:scale-105 sm:bottom-6 sm:right-6"
            aria-label="Jump to latest message"
          >
            <ChevronDown className="h-5 w-5" />
          </button>
        )}
      </div>
    </div>
  );
}
