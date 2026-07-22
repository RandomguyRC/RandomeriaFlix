import { prisma } from "@/lib/db";
import ProfileCardGrid from "@/components/profiles/ProfileCardGrid";

export default async function ProfilesPage() {
  const profiles = await prisma.profile.findMany({
    where: { isVisible: true },
    orderBy: { sortOrder: "asc" },
    select: {
      id: true,
      slug: true,
      name: true,
      theme: true,
    },
  });

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 px-6">
      <div className="mb-16 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
          Who is watching?
        </h1>
        <p className="mt-4 text-lg text-gray-400">
          Select a profile to continue
        </p>
      </div>

      <ProfileCardGrid profiles={profiles} />
    </main>
  );
}
