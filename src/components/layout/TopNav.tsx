"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { useEffect, useState } from "react";
import { LogOut, User } from "lucide-react";

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
  const [scrolled, setScrolled] = useState(false);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  // Handle scroll for glassmorphism effect
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  // Lock body scroll when mobile menu is open
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
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className={`fixed left-0 right-0 top-0 z-50 flex items-center justify-between px-4 py-4 shadow-lg transition-all duration-500 sm:px-6 lg:px-12 ${
          scrolled
            ? "border-b border-white/10 bg-[#050304]/80 backdrop-blur-xl"
            : "bg-gradient-to-b from-[#050304]/95 to-transparent"
        }`}
      >
        <div className="flex min-w-0 items-center gap-6 sm:gap-8 lg:gap-12">
          <Link href={`/watch/${profileSlug}`} className="flex shrink-0 items-center" data-testid="nav-logo">
            <img src="/logo.png" alt="RandomeriaFlix Logo" className="h-7 w-auto transition-opacity duration-300 hover:opacity-80 sm:h-8 lg:h-9" />
          </Link>

          <div className="hidden items-center gap-7 md:flex lg:gap-8">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`relative font-['Outfit'] text-sm font-medium transition-colors duration-300 ${
                    isActive
                      ? "text-white"
                      : "text-[#A39294] hover:text-white"
                  }`}
                  data-testid={`nav-link-${link.label.toLowerCase()}`}
                >
                  {link.label}
                  {isActive && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute -bottom-5 left-0 right-0 h-0.5 bg-[#8B0000] shadow-[0_0_8px_rgba(139,0,0,0.8)]"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                </Link>
              );
            })}
            <a
              href="https://space.crunchlabs.com/selfie/ppIDhla"
              target="_blank"
              rel="noopener noreferrer"
              className="font-['Outfit'] text-sm font-medium text-[#A39294] transition-colors duration-300 hover:text-white"
            >
              Space Selfie
            </a>
          </div>
        </div>

        {/* Desktop actions */}
        <div className="hidden items-center gap-4 md:flex">
          <Link
            href="/profiles"
            className="flex items-center gap-2 rounded-lg border border-white/20 bg-white/5 px-4 py-2 font-['Outfit'] text-sm font-medium text-[#FDFBF7] backdrop-blur-sm transition-all duration-300 hover:border-white/40 hover:bg-white/10"
            data-testid="nav-profiles-button"
          >
            <User className="h-4 w-4" />
            Profiles
          </Link>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 rounded-lg bg-[#8B0000]/80 px-4 py-2 font-['Outfit'] text-sm font-medium text-white transition-all duration-300 hover:bg-[#8B0000]"
            data-testid="nav-logout-button"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setMenuOpen((v) => !v)}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-[#FDFBF7] transition-colors duration-300 active:bg-white/10 md:hidden"
          data-testid="nav-mobile-toggle"
        >
          <div className="relative h-5 w-6">
            <span
              className={`absolute left-0 top-0 block h-0.5 w-6 bg-current transition-transform duration-300 ${
                menuOpen ? "translate-y-[9px] rotate-45" : ""
              }`}
            />
            <span
              className={`absolute left-0 top-[9px] block h-0.5 w-6 bg-current transition-opacity duration-300 ${
                menuOpen ? "opacity-0" : "opacity-100"
              }`}
            />
            <span
              className={`absolute left-0 top-[18px] block h-0.5 w-6 bg-current transition-transform duration-300 ${
                menuOpen ? "-translate-y-[9px] -rotate-45" : ""
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
              transition={{ duration: 0.3 }}
              onClick={() => setMenuOpen(false)}
              className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm md:hidden"
            />
            <motion.div
              key="nav-panel"
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="fixed left-0 right-0 top-[72px] z-40 max-h-[calc(100vh-72px)] overflow-y-auto border-b border-white/10 bg-[#050304]/97 px-6 pb-8 pt-4 shadow-2xl backdrop-blur-xl md:hidden"
            >
              <div className="flex flex-col divide-y divide-white/10">
                {navLinks.map((link) => {
                  const isActive = pathname === link.href;
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={`py-4 font-['Outfit'] text-base font-medium transition-colors ${
                        isActive ? "text-white" : "text-[#A39294] active:text-white"
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
                  className="py-4 font-['Outfit'] text-base font-medium text-[#A39294] transition-colors active:text-white"
                >
                  Space Selfie
                </a>
                <Link
                  href="/profiles"
                  className="py-4 font-['Outfit'] text-base font-medium text-[#A39294] transition-colors active:text-white"
                >
                  Profiles
                </Link>
              </div>
              <button
                onClick={handleLogout}
                className="mt-6 w-full rounded-lg bg-[#8B0000] px-4 py-3.5 font-['Outfit'] text-base font-semibold text-white transition-colors active:bg-[#a80000]"
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
