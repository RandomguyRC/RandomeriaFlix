import { NextRequest, NextResponse } from "next/server";
import { readSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

/**
 * Finds or creates ContentItem records for storyline event assets,
 * so they can be attached to map places (which require ContentItem references).
 */
export async function POST(request: NextRequest) {
  const session = await readSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { assetIds, profileId } = body as { assetIds: string[]; profileId: string };
    if (!Array.isArray(assetIds) || !profileId) {
      return NextResponse.json({ error: "assetIds and profileId required" }, { status: 400 });
    }

    // Find existing pre-made content items that match these assets
    const existing = await prisma.contentItem.findMany({
      where: {
        profileId,
        mainAssetId: { in: assetIds },
      },
    });
    const existingMap = new Map(existing.map((c) => [c.mainAssetId, c]));

    // For assets that don't have a ContentItem yet, create one
    const results: { assetId: string; contentItemId: string }[] = [];
    const toCreate: { assetId: string; asset: { id: string; mimeType: string } }[] = [];

    for (const assetId of assetIds) {
      const found = existingMap.get(assetId);
      if (found) {
        results.push({ assetId, contentItemId: found.id });
      } else {
        // Fetch the MediaAsset to get its mimeType
        const asset = await prisma.mediaAsset.findUnique({ where: { id: assetId } });
        if (asset) {
          toCreate.push({ assetId, asset: { id: asset.id, mimeType: asset.mimeType } });
        }
      }
    }

    if (toCreate.length > 0) {
      // Find the profile
      const profile = await prisma.profile.findUnique({ where: { id: profileId } });
      if (!profile) {
        return NextResponse.json({ error: "Profile not found" }, { status: 404 });
      }

      await prisma.$transaction(
        toCreate.map(({ assetId, asset }) =>
          prisma.contentItem.create({
            data: {
              profileId,
              type: asset.mimeType.startsWith("video/") ? "VIDEO" : "PHOTO",
              title: `Storyline image`,
              mainAssetId: assetId,
              isPublished: true,
              isReel: false,
              sortOrder: 0,
            },
          })
        )
      );

      // Fetch the newly created ones
      const created = await prisma.contentItem.findMany({
        where: { mainAssetId: { in: toCreate.map((t) => t.assetId) } },
      });

      for (const c of created) {
        results.push({ assetId: c.mainAssetId, contentItemId: c.id });
      }
    }

    return NextResponse.json({ results });
  } catch (error) {
    console.error("Resolve storyline error:", error);
    return NextResponse.json({ error: "Failed to resolve storyline assets" }, { status: 500 });
  }
}
