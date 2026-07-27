import { NextRequest, NextResponse } from "next/server";
import { readSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

// Cap how many matches we ever send to the client. WhatsApp-style search
// only needs to feel complete near the recent end, so when a query has more
// hits than this we keep the MOST RECENT ones (see query below) and flag
// `truncated: true` so the UI can show "99+" instead of a false total.
const MAX_MATCHES = 300;
const SNIPPET_RADIUS = 34;

function buildSnippet(body: string, query: string): string {
  const lower = body.toLowerCase();
  const idx = lower.indexOf(query.toLowerCase());
  if (idx === -1) {
    return body.length > SNIPPET_RADIUS * 2 ? `${body.slice(0, SNIPPET_RADIUS * 2)}…` : body;
  }
  const start = Math.max(0, idx - SNIPPET_RADIUS);
  const end = Math.min(body.length, idx + query.length + SNIPPET_RADIUS);
  let snippet = body.slice(start, end);
  if (start > 0) snippet = `…${snippet}`;
  if (end < body.length) snippet = `${snippet}…`;
  return snippet;
}

export async function GET(request: NextRequest) {
  const session = await readSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const profileSlug = searchParams.get("profileSlug");
  const q = (searchParams.get("q") || "").trim();

  if (!profileSlug) {
    return NextResponse.json({ error: "profileSlug required" }, { status: 400 });
  }

  if (!q) {
    return NextResponse.json({ matches: [], truncated: false });
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
    return NextResponse.json({ matches: [], truncated: false });
  }

  // Fetch the MOST RECENT matches first (desc), capped at MAX_MATCHES + 1
  // (the extra one just tells us whether there's more beyond the cap).
  // We then reverse to ascending order so the UI's "start at the newest
  // match, step backwards" navigation lines up correctly.
  const rows = await prisma.chatMessage.findMany({
    where: {
      importId: chatImport.id,
      systemEvent: false,
      body: { contains: q },
    },
    orderBy: { sortOrder: "desc" },
    take: MAX_MATCHES + 1,
    select: { id: true, sortOrder: true, dateLabel: true, body: true },
  });

  const truncated = rows.length > MAX_MATCHES;
  const trimmed = truncated ? rows.slice(0, MAX_MATCHES) : rows;
  const matches = trimmed
    .slice()
    .reverse()
    .map((row) => ({
      id: row.id,
      sortOrder: row.sortOrder,
      dateLabel: row.dateLabel,
      snippet: buildSnippet(row.body || "", q),
    }));

  return NextResponse.json({ matches, truncated });
}
