"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { Home, Image, Film, LayoutGrid, MessageSquare, MessageCircle, BookOpen, Settings, LogOut, Sparkles, Clapperboard, Smile, Menu, X, Map } from "lucide-react";

const sidebarLinks = [
  { label: "Dashboard", href: "/admin", icon: Home },
  { label: "Profiles", href: "/admin/profiles", icon: Image },
  { label: "Content", href: "/admin/content", icon: Film },
  { label: "Categories", href: "/admin/categories", icon: LayoutGrid },
  { label: "Reels", href: "/admin/reels", icon: Clapperboard },
  { label: "Storyline", href: "/admin/storyline", icon: Image },
  { label: "Randomeria Maps", href: "/admin/maps", icon: Map },
  { label: "Live Chat", href: "/admin/live-chat", icon: MessageCircle },
  { label: "Chat Import", href: "/admin/chat", icon: MessageSquare },
  { label: "Book/PDF", href: "/admin/book", icon: BookOpen },
  { label: "Stickers", href: "/admin/stickers", icon: Smile },
  { label: "Text Memories", href: "/admin/text-memories", icon: Sparkles },
  { label: "Nav Tabs", href: "/admin/nav-tabs", icon: LayoutGrid },
  { label: "Settings", href: "/admin/settings", icon: Settings },
];

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  return (
    <>
      <div className="flex items-center gap-3 border-b border-gray-800 px-6 py-5">
        <img src="/logo.png" alt="RandomeriaFlix Logo" className="h-8 w-auto" />
        <span className="text-lg font-bold text-white">Admin Panel</span>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
        {sidebarLinks.map((link) => {
          const isActive = pathname === link.href;
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={onNavigate}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-red-600/10 text-red-400"
                  : "text-gray-400 hover:bg-gray-800 hover:text-gray-200"
              }`}
            >
              <Icon className="h-5 w-5" />
              {link.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-gray-800 p-4">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-400 transition-colors hover:bg-gray-800 hover:text-gray-200"
        >
          <LogOut className="h-5 w-5" />
          Logout
        </button>
      </div>
    </>
  );
}

export default function AdminSidebar() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Mobile top bar */}
      <div className="flex items-center justify-between border-b border-gray-800 bg-gray-900 px-4 py-3 md:hidden">
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="RandomeriaFlix Logo" className="h-7 w-auto" />
          <span className="text-base font-bold text-white">Admin Panel</span>
        </div>
        <button
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          className="rounded-lg p-2 text-gray-300 hover:bg-gray-800"
        >
          <Menu className="h-6 w-6" />
        </button>
      </div>

      {/* Desktop sidebar */}
      <motion.aside
        initial={{ x: -280, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="hidden h-screen w-64 flex-col border-r border-gray-800 bg-gray-900 md:flex"
      >
        <SidebarContent />
      </motion.aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-40 bg-black/60 md:hidden"
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="fixed inset-y-0 left-0 z-50 flex w-72 max-w-[80vw] flex-col bg-gray-900 md:hidden"
            >
              <button
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="absolute right-3 top-4 rounded-lg p-2 text-gray-300 hover:bg-gray-800"
              >
                <X className="h-5 w-5" />
              </button>
              <SidebarContent onNavigate={() => setOpen(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
