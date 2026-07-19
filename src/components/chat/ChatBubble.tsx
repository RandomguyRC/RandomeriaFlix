"use client";

import { useMemo } from "react";
import { motion } from "motion/react";

interface ChatMessage {
  id: string;
  dateLabel: string | null;
  sender: string;
  senderType: string;
  text: string;
}

function highlightText(text: string, query: string) {
  if (!query.trim()) return text;
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
  const parts = text.split(regex);
  return parts.map((part, i) =>
    regex.test(part) ? (
      <span key={i} className="rounded bg-yellow-500/20 px-0.5 text-yellow-300">
        {part}
      </span>
    ) : (
      part
    )
  );
}

function isEmojiOnly(text: string): boolean {
  const cleaned = text.replace(/[\s​-‍﻿‌‎‏⁠-⁩\uD83C-􏰀-\uDFFF]/g, "");
  const emojiRegex = /^[\p{Emoji}\p{Emoji_Modifier}\p{Emoji_Modifier_Base}\p{Emoji_Component}\p{Emoji_Modifier_Base}\p{Emoji_Presentation}\p{Extended_Pictographic}‍️⃣]*$/u;
  return emojiRegex.test(cleaned) && cleaned.length > 0;
}

export default function ChatBubble({
  message,
  isConsecutive,
  searchQuery,
  isHighlighted,
}: {
  message: ChatMessage;
  isConsecutive: boolean;
  searchQuery?: string;
  isHighlighted?: boolean;
}) {
  const isRandom = message.senderType === "random";
  const isSystem = message.senderType === "system";

  const isEmoji = useMemo(() => isEmojiOnly(message.text), [message.text]);

  if (isSystem) {
    return (
      <div className="flex justify-center py-2">
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.04] px-4 py-2 text-center text-xs text-gray-400 backdrop-blur-sm shadow-sm max-w-[85%]">
          {message.text}
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 6, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={`flex ${isRandom ? "justify-end" : "justify-start"} ${isConsecutive ? "mt-1" : "mt-3"}`}
    >
      <div
        className={`relative max-w-[65%] px-4 py-2.5 shadow-sm transition-all duration-300 ${
          isRandom
            ? "rounded-2xl rounded-br-sm bg-gradient-to-br from-[#005c4b] to-[#004d3f] text-gray-50"
            : "rounded-2xl rounded-bl-sm bg-gradient-to-br from-[#2a2d35] to-[#23262e] text-gray-100"
        } ${isEmoji ? "text-3xl py-3 px-4" : ""} ${
          isHighlighted ? "ring-2 ring-yellow-400/60 shadow-[0_0_12px_rgba(250,204,21,0.25)]" : ""
        }`}
      >
        {!isConsecutive && message.sender && (
          <p
            className="mb-1 text-xs font-semibold"
            style={{ color: isRandom ? "#25d366" : "#60a5fa" }}
          >
            {message.sender}
          </p>
        )}
        <p className={`${isEmoji ? "text-3xl leading-tight" : "text-[15px] leading-[1.6]"} whitespace-pre-wrap break-words`}>
          {searchQuery ? highlightText(message.text, searchQuery) : message.text}
        </p>
        <p className="mt-1 text-right text-[10px] text-white/30">
          {message.dateLabel ? message.dateLabel.split(" ").slice(1).join(" ") : ""}
        </p>
      </div>
    </motion.div>
  );
}
