import { NextRequest, NextResponse } from "next/server";
import { readSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  const session = await readSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const profileSlug = searchParams.get("profileSlug");

  if (!profileSlug) {
    return NextResponse.json({ error: "profileSlug required" }, { status: 400 });
  }

  const profile = await prisma.profile.findUnique({
    where: { slug: profileSlug },
  });

  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  const events = await prisma.storyEvent.findMany({
    where: { profileId: profile.id },
    include: { asset: true },
    orderBy: { sortOrder: "asc" },
  });

  return NextResponse.json(events);
}
