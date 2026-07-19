import { NextRequest, NextResponse } from "next/server";
import { readSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await readSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const events = await prisma.storyEvent.findMany({
    include: {
      profile: { select: { id: true, name: true, slug: true } },
      asset: { select: { id: true, mimeType: true } },
    },
    orderBy: { sortOrder: "asc" },
  });

  return NextResponse.json(events);
}

export async function POST(request: NextRequest) {
  const session = await readSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  const maxSort = await prisma.storyEvent.aggregate({
    where: { profileId: body.profileId },
    _max: { sortOrder: true },
  });

  const event = await prisma.storyEvent.create({
    data: {
      profileId: body.profileId,
      title: body.title,
      subtitle: body.subtitle || null,
      eventDate: body.eventDate || null,
      body: body.body || null,
      mood: body.mood || null,
      assetId: body.assetId || null,
      imageCropX: body.imageCropX ?? 50,
      imageCropY: body.imageCropY ?? 50,
      spotifyTrackId: body.spotifyTrackId || null,
      spotifyUri: body.spotifyUri || null,
      spotifyTitle: body.spotifyTitle || null,
      spotifyArtist: body.spotifyArtist || null,
      spotifyAlbumArt: body.spotifyAlbumArt || null,
      spotifyDuration: body.spotifyDuration || null,
      sortOrder: (maxSort._max.sortOrder ?? 0) + 10,
    },
  });

  return NextResponse.json(event, { status: 201 });
}
