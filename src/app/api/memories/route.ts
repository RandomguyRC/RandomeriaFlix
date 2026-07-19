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

  const textMemories = await prisma.textMemory.findMany({
    where: { profileId: profile.id },
    orderBy: { sortOrder: "asc" },
  });

  const memories = textMemories.map((m) => ({
    id: m.id,
    title: m.title,
    paragraph: m.paragraph,
    owner: m.owner as "random" | "cherry",
    createdAt: m.createdAt.toISOString(),
  }));

  // Fetch root descriptions from settings
  const [randomSetting, cherrySetting] = await Promise.all([
    prisma.siteSetting.findUnique({ where: { key: "randomDescription" } }),
    prisma.siteSetting.findUnique({ where: { key: "cherryDescription" } }),
  ]);

  return NextResponse.json({
    memories,
    randomDescription: randomSetting?.value || "",
    cherryDescription: cherrySetting?.value || "",
  });
}
