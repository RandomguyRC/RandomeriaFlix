"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { motion } from "motion/react";
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

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

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
    <motion.nav
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between bg-[#0a0a0a]/80 px-6 py-3 shadow-lg backdrop-blur-md"
    >
      <div className="flex items-center gap-8">
        <Link href={`/watch/${profileSlug}`} className="flex items-center">
          <img src="/logo.png" alt="RandomeriaFlix Logo" className="h-8 w-auto" />
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
        </div>
      </div>

      <div className="flex items-center gap-4">
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
    </motion.nav>
  );
}
