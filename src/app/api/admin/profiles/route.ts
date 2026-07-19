import { NextResponse } from "next/server";
import { readSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await readSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profiles = await prisma.profile.findMany({
    orderBy: { sortOrder: "asc" },
    include: {
      _count: { select: { contentItems: true, categories: true } },
    },
  });

  return NextResponse.json(profiles);
}
