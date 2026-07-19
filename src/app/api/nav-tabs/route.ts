import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { readSession } from "@/lib/auth";

export async function GET() {
  const session = await readSession();
  if (!session) {
    return NextResponse.json([]);
  }

  const tabs = await prisma.navTab.findMany({
    where: { isEnabled: true },
    orderBy: { sortOrder: "asc" },
  });

  return NextResponse.json(tabs);
}
