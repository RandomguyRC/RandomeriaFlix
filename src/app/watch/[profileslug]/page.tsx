import { prisma } from "@/lib/db";

import HeroBanner from "@/components/streaming/HeroBanner";
import ContentRails from "@/components/streaming/ContentRails";

interface WatchPageProps {
  params: Promise<{
    profileslug: string;
  }>;
}

export default async function WatchPage({
  params,
}: WatchPageProps) {
  const { profileslug } = await params;

  const profile = await prisma.profile.findUnique({
    where: {
      slug: profileslug,
    },
  });

  // No matching profile (e.g. a placeholder/"emptied" slug) — rather than
  // bouncing the viewer out to /profiles, just show the same empty-state
  // UI the other tabs (storyline, reels, stickers...) already show. Only
  // the "Profiles" link in the top nav should ever take them back there.
  const displayName = profile?.name ?? "this Universe";

  const slideshowSetting =
    await prisma.siteSetting.findUnique({
      where: {
        key: "slideshowInterval",
      },
    });

  const slideshowInterval = slideshowSetting
    ? Number(slideshowSetting.value) * 1000
    : 10000;

  const featuredItems = profile
    ? await prisma.contentItem.findMany({
        where: {
          profileId: profile.id,
          isFeatured: true,
          isPublished: true,
        },
        include: {
          mainAsset: true,
          thumbnailAsset: true,
        },
        orderBy: {
          sortOrder: "asc",
        },
      })
    : [];

  const categories = profile
    ? await prisma.category.findMany({
        where: {
          profileId: profile.id,
          isEnabled: true,
        },
        include: {
          placements: {
            include: {
              contentItem: {
                include: {
                  mainAsset: true,
                  thumbnailAsset: true,
                  musicAsset: true,
                },
              },
            },
            orderBy: {
              sortOrder: "asc",
            },
          },
        },
        orderBy: {
          sortOrder: "asc",
        },
      })
    : [];

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white">
      <HeroBanner
        items={featuredItems}
        profileName={displayName}
        interval={slideshowInterval}
      />

      <div className="relative z-20 -mt-8 pb-24">
        <ContentRails categories={categories} />

        {categories.length === 0 && (
          <div className="flex min-h-[45vh] items-center justify-center">
            <div className="text-center">
              <h2 className="mb-3 text-3xl font-bold">
                Welcome to {displayName}
              </h2>

              <p className="text-gray-400">
                No memories have been added yet.
              </p>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}