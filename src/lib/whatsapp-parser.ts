export interface ParsedAttachment {
  originalRef: string;
  kind: string;
}

export interface ParsedMessage {
  sortOrder: number;
  timestamp: Date | null;
  dateLabel: string;
  sender: string;
  senderType: "random" | "cherry" | "system";
  text: string;
  attachments: ParsedAttachment[];
}

/**
 * Extract unique sender names from raw chat text — used BEFORE a user
 * tells us which name is theirs. Returns detected sender names sorted
 * by first appearance (most likely: the other person first).
 */
/** Strip invisible formatting chars that WhatsApp often prepends. */
function stripInvisible(s: string): string {
  return s.replace(/[‎‏​‌‍﻿⁠-⁤]/g, "");
}

export function detectSenders(text: string): string[] {
  const senderSet = new Map<string, number>();
  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    if (!line.trim()) continue;
    const clean = stripInvisible(line);
    for (const regex of TIMESTAMP_REGEX) {
      const match = clean.match(regex);
      if (match) {
        const rest = clean.slice(match[0].length).trim();
        const colonIdx = rest.indexOf(":");
        if (colonIdx > 0) {
          const sender = rest.slice(0, colonIdx).trim();
          if (!senderSet.has(sender)) {
            senderSet.set(sender, senderSet.size);
          }
        }
        break;
      }
    }
  }

  return [...senderSet.entries()].sort((a, b) => a[1] - b[1]).map(([name]) => name);
}

// Multiple WhatsApp timestamp formats
const TIMESTAMP_REGEX = [
  // [DD/MM/YY, HH:MM:SS] or [DD/MM/YYYY, HH:MM:SS]
  /^\[?(\d{1,2}[/.\-]\d{1,2}[/.\-]\d{2,4}),?\s+(\d{1,2}:\d{2}(?::\d{2})?(?:\s*[AaPp][Mm])?)\]?\s*-?\s*/,
  // MM/DD/YYYY, HH:MM AM/PM
  /^\[?(\d{1,2}[/.\-]\d{1,2}[/.\-]\d{2,4}),?\s+(\d{1,2}:\d{2}(?::\d{2})?)\s*(?:[AaPp][Mm])?\]?\s*-?\s*/,
];

const SYSTEM_PATTERNS = [
  /messages and calls are end-to-end encrypted/i,
  /created this group/i,
  /added you/i,
  /removed you/i,
  /changed the subject/i,
  /changed this group/i,
  /left the group/i,
  /removed .* by admin/i,
];

function isSystemMessage(body: string): boolean {
  return SYSTEM_PATTERNS.some((p) => p.test(body));
}

function parseDateTime(dateStr: string, timeStr: string): Date | null {
  try {
    const parts = dateStr.split(/[/.-]/);
    if (parts.length !== 3) return null;
    let day = parseInt(parts[0], 10);
    let month = parseInt(parts[1], 10);
    let year = parseInt(parts[2], 10);
    if (year < 100) year += 2000;

    let hours = 0, minutes = 0;
    const tm = timeStr.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/i);
    if (tm) {
      hours = parseInt(tm[1], 10);
      minutes = parseInt(tm[2], 10);
      if (/pm/i.test(timeStr) && hours < 12) hours += 12;
      if (/am/i.test(timeStr) && hours === 12) hours = 0;
    }

    return new Date(year, month - 1, day, hours, minutes);
  } catch {
    return null;
  }
}

function attachmentKind(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  if (["jpg", "jpeg", "png", "webp", "gif", "heic", "heif"].includes(ext)) return "IMAGE";
  if (["mp4", "webm", "mov", "avi", "mkv", "3gp"].includes(ext)) return "VIDEO";
  if (["mp3", "wav", "ogg", "opus", "m4a", "aac", "flac"].includes(ext)) return "AUDIO";
  if (ext === "pdf") return "PDF";

  // WhatsApp export uses type-prefixed names like "00001234-PHOTO-2023-..." or "AUDIO-..."
  const typePrefix = filename.match(/^(?:000\d+-)?(STICKER|GIF|PHOTO|VIDEO|AUDIO)-/i);
  if (typePrefix) {
    const prefix = typePrefix[1].toUpperCase();
    if (prefix === "STICKER" || prefix === "GIF" || prefix === "PHOTO") return "IMAGE";
    if (prefix === "VIDEO") return "VIDEO";
    if (prefix === "AUDIO") return "AUDIO";
  }

  return "OTHER";
}

function extractAttachments(body: string): { text: string; attachments: ParsedAttachment[] } {
  const attachments: ParsedAttachment[] = [];
  const lines = body.split("\n");
  const cleaned: string[] = [];

  for (const line of lines) {
    let rest = line;
    let matched = false;

    rest = rest.replace(/<attached:\s*([^>]+)>/gi, (_, filename: string) => {
      const originalRef = filename.trim();
      if (originalRef) attachments.push({ originalRef, kind: attachmentKind(originalRef) });
      matched = true;
      return "";
    });

    const attachedFile = rest.match(/^(.+?)\s+\((?:file\s+)?attached\)$/i);
    if (attachedFile?.[1]) {
      const originalRef = attachedFile[1].trim();
      attachments.push({ originalRef, kind: attachmentKind(originalRef) });
      matched = true;
      rest = "";
    }

    if (/^(image|video|audio|gif|sticker) omitted$/i.test(rest.trim())) {
      matched = true;
      rest = "";
    }

    const trimmed = rest.trim();
    if (trimmed || !matched) cleaned.push(rest);
  }

  return {
    text: cleaned.join("\n").trim(),
    attachments,
  };
}

export function parseWhatsAppChat(
  text: string,
  myNames: string[],
  friendNames: string[]
): ParsedMessage[] {
  const lines = text.split(/\r?\n/);
  const messages: ParsedMessage[] = [];
  let sortOrder = 0;

  let currentSender = "";
  let currentBody: string[] = [];
  let currentTimestamp: Date | null = null;
  let currentDateLabel = "";

  function flush() {
    if (currentBody.length === 0) return;
    const body = currentBody.join("\n").trim();
    if (!body) return;

    const { text: cleanText, attachments } = extractAttachments(body);
    if (!cleanText && attachments.length === 0) return;

    const lower = currentSender.toLowerCase();
    let senderType: "random" | "cherry" | "system" = "system";

    if (currentSender && !isSystemMessage(body)) {
      if (myNames.some((n) => lower.includes(n.toLowerCase()))) {
        senderType = "random";
      } else if (friendNames.some((n) => lower.includes(n.toLowerCase()))) {
        senderType = "cherry";
      } else {
        senderType = "cherry";
      }
    }

    messages.push({
      sortOrder: sortOrder++,
      timestamp: currentTimestamp,
      dateLabel: currentDateLabel,
      sender: currentSender || "System",
      senderType,
      text: cleanText,
      attachments,
    });
    currentBody = [];
  }

  for (const line of lines) {
    if (!line.trim()) continue;

    // Strip invisible formatting chars (LRM, zero-width spaces, etc.)
    const cleanLine = stripInvisible(line);

    let matched = false;
    for (const regex of TIMESTAMP_REGEX) {
      const match = cleanLine.match(regex);
      if (match) {
        flush();
        currentDateLabel = `${match[1]} ${match[2]}`;
        currentTimestamp = parseDateTime(match[1], match[2]);

        // Everything after the timestamp match is "sender: message"
        const rest = cleanLine.slice(match[0].length).trim();
        const colonIdx = rest.indexOf(":");

        if (colonIdx > 0) {
          currentSender = rest.slice(0, colonIdx).trim();
          currentBody = [rest.slice(colonIdx + 1).trim()];
        } else {
          // No colon — could be a system message continuation
          currentSender = "";
          currentBody = [rest];
        }

        matched = true;
        break;
      }
    }

    if (!matched) {
      // Continuation of previous message
      currentBody.push(cleanLine);
    }
  }

  flush();
  return messages;
}
