import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { readSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

const configSchema = z.object({
  profileId: z.string().min(1),
  defaultLat: z.number().min(-90).max(90),
  defaultLng: z.number().min(-180).max(180),
  defaultZoom: z.number().int().min(3).max(18),
});

export async function POST(request: NextRequest) {
  const session = await readSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const data = configSchema.parse(await request.json());
    const config = await prisma.mapConfig.upsert({
      where: { profileId: data.profileId },
      update: {
        defaultLat: data.defaultLat,
        defaultLng: data.defaultLng,
        defaultZoom: data.defaultZoom,
      },
      create: data,
    });

    return NextResponse.json(config);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to save map settings" }, { status: 500 });
  }
}
