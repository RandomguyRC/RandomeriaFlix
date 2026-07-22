"use client";

import { useEffect, useState } from "react";
import { Check, Eye, EyeOff, Loader2, Users } from "lucide-react";

interface Profile {
  id: string;
  name: string;
  slug: string;
  theme?: string;
  isVisible: boolean;
  _count: { contentItems: number; categories: number };
}

export default function AdminProfilesPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/profiles")
      .then((r) => r.json())
      .then((data: Profile[]) => {
        setProfiles(data);
        setNames(Object.fromEntries(data.map((profile) => [profile.id, profile.name])));
      })
      .finally(() => setLoading(false));
  }, []);

  async function updateProfile(id: string, changes: Partial<Pick<Profile, "name" | "isVisible">>) {
    setSavingId(id);
    try {
      const res = await fetch("/api/admin/profiles", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...changes }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        alert(data?.error || "Failed to update profile");
        return;
      }

      const updated = await res.json();
      setProfiles((current) =>
        current.map((profile) => (profile.id === updated.id ? updated : profile)),
      );
      setNames((current) => ({ ...current, [updated.id]: updated.name }));
    } finally {
      setSavingId(null);
    }
  }

  function saveName(profile: Profile) {
    const nextName = names[profile.id]?.trim() || "";
    if (!nextName || nextName === profile.name) return;
    updateProfile(profile.id, { name: nextName });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-red-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-white">Profiles</h1>
        <p className="mt-2 text-gray-400">
          Rename profiles and choose which ones appear on the viewer profile picker.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        {profiles.map((profile) => {
          const isSaving = savingId === profile.id;
          const pendingName = names[profile.id] ?? profile.name;
          const nameChanged = pendingName.trim() !== profile.name && pendingName.trim().length > 0;

          return (
            <div
              key={profile.id}
              className="rounded-xl border border-gray-800 bg-gray-900 p-6"
            >
              <div className="flex items-start gap-4">
                <div
                  className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-2xl font-bold text-white ${
                    profile.theme === "red"
                      ? "from-red-600 to-red-800"
                      : "from-violet-600 to-violet-800"
                  }`}
                >
                  {profile.name.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl font-semibold text-white">
                      {profile.name}
                    </h2>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                        profile.isVisible
                          ? "bg-green-500/10 text-green-400"
                          : "bg-gray-700 text-gray-300"
                      }`}
                    >
                      {profile.isVisible ? "Visible" : "Hidden"}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-gray-400">
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

              <div className="mt-6 space-y-4 border-t border-gray-800 pt-5">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-300">
                    Display name
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={pendingName}
                      onChange={(e) =>
                        setNames((current) => ({ ...current, [profile.id]: e.target.value }))
                      }
                      className="min-w-0 flex-1 rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 text-white placeholder-gray-500 focus:border-red-500 focus:outline-none"
                    />
                    <button
                      onClick={() => saveName(profile)}
                      disabled={isSaving || !nameChanged}
                      className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                      Save
                    </button>
                  </div>
                  <p className="mt-2 text-xs text-gray-500">
                    The URL slug stays the same so existing links keep working.
                  </p>
                </div>

                <button
                  onClick={() => updateProfile(profile.id, { isVisible: !profile.isVisible })}
                  disabled={isSaving}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 text-sm font-semibold text-gray-200 transition-colors hover:border-gray-600 hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : profile.isVisible ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                  {profile.isVisible ? "Hide from profile picker" : "Show on profile picker"}
                </button>
              </div>
            </div>
          );
        })}

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
