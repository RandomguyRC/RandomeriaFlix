import { NextRequest, NextResponse } from "next/server";
import { readSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

// dateLabel is stored as "DD/MM/YY HH:MM[:SS]" (whatever WhatsApp exported).
// Turn the date part into a sortable number so chronological order doesn't
// depend on string comparison (which breaks because "1/12/24" < "9/01/24"
// lexicographically even though September comes before December).
function dateSortKey(datePart: string): number {
  const [ddRaw, mmRaw, yyRaw] = datePart.split("/");
  const dd = parseInt(ddRaw, 10) || 0;
  const mm = parseInt(mmRaw, 10) || 0;
  let yy = parseInt(yyRaw, 10) || 0;
  if (yy < 100) yy += 2000;
  return yy * 10000 + mm * 100 + dd;
}

// WhatsApp exports are inconsistent about zero-padding ("5/6/24" vs
// "05/06/24") and about 2 vs 4 digit years, depending on the phone/export
// locale. The calendar UI always builds its lookup keys in a canonical
// zero-padded "DD/MM/YY" form, so if we hand back dates in whatever raw
// form they were stored in, the calendar's "does this day have messages"
// and "jump to this date" lookups silently miss almost every day. Normalize
// here so every date we return matches exactly what the calendar expects,
// regardless of how the source export formatted it.
function normalizeDatePart(datePart: string): string {
  const [ddRaw, mmRaw, yyRaw] = datePart.split("/");
  const dd = parseInt(ddRaw, 10) || 0;
  const mm = parseInt(mmRaw, 10) || 0;
  let yy = parseInt(yyRaw, 10) || 0;
  if (yy >= 100) yy = yy % 100; // 4-digit year -> 2-digit, matches calendar's format
  return `${String(dd).padStart(2, "0")}/${String(mm).padStart(2, "0")}/${String(yy).padStart(2, "0")}`;
}

// The dates/anchors index requires scanning every message in the chat
// (there's no way around that — it needs to see all of them to build a
// full day-by-day map). For a large imported history that's real work, and
// this endpoint is called on every single page load, even though the
// result never changes unless the chat is re-imported. Since this app runs
// as a long-lived PM2 process (not a serverless function that resets
// between requests), a simple module-level cache is safe and persists
// across requests — keyed by import id + message count, so it's still
// correctly invalidated if a new/updated import ever changes the data.
type DatesCacheEntry = {
  messageCount: number;
  dates: string[];
  anchors: Record<string, number>;
};
const datesCache = new Map<string, DatesCacheEntry>();

export async function GET(request: NextRequest) {
  const session = await readSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const profileSlug = searchParams.get("profileSlug");

  if (!profileSlug) {
    return NextResponse.json({ error: "profileSlug required" }, { status: 400 });
  }

  const profile = await prisma.profile.findUnique({
    where: { slug: profileSlug },
  });

  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  const chatImport = await prisma.chatImport.findFirst({
    where: { profileId: profile.id },
    orderBy: { createdAt: "desc" },
  });

  if (!chatImport) {
    return NextResponse.json({ dates: [], anchors: {} });
  }

  // Cheap count check first — if it matches the cached entry, the index is
  // still valid and we can skip the full scan entirely.
  const messageCount = await prisma.chatMessage.count({ where: { importId: chatImport.id } });
  const cached = datesCache.get(chatImport.id);
  if (cached && cached.messageCount === messageCount) {
    return NextResponse.json({
      dates: cached.dates,
      anchors: cached.anchors,
      totalMessages: cached.messageCount,
    });
  }

  // Get date + sortOrder for ALL messages (not just the paginated window) so
  // we can build both the list of active dates and a "jump anchor" — the
  // sortOrder of the first message on that date — for each one.
  const allMessages = await prisma.chatMessage.findMany({
    where: { importId: chatImport.id },
    select: { dateLabel: true, sortOrder: true },
    orderBy: { sortOrder: "asc" },
  });

  const dateSet = new Set<string>();
  const anchors: Record<string, number> = {};

  for (const msg of allMessages) {
    if (!msg.dateLabel) continue;
    const rawDatePart = msg.dateLabel.split(" ")[0];
    if (!rawDatePart) continue;
    const datePart = normalizeDatePart(rawDatePart);
    dateSet.add(datePart);
    // Messages are already ordered ascending by sortOrder, so the first
    // time we see a date is the earliest message on that date.
    if (anchors[datePart] === undefined) anchors[datePart] = msg.sortOrder;
  }

  const dates = Array.from(dateSet).sort((a, b) => dateSortKey(a) - dateSortKey(b));

  datesCache.set(chatImport.id, { messageCount: allMessages.length, dates, anchors });

  return NextResponse.json({
    dates,
    anchors,
    totalMessages: allMessages.length,
  });
}
