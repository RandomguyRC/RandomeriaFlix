import { NextResponse } from "next/server";
import { readSession } from "@/lib/auth";
import { sendPushToRole, isPushConfigured } from "@/lib/push";

export async function POST() {
  const session = await readSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isPushConfigured()) {
    return NextResponse.json({ error: "Push notifications aren't set up on the server yet" }, { status: 400 });
  }

  await sendPushToRole(session.role, {
    title: "RandomeriaFlix",
    body: "Push notifications are working! 🎉",
    url: "/",
    tag: "randomeriaflix-test",
  });

  return NextResponse.json({ message: "Test notification sent" });
}
