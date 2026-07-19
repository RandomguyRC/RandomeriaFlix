"use client";

import { useEffect, useState } from "react";
import { Users } from "lucide-react";

interface Profile {
  id: string;
  name: string;
  slug: string;
  theme?: string;
  _count: { contentItems: number; categories: number };
}

export default function AdminProfilesPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/profiles")
      .then((r) => r.json())
      .then(setProfiles)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-red-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-8 text-3xl font-bold text-white">Profiles</h1>

      <div className="grid gap-6 sm:grid-cols-2">
        {profiles.map((profile) => (
          <div
            key={profile.id}
            className="rounded-xl border border-gray-800 bg-gray-900 p-6"
          >
            <div className="flex items-center gap-4">
              <div
                className={`flex h-16 w-16 items-center justify-center rounded-xl bg-gradient-to-br text-2xl font-bold text-white ${
                  profile.theme === "red"
                    ? "from-red-600 to-red-800"
                    : "from-violet-600 to-violet-800"
                }`}
              >
                {profile.name.charAt(0)}
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white">
                  {profile.name}
                </h2>
                <p className="text-sm text-gray-400">
                  /watch/{profile.slug}
                </p>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-4">
              <div className="rounded-lg bg-gray-800 p-3 text-center">
                <p className="text-2xl font-bold text-white">
                  {profile._count.contentItems}
                </p>
                <p className="text-xs text-gray-400">Content Items</p>
              </div>
              <div className="rounded-lg bg-gray-800 p-3 text-center">
                <p className="text-2xl font-bold text-white">
                  {profile._count.categories}
                </p>
                <p className="text-xs text-gray-400">Categories</p>
              </div>
            </div>
          </div>
        ))}

        {profiles.length === 0 && (
          <div className="col-span-2 rounded-xl border border-dashed border-gray-700 bg-gray-900 py-16 text-center">
            <Users className="mx-auto h-12 w-12 text-gray-600" />
            <p className="mt-4 text-gray-400">No profiles found</p>
          </div>
        )}
      </div>
    </div>
  );
}
