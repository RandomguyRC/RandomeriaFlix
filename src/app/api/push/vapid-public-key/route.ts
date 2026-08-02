import { NextResponse } from "next/server";
import { readSession } from "@/lib/auth";
import { getVapidPublicKey } from "@/lib/push";

export async function GET() {
  const session = await readSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const publicKey = getVapidPublicKey();
  return NextResponse.json({ publicKey });
}
