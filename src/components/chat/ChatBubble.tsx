"use client";

import { useMemo, useState } from "react";
import ChatAttachment from "./ChatAttachment";
import MediaLightbox from "./MediaLightbox";
import type { ChatAttachmentData, ChatMessageData } from "./types";

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
  message: ChatMessageData;
  isConsecutive: boolean;
  searchQuery?: string;
  isHighlighted?: boolean;
}) {
  const [preview, setPreview] = useState<ChatAttachmentData | null>(null);
  const isRandom = message.senderType === "random";
  const isSystem = message.senderType === "system";
  const hasText = Boolean(message.text?.trim());

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
    <>
      <div
        className={`flex ${isRandom ? "justify-end" : "justify-start"} ${isConsecutive ? "mt-1" : "mt-3"}`}
      >
        <div
          className={`relative max-w-[82%] px-3 py-2 shadow-sm transition-all duration-300 sm:max-w-[70%] lg:max-w-[56%] ${
            isRandom
              ? "rounded-2xl rounded-br-sm bg-gradient-to-br from-[#005c4b] to-[#004d3f] text-gray-50"
              : "rounded-2xl rounded-bl-sm bg-gradient-to-br from-[#202c33] to-[#1b252b] text-gray-100"
          } ${isEmoji && hasText ? "text-3xl py-3 px-4" : ""} ${
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

          {message.attachments?.map((attachment) => (
            <ChatAttachment key={attachment.id} attachment={attachment} onPreview={setPreview} />
          ))}

          {hasText && (
            <p className={`${isEmoji ? "text-3xl leading-tight" : "text-[15px] leading-[1.45]"} ${message.attachments?.length ? "mt-2" : ""} whitespace-pre-wrap break-words`}>
              {searchQuery ? highlightText(message.text, searchQuery) : message.text}
            </p>
          )}
          <p className="mt-1 text-right text-[10px] text-white/35">
            {message.dateLabel ? message.dateLabel.split(" ").slice(1).join(" ") : ""}
          </p>
        </div>
      </div>
      {preview && <MediaLightbox attachment={preview} onClose={() => setPreview(null)} />}
    </>
  );
}
