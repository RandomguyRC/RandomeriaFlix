"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { Play } from "lucide-react";

interface ProfileCard {
  id: string;
  slug: string;
  name: string;
  theme?: string | null;
}

function getProfileColors(profile: { slug: string; theme?: string | null }) {
  if (profile.theme === "red" || profile.slug === "randomeria") {
    return {
      gradient: "from-[#8B0000] to-[#a80000]",
      shadow: "group-hover:shadow-[0_0_40px_rgba(139,0,0,0.4)]",
      ring: "group-hover:ring-[#8B0000]",
    };
  }
  return {
    gradient: "from-[#4A148C] to-[#7B1FA2]",
    shadow: "group-hover:shadow-[0_0_40px_rgba(123,31,162,0.4)]",
    ring: "group-hover:ring-[#7B1FA2]",
  };
}

export default function ProfileCardGrid({ profiles }: { profiles: ProfileCard[] }) {
  if (profiles.length === 0) {
    return (
      <div className="text-center">
        <p className="font-['Outfit'] text-[#A39294]">No profiles available.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-center gap-10 sm:gap-14">
      {profiles.map((profile, index) => {
        const colors = getProfileColors(profile);

        return (
          <motion.div
            key={profile.id}
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{
              duration: 0.5,
              delay: index * 0.15,
              ease: [0.22, 1, 0.36, 1],
            }}
          >
            <Link
              href={`/watch/${profile.slug}`}
              className="group flex flex-col items-center"
              data-testid={`profile-card-${profile.slug}`}
            >
              <div
                className={`relative mb-5 h-36 w-36 overflow-hidden rounded-2xl bg-gradient-to-br ${colors.gradient} shadow-xl ring-0 ring-white/20 transition-all duration-500 group-hover:scale-105 group-hover:shadow-2xl ${colors.shadow} group-hover:ring-4 ${colors.ring} sm:h-44 sm:w-44`}
              >
                {/* Initial letter */}
                <div className="flex h-full w-full items-center justify-center font-['Playfair_Display'] text-6xl font-bold text-white/95 transition-transform duration-500 group-hover:scale-110 sm:text-7xl">
                  {profile.name.charAt(0)}
                </div>

                {/* Hover overlay with play icon */}
                <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-all duration-500 group-hover:bg-black/30">
                  <div className="scale-0 transition-all duration-500 group-hover:scale-100">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-white bg-white/10 backdrop-blur-md">
                      <Play className="h-7 w-7 fill-white text-white" />
                    </div>
                  </div>
                </div>

                {/* Shine effect on hover */}
                <div className="absolute inset-0 translate-x-[-100%] bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-[100%]" />
              </div>

              <span className="font-['Outfit'] text-lg font-semibold text-[#A39294] transition-colors duration-300 group-hover:text-white sm:text-xl">
                {profile.name}
              </span>
            </Link>
          </motion.div>
        );
      })}
    </div>
  );
}
