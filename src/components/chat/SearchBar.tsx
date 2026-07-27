"use client";

import { useState, useRef, useEffect } from "react";
import { motion } from "motion/react";
import { Search, X, ChevronUp, ChevronDown, Loader2 } from "lucide-react";

export default function SearchBar({
  query,
  onChange,
  loading,
  matchCount,
  currentIndex,
  truncated,
  onNext,
  onPrev,
  onClose,
}: {
  query: string;
  onChange: (q: string) => void;
  loading: boolean;
  matchCount: number;
  currentIndex: number;
  truncated: boolean;
  onNext: () => void;
  onPrev: () => void;
  onClose: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (expanded) inputRef.current?.focus();
  }, [expanded]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      if (e.shiftKey) onPrev();
      else onNext();
    } else if (e.key === "Escape") {
      close();
    }
  }

  function close() {
    setExpanded(false);
    onClose();
  }

  const hasQuery = query.trim().length > 0;
  const hasResults = hasQuery && !loading && matchCount > 0;
  const noResults = hasQuery && !loading && matchCount === 0;

  return (
    <div className="relative flex-shrink-0">
      {!expanded ? (
        <button
          onClick={() => setExpanded(true)}
          className="rounded-full p-2 text-gray-400 transition-colors hover:bg-white/5 hover:text-white"
          aria-label="Search messages"
        >
          <Search className="h-5 w-5" />
        </button>
      ) : (
        <motion.div
          initial={{ width: 40, opacity: 0 }}
          animate={{ width: "min(280px, 62vw)", opacity: 1 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="flex items-center gap-1"
        >
          <div className="relative min-w-0 flex-1">
            {loading ? (
              <Loader2 className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-gray-500" />
            ) : (
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-500" />
            )}
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search messages"
              className="w-full min-w-0 rounded-full bg-white/[0.08] py-2 pl-9 pr-8 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-white/20"
            />
            {query && (
              <button onClick={() => onChange("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {(hasResults || noResults) && (
            <div className="flex flex-shrink-0 items-center gap-0.5">
              <span className="min-w-[38px] text-center text-[11px] tabular-nums text-gray-400">
                {hasResults ? `${currentIndex + 1}/${matchCount}${truncated ? "+" : ""}` : "0/0"}
              </span>
              <button
                onClick={onPrev}
                disabled={!hasResults}
                className="rounded p-1 text-gray-400 hover:text-white disabled:opacity-30"
                aria-label="Previous match (older)"
              >
                <ChevronUp className="h-4 w-4" />
              </button>
              <button
                onClick={onNext}
                disabled={!hasResults}
                className="rounded p-1 text-gray-400 hover:text-white disabled:opacity-30"
                aria-label="Next match (newer)"
              >
                <ChevronDown className="h-4 w-4" />
              </button>
            </div>
          )}

          <button onClick={close} className="shrink-0 text-gray-500 hover:text-white" aria-label="Close search">
            <X className="h-4 w-4" />
          </button>
        </motion.div>
      )}
    </div>
  );
}
