import { NextResponse } from "next/server";
import { readSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

// /api/admin/settings is admin-only and returns everything. This route is
// for viewer-facing pages (like the storyline ending question) that need a
// couple of settings but shouldn't get the full admin settings dump — so
// only keys in this list are ever returned here.
const PUBLIC_KEYS = [
  "storylineQuestion",
  "storylineAnswer1",
  "storylineAnswer2",
  "storylineAnswer3",
  "storylineEmptyProfileSlug",
];

export async function GET() {
  const session = await readSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const settings = await prisma.siteSetting.findMany({
    where: { key: { in: PUBLIC_KEYS } },
  });

  const map: Record<string, string> = {};
  settings.forEach((s) => (map[s.key] = s.value));

  return NextResponse.json(map);
}
