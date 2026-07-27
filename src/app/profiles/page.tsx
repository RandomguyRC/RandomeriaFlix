import { prisma } from "@/lib/db";
import ProfileCardGrid from "@/components/profiles/ProfileCardGrid";
import { motion } from "motion/react";

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
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#050304] px-6">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#050304] via-[#120A0B] to-[#8B0000]/15" />
      
      {/* Radial glow */}
      <div className="absolute left-1/2 top-1/3 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#8B0000]/10 blur-[100px]" />

      <div className="relative z-10">
        <div className="mb-16 text-center">
          <h1 className="mb-4 font-['Playfair_Display'] text-5xl font-bold tracking-tight text-white sm:text-6xl md:text-7xl">
            Who is reminiscing?
          </h1>
          <p className="font-['Outfit'] text-lg text-[#A39294] sm:text-xl">
            Select a profile to continue your journey
          </p>
        </div>

        <ProfileCardGrid profiles={profiles} />
      </div>
    </main>
  );
}
