import { SignJWT, jwtVerify } from "jose";
import { nanoid } from "nanoid";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { readFileSync } from "fs";
import { join } from "path";
import { prisma } from "@/lib/db";
import { getSessionMetadata } from "@/lib/session-tracking";

export const COOKIE_NAME = "session";

export interface SessionPayload {
  userId: string;
  role: "viewer" | "admin";
  expires: Date;
  sessionId?: string;
}

function getPasswordHashes() {
  const data = readFileSync(join(process.cwd(), "data", "passwords.json"), "utf-8");
  return JSON.parse(data) as { viewer: string; admin: string };
}

export async function encrypt(payload: SessionPayload) {
  return new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256" })
    .setJti(nanoid())
    .setIssuedAt()
    .setExpirationTime(payload.expires)
    .sign(new TextEncoder().encode(process.env.AUTH_SECRET!));
}

export async function decrypt(
  session: string | undefined = ""
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(
      session,
      new TextEncoder().encode(process.env.AUTH_SECRET!),
      {
        algorithms: ["HS256"],
      }
    );
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function verifyPassword(
  inputPassword: string
): Promise<"viewer" | "admin" | null> {
  const { viewer, admin } = getPasswordHashes();

  if (await bcrypt.compare(inputPassword, admin)) {
    return "admin";
  }
  if (await bcrypt.compare(inputPassword, viewer)) {
    return "viewer";
  }
  return null;
}

export async function createSession(
  role: "viewer" | "admin",
  request?: Request,
  initialPath = "/"
) {
  const expires = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);
  let sessionId: string;

  if (request) {
    try {
      const metadata = await getSessionMetadata(request, initialPath);

      // Reuse an ended session from the same device (IP + user agent + role)
      // instead of creating a new row every login/logout cycle
      const existing = await prisma.appSession.findFirst({
        where: {
          role,
          ipAddress: metadata.ipAddress,
          userAgent: metadata.userAgent,
          endedAt: { not: null },
        },
        orderBy: { lastActiveAt: "desc" },
      });

      if (existing) {
        sessionId = existing.id;
        await prisma.appSession.update({
          where: { id: existing.id },
          data: {
            ...metadata,
            firstSeenAt: existing.firstSeenAt,
            lastActiveAt: new Date(),
            endedAt: null,
          },
        });
      } else {
        sessionId = nanoid();
        await prisma.appSession.create({
          data: {
            id: sessionId,
            role,
            ...metadata,
          },
        });
      }
    } catch (error) {
      console.warn("Session tracking row could not be created:", error);
      sessionId = nanoid();
    }
  } else {
    sessionId = nanoid();
  }

  const session = await encrypt({ userId: nanoid(), role, expires, sessionId });

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, session, {
    expires,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    sameSite: "lax",
  });
}

export async function readSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const session = cookieStore.get(COOKIE_NAME)?.value;
  return decrypt(session);
}

export async function readSessionWithCheck(): Promise<SessionPayload | null> {
  const payload = await readSession();
  if (!payload?.sessionId) return payload;

  const appSession = await prisma.appSession
    .findUnique({ where: { id: payload.sessionId }, select: { endedAt: true } })
    .catch(() => null);

  if (appSession?.endedAt) return null;

  return payload;
}

export async function endSession(sessionId?: string) {
  if (!sessionId) return;

  await prisma.appSession
    .update({
      where: { id: sessionId },
      data: { endedAt: new Date() },
    })
    .catch(() => null);
}

export async function deleteSession() {
  const currentSession = await readSession();
  await endSession(currentSession?.sessionId);

  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
