import { NextRequest, NextResponse } from "next/server";
import { readSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await readSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tabs = await prisma.navTab.findMany({
    orderBy: { sortOrder: "asc" },
  });

  return NextResponse.json(tabs);
}

export async function POST(request: NextRequest) {
  const session = await readSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  const tab = await prisma.navTab.create({
    data: {
      slug: body.slug,
      label: body.label,
      kind: body.kind || "COLLECTION",
      sortOrder: body.sortOrder ?? 0,
    },
  });

  return NextResponse.json(tab, { status: 201 });
}
