import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { readSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

const reorderSchema = z.object({
  orderedIds: z.array(z.string()).min(1),
});

export async function POST(request: NextRequest) {
  const session = await readSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { orderedIds } = reorderSchema.parse(await request.json());

  await prisma.$transaction(
    orderedIds.map((id, index) =>
      prisma.mapPlace.update({
        where: { id },
        data: { sortOrder: index * 10 },
      })
    )
  );

  return NextResponse.json({ message: "Reordered" });
}
