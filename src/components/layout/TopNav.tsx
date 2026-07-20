"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { useEffect, useState } from "react";

interface NavTab {
  slug: string;
  label: string;
  isEnabled: boolean;
}

interface TopNavProps {
  profileSlug: string;
  initialTabs?: { slug: string; label: string; isEnabled: boolean }[];
}

export default function TopNav({ profileSlug, initialTabs = [] }: TopNavProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [tabs, setTabs] = useState<NavTab[]>(initialTabs.length > 0 ? initialTabs : []);
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  // Close the mobile menu whenever the route changes
  useEffect(() => {
    setMenuOpen(false);
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
            <Link
              href={`/watch/${profileSlug}/space-selfie`}
              className={`text-sm font-medium transition-colors ${
                pathname === `/watch/${profileSlug}/space-selfie`
                  ? "text-white"
                  : "text-gray-400 hover:text-gray-200"
              }`}
            >
              Space Selfie
            </Link>
          </div>
        </div>

        {/* Desktop actions */}
        <div className="hidden items-center gap-4 md:flex">
          <Link
            href="/profiles"
            className="text-sm font-medium text-gray-400 transition-colors hover:text-gray-200"
          >
            Profiles
          </Link>
          <button
            onClick={handleLogout}
            className="rounded-md bg-gray-800 px-4 py-2 text-sm font-medium text-gray-300 transition-colors hover:bg-gray-700 hover:text-white"
          >
            Logout
          </button>
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
                <Link
                  href={`/watch/${profileSlug}/space-selfie`}
                  className={`py-3.5 text-base font-medium transition-colors ${
                    pathname === `/watch/${profileSlug}/space-selfie`
                      ? "text-white"
                      : "text-gray-400 active:text-gray-200"
                  }`}
                >
                  Space Selfie
                </Link>
                <Link
                  href="/profiles"
                  className="py-3.5 text-base font-medium text-gray-400 transition-colors active:text-gray-200"
                >
                  Profiles
                </Link>
              </div>
              <button
                onClick={handleLogout}
                className="mt-4 w-full rounded-md bg-gray-800 px-4 py-3 text-base font-medium text-gray-300 transition-colors active:bg-gray-700 active:text-white"
              >
                Logout
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
