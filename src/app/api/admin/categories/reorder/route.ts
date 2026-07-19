import { NextRequest, NextResponse } from "next/server";
import { readSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const reorderSchema = z.object({
  orderedIds: z.array(z.string()).min(1),
});

export async function POST(request: NextRequest) {
  const session = await readSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { orderedIds } = reorderSchema.parse(body);

  // Update sort orders: 0, 10, 20, 30...
  const updates = orderedIds.map((id, index) =>
    prisma.category.update({
      where: { id },
      data: { sortOrder: index * 10 },
    })
  );

  await prisma.$transaction(updates);

  return NextResponse.json({ message: "Reordered" });
}
