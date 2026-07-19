"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { Search, X, ChevronUp, ChevronDown } from "lucide-react";

export default function SearchBar({
  query,
  onChange,
  matchCount,
  currentIndex,
  onNext,
  onPrev,
}: {
  query: string;
  onChange: (q: string) => void;
  matchCount: number;
  currentIndex: number;
  onNext: () => void;
  onPrev: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="relative">
      {!expanded ? (
        <button
          onClick={() => setExpanded(true)}
          className="rounded-full p-2 text-gray-400 transition-colors hover:bg-white/5 hover:text-white"
        >
          <Search className="h-5 w-5" />
        </button>
      ) : (
        <motion.div
          initial={{ width: 40, opacity: 0 }}
          animate={{ width: 240, opacity: 1 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="flex items-center gap-2"
        >
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
            <input
              autoFocus
              type="text"
              value={query}
              onChange={(e) => onChange(e.target.value)}
              placeholder="Search..."
              className="w-full rounded-full bg-white/[0.06] pl-9 pr-8 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-white/10"
            />
            {query && (
              <button onClick={() => onChange("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          {query && matchCount > 0 && (
            <div className="flex items-center gap-1">
              <button onClick={onPrev} className="rounded p-1 text-gray-400 hover:text-white">
                <ChevronUp className="h-4 w-4" />
              </button>
              <span className="text-[11px] text-gray-400 min-w-[40px] text-center">
                {currentIndex + 1}/{matchCount}
              </span>
              <button onClick={onNext} className="rounded p-1 text-gray-400 hover:text-white">
                <ChevronDown className="h-4 w-4" />
              </button>
            </div>
          )}
          <button onClick={() => { setExpanded(false); onChange(""); }} className="text-gray-500 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </motion.div>
      )}
    </div>
  );
}
