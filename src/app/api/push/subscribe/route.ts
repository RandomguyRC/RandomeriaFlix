import { NextRequest, NextResponse } from "next/server";
import { readSession } from "@/lib/auth";
import { saveSubscription, removeSubscription, hasSubscription } from "@/lib/push";

export async function GET() {
  const session = await readSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const subscribed = await hasSubscription(session.role);
  return NextResponse.json({ subscribed });
}

export async function POST(request: NextRequest) {
  const session = await readSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const endpoint = body?.endpoint;
  const keys = body?.keys;

  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
  }

  await saveSubscription(session.role, { endpoint, keys: { p256dh: keys.p256dh, auth: keys.auth } });
  return NextResponse.json({ message: "Subscribed" });
}

export async function DELETE(request: NextRequest) {
  const session = await readSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const endpoint = body?.endpoint;
  if (!endpoint) {
    return NextResponse.json({ error: "Endpoint required" }, { status: 400 });
  }

  await removeSubscription(session.role, endpoint);
  return NextResponse.json({ message: "Unsubscribed" });
}
