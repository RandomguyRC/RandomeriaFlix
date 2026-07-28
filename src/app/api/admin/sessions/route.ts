import { NextResponse } from "next/server";
import { readSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

const ACTIVE_WINDOW_MS = 5 * 60 * 1000;
const RECENT_LIMIT = 100;

function isSessionActive(lastActiveAt: Date, endedAt: Date | null, now: number) {
  return !endedAt && now - lastActiveAt.getTime() <= ACTIVE_WINDOW_MS;
}

export async function GET() {
  const session = await readSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sessions = await prisma.appSession.findMany({
    orderBy: { lastActiveAt: "desc" },
    take: RECENT_LIMIT,
  });

  const now = Date.now();
  const rows = sessions.map((item) => ({
    ...item,
    isActive: isSessionActive(item.lastActiveAt, item.endedAt, now),
  }));

  const active = rows.filter((item) => item.isActive);

  return NextResponse.json({
    summary: {
      activeTotal: active.length,
      activeAdmins: active.filter((item) => item.role === "admin").length,
      activeViewers: active.filter((item) => item.role === "viewer").length,
      recentTotal: rows.length,
    },
    sessions: rows,
  });
}
