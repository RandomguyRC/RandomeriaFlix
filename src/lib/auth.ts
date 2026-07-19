import { SignJWT, jwtVerify } from "jose";
import { nanoid } from "nanoid";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { readFileSync } from "fs";
import { join } from "path";

export const COOKIE_NAME = "session";

export interface SessionPayload {
  userId: string;
  role: "viewer" | "admin";
  expires: Date;
}

function getPasswordHashes() {
  const data = readFileSync(join(process.cwd(), "data", "passwords.json"), "utf-8");
  return JSON.parse(data) as { viewer: string; admin: string };
}

export async function encrypt(payload: SessionPayload) {
  return new SignJWT(payload)
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
    return payload as SessionPayload;
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

export async function createSession(role: "viewer" | "admin") {
  const expires = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);
  const session = await encrypt({ userId: nanoid(), role, expires });

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

export async function deleteSession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
