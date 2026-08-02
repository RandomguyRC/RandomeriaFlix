"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, Settings, LogOut } from "lucide-react";

interface NavTab {
  slug: string;
  label: string;
  isEnabled: boolean;
}

interface ProfileInfo {
  name: string;
  theme?: string | null;
}

interface TopNavProps {
  profileSlug: string;
  initialTabs?: { slug: string; label: string; isEnabled: boolean }[];
  profile?: ProfileInfo | null;
}

function getAvatarGradient(profile?: ProfileInfo | null, profileSlug?: string) {
  if (profile?.theme === "red" || profileSlug === "randomeria") {
    return "from-red-600 to-red-800";
  }
  return "from-violet-600 to-violet-800";
}

function ProfileAvatar({
  profile,
  profileSlug,
  className = "h-8 w-8 text-sm",
}: {
  profile?: ProfileInfo | null;
  profileSlug: string;
  className?: string;
}) {
  const initial = profile?.name?.charAt(0)?.toUpperCase() || "?";
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-md bg-gradient-to-br font-bold text-white/90 ${getAvatarGradient(
        profile,
        profileSlug
      )} ${className}`}
    >
      {initial}
    </div>
  );
}

export default function TopNav({ profileSlug, initialTabs = [], profile = null }: TopNavProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [tabs, setTabs] = useState<NavTab[]>(initialTabs.length > 0 ? initialTabs : []);
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  // Close the mobile menu whenever the route changes
  useEffect(() => {
    setMenuOpen(false);
    setProfileMenuOpen(false);
  }, [pathname]);

  // Lock body scroll while the mobile menu is open
  useEffect(() => {
    if (menuOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [menuOpen]);

  // Close the profile dropdown when clicking outside of it
  useEffect(() => {
    if (!profileMenuOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setProfileMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [profileMenuOpen]);

  useEffect(() => {
    // Only fetch client-side if server didn't provide tabs
    if (tabs.length === 0) {
      async function loadTabs() {
        try {
          const res = await fetch("/api/nav-tabs");
          if (res.ok) {
            const data = await res.json();
            const enabledTabs = data.filter((t: NavTab) => t.isEnabled);
            if (enabledTabs.length > 0) setTabs(enabledTabs);
          }
        } catch {}
      }
      loadTabs();
    }
  }, [tabs.length]);

  const navLinks = tabs.map((t) => ({
    label: t.label,
    href: `/watch/${profileSlug}${t.slug === "home" ? "" : "/" + t.slug}`,
  }));

  return (
    <>
      <motion.nav
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between bg-[#0a0a0a]/80 px-3 py-3 shadow-lg backdrop-blur-md sm:px-4 md:px-6"
      >
        <div className="flex min-w-0 items-center gap-4 sm:gap-6 md:gap-8">
          <Link href={`/watch/${profileSlug}`} className="flex shrink-0 items-center">
            <img src="/logo.png" alt="RandomeriaFlix Logo" className="h-6 w-auto sm:h-7 md:h-8" />
          </Link>

          <div className="hidden items-center gap-6 md:flex">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`text-sm font-medium transition-colors ${
                    isActive
                      ? "text-white"
                      : "text-gray-400 hover:text-gray-200"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
            <a
              href="https://space.crunchlabs.com/selfie/ppIDhla"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-gray-400 transition-colors hover:text-gray-200"
            >
              Space Selfie
            </a>
          </div>
        </div>

        {/* Desktop actions */}
        <div className="hidden items-center gap-5 md:flex">
          <Link
            href="/profiles"
            className="text-sm font-medium text-gray-400 transition-colors hover:text-gray-200"
          >
            Profiles
          </Link>

          {/* Profile dropdown */}
          <div className="relative" ref={profileMenuRef}>
            <button
              onClick={() => setProfileMenuOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={profileMenuOpen}
              className="flex items-center gap-1.5 rounded-md py-1 pl-1 pr-1.5 transition-colors hover:bg-white/5"
            >
              <ProfileAvatar profile={profile} profileSlug={profileSlug} />
              <ChevronDown
                className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${
                  profileMenuOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            <AnimatePresence>
              {profileMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.97 }}
                  transition={{ duration: 0.15, ease: "easeOut" }}
                  className="absolute right-0 top-[calc(100%+10px)] w-56 overflow-hidden rounded-lg border border-white/10 bg-[#141414] shadow-2xl"
                  role="menu"
                >
                  <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
                    <ProfileAvatar profile={profile} profileSlug={profileSlug} className="h-9 w-9 text-base" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-white">
                        {profile?.name || "Profile"}
                      </p>
                    </div>
                  </div>
                  <div className="py-1.5">
                    <Link
                      href={`/watch/${profileSlug}/settings`}
                      onClick={() => setProfileMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 transition-colors hover:bg-white/5 hover:text-white"
                      role="menuitem"
                    >
                      <Settings className="h-4 w-4 text-gray-400" />
                      Settings
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-gray-300 transition-colors hover:bg-white/5 hover:text-white"
                      role="menuitem"
                    >
                      <LogOut className="h-4 w-4 text-gray-400" />
                      Sign Out
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Mobile hamburger toggle */}
        <button
          onClick={() => setMenuOpen((v) => !v)}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-gray-200 active:bg-white/10 md:hidden"
        >
          <div className="relative h-4 w-5">
            <span
              className={`absolute left-0 top-0 block h-0.5 w-5 bg-current transition-transform duration-200 ${
                menuOpen ? "translate-y-[7px] rotate-45" : ""
              }`}
            />
            <span
              className={`absolute left-0 top-[7px] block h-0.5 w-5 bg-current transition-opacity duration-200 ${
                menuOpen ? "opacity-0" : "opacity-100"
              }`}
            />
            <span
              className={`absolute left-0 top-[14px] block h-0.5 w-5 bg-current transition-transform duration-200 ${
                menuOpen ? "-translate-y-[7px] -rotate-45" : ""
              }`}
            />
          </div>
        </button>
      </motion.nav>

      {/* Mobile slide-down menu */}
      <AnimatePresence>
        {menuOpen && (
          <>
            <motion.div
              key="nav-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setMenuOpen(false)}
              className="fixed inset-0 z-40 bg-black/60 md:hidden"
            />
            <motion.div
              key="nav-panel"
              initial={{ y: -16, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -16, opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="fixed left-0 right-0 top-14 z-40 max-h-[calc(100vh-56px)] overflow-y-auto border-t border-white/10 bg-[#0a0a0a]/97 px-4 pb-6 pt-2 shadow-lg backdrop-blur-md md:hidden"
            >
              {/* Active profile summary */}
              <div className="flex items-center gap-3 border-b border-white/5 py-3.5">
                <ProfileAvatar profile={profile} profileSlug={profileSlug} className="h-10 w-10 text-base" />
                <p className="truncate text-base font-semibold text-white">
                  {profile?.name || "Profile"}
                </p>
              </div>

              <div className="flex flex-col divide-y divide-white/5">
                {navLinks.map((link) => {
                  const isActive = pathname === link.href;
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={`py-3.5 text-base font-medium transition-colors ${
                        isActive ? "text-white" : "text-gray-400 active:text-gray-200"
                      }`}
                    >
                      {link.label}
                    </Link>
                  );
                })}
                <a
                  href="https://space.crunchlabs.com/selfie/ppIDhla"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-3.5 text-base font-medium text-gray-400 transition-colors active:text-gray-200"
                >
                  Space Selfie
                </a>
                <Link
                  href="/profiles"
                  className="py-3.5 text-base font-medium text-gray-400 transition-colors active:text-gray-200"
                >
                  Profiles
                </Link>
                <Link
                  href={`/watch/${profileSlug}/settings`}
                  className="flex items-center gap-2 py-3.5 text-base font-medium text-gray-400 transition-colors active:text-gray-200"
                >
                  <Settings className="h-4 w-4" />
                  Settings
                </Link>
              </div>
              <button
                onClick={handleLogout}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-md bg-gray-800 px-4 py-3 text-base font-medium text-gray-300 transition-colors active:bg-gray-700 active:text-white"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
