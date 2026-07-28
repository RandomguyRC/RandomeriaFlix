import { jwtVerify } from "jose";

export const COOKIE_NAME = "session";

export interface SessionPayload {
  userId: string;
  role: "viewer" | "admin";
  expires: Date;
  sessionId?: string;
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
