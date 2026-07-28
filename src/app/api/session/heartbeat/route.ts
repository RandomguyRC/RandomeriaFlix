import { NextRequest, NextResponse } from "next/server";
import { readSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getSessionMetadata, normalizePath } from "@/lib/session-tracking";

const WRITE_THROTTLE_MS = 30 * 1000;

export async function POST(request: NextRequest) {
  const session = await readSession();
  if (!session?.sessionId) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const path = normalizePath(body.path);
  const existing = await prisma.appSession.findUnique({
    where: { id: session.sessionId },
  });

  if (!existing) {
    const metadata = await getSessionMetadata(request, path);
    await prisma.appSession.create({
      data: {
        id: session.sessionId,
        role: session.role,
        ...metadata,
      },
    });

    return NextResponse.json({ ok: true });
  }

  const now = new Date();
  const shouldWrite =
    now.getTime() - existing.lastActiveAt.getTime() > WRITE_THROTTLE_MS ||
    existing.lastPath !== path ||
    existing.endedAt !== null;

  if (shouldWrite) {
    const metadata = await getSessionMetadata(request, path);
    await prisma.appSession.update({
      where: { id: session.sessionId },
      data: {
        ...metadata,
        lastActiveAt: now,
        endedAt: null,
      },
    });
  }

  return NextResponse.json({ ok: true });
}
