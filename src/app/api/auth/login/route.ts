import { NextRequest, NextResponse } from "next/server";
import { createSession, verifyPassword } from "@/lib/auth";
import { checkRateLimit, recordFailedAttempt, clearAttempts, getClientIp } from "@/lib/rate-limit";
import { z } from "zod";

const loginSchema = z.object({
  password: z.string().min(1, "Password is required"),
});

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);

  try {
    const { allowed, retryAfterSeconds } = checkRateLimit(ip);
    if (!allowed) {
      return NextResponse.json(
        {
          error: `Too many failed attempts. Try again in ${Math.ceil(
            (retryAfterSeconds ?? 60) / 60
          )} minute(s).`,
        },
        { status: 429, headers: { "Retry-After": String(retryAfterSeconds ?? 60) } }
      );
    }

    const body = await request.json();
    const { password } = loginSchema.parse(body);

    const role = await verifyPassword(password);

    if (!role) {
      recordFailedAttempt(ip);
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    clearAttempts(ip);
    await createSession(role);

    const redirectTo = role === "admin" ? "/admin" : "/intro";

    return NextResponse.json({ redirectTo });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error("Login API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
