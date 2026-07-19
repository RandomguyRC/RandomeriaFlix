import { NextRequest, NextResponse } from "next/server";
import { readSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await readSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();

  const updated = await prisma.storyEvent.update({
    where: { id },
    data: {
      title: body.title,
      subtitle: body.subtitle,
      eventDate: body.eventDate,
      body: body.body,
      mood: body.mood,
      assetId: body.assetId || undefined,
      imageCropX: body.imageCropX,
      imageCropY: body.imageCropY,
      spotifyTrackId: body.spotifyTrackId,
      spotifyUri: body.spotifyUri,
      spotifyTitle: body.spotifyTitle,
      spotifyArtist: body.spotifyArtist,
      spotifyAlbumArt: body.spotifyAlbumArt,
      spotifyDuration: body.spotifyDuration,
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await readSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  await prisma.storyEvent.delete({ where: { id } });

  return NextResponse.json({ message: "Deleted" });
}
