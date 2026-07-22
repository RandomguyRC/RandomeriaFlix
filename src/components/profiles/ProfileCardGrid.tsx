"use client";

import Link from "next/link";
import { motion } from "motion/react";

interface ProfileCard {
  id: string;
  slug: string;
  name: string;
  theme?: string | null;
}

function getProfileColors(profile: { slug: string; theme?: string | null }) {
  if (profile.theme === "red" || profile.slug === "randomeria") {
    return {
      color: "from-red-600 to-red-800",
      shadow: "group-hover:shadow-red-500/20",
    };
  }
  return {
    color: "from-violet-600 to-violet-800",
    shadow: "group-hover:shadow-violet-500/20",
  };
}

export default function ProfileCardGrid({ profiles }: { profiles: ProfileCard[] }) {
  if (profiles.length === 0) {
    return (
      <div className="text-center">
        <p className="text-gray-400">No profiles available.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-12">
      {profiles.map((profile, index) => {
        const colors = getProfileColors(profile);

        return (
          <motion.div
            key={profile.id}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{
              duration: 0.5,
              delay: index * 0.15,
              ease: "easeOut",
            }}
          >
            <Link
              href={`/watch/${profile.slug}`}
              className="group flex flex-col items-center"
            >
              <div
                className={`relative mb-4 h-32 w-32 overflow-hidden rounded-xl bg-gradient-to-br ${colors.color} shadow-lg transition-all duration-300 group-hover:scale-105 group-hover:shadow-xl ${colors.shadow} sm:h-40 sm:w-40`}
              >
                <div className="flex h-full w-full items-center justify-center text-5xl font-black text-white/90 sm:text-6xl">
                  {profile.name.charAt(0)}
                </div>

                <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors duration-300 group-hover:bg-black/20">
                  <div className="scale-0 rounded-full bg-white/20 p-3 backdrop-blur-sm transition-transform duration-300 group-hover:scale-100">
                    <svg
                      className="h-6 w-6 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                </div>
              </div>

              <span className="text-lg font-semibold text-gray-300 transition-colors duration-300 group-hover:text-white">
                {profile.name}
              </span>
            </Link>
          </motion.div>
        );
      })}
    </div>
  );
}
