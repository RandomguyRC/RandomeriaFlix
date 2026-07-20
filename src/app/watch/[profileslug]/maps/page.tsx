import { prisma } from "@/lib/db";
import RandomeriaMapClient from "@/components/maps/RandomeriaMapClient";

interface MapsPageProps {
  params: Promise<{ profileslug: string }>;
}

const DEFAULT_MAP = {
  defaultLat: 22.9734,
  defaultLng: 78.6569,
  defaultZoom: 5,
};

export default async function MapsPage({ params }: MapsPageProps) {
  const { profileslug } = await params;
  const profile = await prisma.profile.findUnique({ where: { slug: profileslug } });

  if (!profile) {
    return (
      <main className="flex min-h-[70vh] items-center justify-center bg-[#05070d] text-white">
        <div className="text-center">
          <p className="text-4xl">🗺️</p>
          <h1 className="mt-4 text-2xl font-bold">Map universe not found</h1>
          <p className="mt-2 text-gray-500">This profile does not exist yet.</p>
        </div>
      </main>
    );
  }

  const [config, places] = await Promise.all([
    prisma.mapConfig.findUnique({ where: { profileId: profile.id } }),
    prisma.mapPlace.findMany({
      where: { profileId: profile.id, isPublished: true },
      include: {
        media: {
          include: {
            contentItem: {
              include: {
                mainAsset: { select: { id: true, mimeType: true } },
                thumbnailAsset: { select: { id: true } },
              },
            },
          },
          orderBy: { sortOrder: "asc" },
        },
      },
      orderBy: { sortOrder: "asc" },
    }),
  ]);

  return (
    <RandomeriaMapClient
      profileName={profile.name}
      config={config ?? DEFAULT_MAP}
      places={places}
    />
  );
}
