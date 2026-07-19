export interface ParsedMessage {
  sortOrder: number;
  timestamp: Date | null;
  dateLabel: string;
  sender: string;
  senderType: "random" | "cherry" | "system";
  text: string;
}

// Multiple WhatsApp timestamp formats
const TIMESTAMP_REGEX = [
  // [DD/MM/YY, HH:MM:SS] or [DD/MM/YYYY, HH:MM:SS]
  /^\[?(\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{2,4}),?\s+(\d{1,2}:\d{2}(?::\d{2})?(?:\s*[AaPp][Mm])?)\]?\s*-?\s*/,
  // MM/DD/YYYY, HH:MM AM/PM
  /^\[?(\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{2,4}),?\s+(\d{1,2}:\d{2}(?::\d{2})?)\s*(?:[AaPp][Mm])?\]?\s*-?\s*/,
];

const SYSTEM_PATTERNS = [
  /messages and calls are end-to-end encrypted/i,
  /created this group/i,
  /added you/i,
  /removed you/i,
  /changed the subject/i,
  /changed this group/i,
  /left$/i,
];

function isSystemMessage(body: string): boolean {
  return SYSTEM_PATTERNS.some((p) => p.test(body));
}

function parseDateTime(dateStr: string, timeStr: string): Date | null {
  try {
    const parts = dateStr.split(/[/.\-]/);
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

    const lower = currentSender.toLowerCase();
    let senderType: "random" | "cherry" | "system" = "system";

    if (currentSender) {
      if (myNames.some((n) => lower.includes(n.toLowerCase()))) {
        senderType = "random";
      } else if (friendNames.some((n) => lower.includes(n.toLowerCase()))) {
        senderType = "cherry";
      }
    }

    messages.push({
      sortOrder: sortOrder++,
      timestamp: currentTimestamp,
      dateLabel: currentDateLabel,
      sender: currentSender || "System",
      senderType,
      text: body,
    });
    currentBody = [];
  }

  for (const line of lines) {
    if (!line.trim()) continue;

    // Clean line — remove zero-width spaces and other weird chars
    const cleanLine = line.replace(/[​-‍﻿]/g, "");

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
