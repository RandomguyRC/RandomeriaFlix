import { NextRequest, NextResponse } from "next/server";
import { readSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { DEFAULT_WISHLIST, WishlistData } from "@/app/api/wishlist/route";

const SETTING_KEY = "wishlist";

export async function GET() {
  const session = await readSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const row = await prisma.siteSetting.findUnique({ where: { key: SETTING_KEY } });
  if (!row) {
    return NextResponse.json(DEFAULT_WISHLIST);
  }

  try {
    const data = JSON.parse(row.value) as WishlistData;
    return NextResponse.json({ ...DEFAULT_WISHLIST, ...data });
  } catch {
    return NextResponse.json(DEFAULT_WISHLIST);
  }
}

export async function POST(request: NextRequest) {
  const session = await readSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as WishlistData;

  const clean: WishlistData = {
    wantedTitle: String(body.wantedTitle ?? DEFAULT_WISHLIST.wantedTitle),
    actualTitle: String(body.actualTitle ?? DEFAULT_WISHLIST.actualTitle),
    wanted: Array.isArray(body.wanted)
      ? body.wanted.map((i) => ({ id: String(i.id), text: String(i.text) }))
      : [],
    actual: Array.isArray(body.actual)
      ? body.actual.map((i) => ({ id: String(i.id), text: String(i.text) }))
      : [],
  };

  await prisma.siteSetting.upsert({
    where: { key: SETTING_KEY },
    update: { value: JSON.stringify(clean) },
    create: { key: SETTING_KEY, value: JSON.stringify(clean) },
  });

  return NextResponse.json(clean);
}
