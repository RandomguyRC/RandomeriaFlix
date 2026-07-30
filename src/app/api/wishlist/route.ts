import { NextResponse } from "next/server";
import { readSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

const SETTING_KEY = "wishlist";

export interface WishlistItem {
  id: string;
  text: string;
}

export interface WishlistData {
  wantedTitle: string;
  actualTitle: string;
  wanted: WishlistItem[];
  actual: WishlistItem[];
}

export const DEFAULT_WISHLIST: WishlistData = {
  wantedTitle: "Everything I Dream Of",
  actualTitle: "Actually Happening",
  wanted: [],
  actual: [],
};

export async function GET() {
  const session = await readSession();
  if (!session) {
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
