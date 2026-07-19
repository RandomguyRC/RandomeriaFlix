"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "motion/react";
import { Home, Image, Film, LayoutGrid, MessageSquare, BookOpen, Settings, LogOut, Sparkles, Clapperboard, Smile } from "lucide-react";

const sidebarLinks = [
  { label: "Dashboard", href: "/admin", icon: Home },
  { label: "Profiles", href: "/admin/profiles", icon: Image },
  { label: "Content", href: "/admin/content", icon: Film },
  { label: "Categories", href: "/admin/categories", icon: LayoutGrid },
  { label: "Reels", href: "/admin/reels", icon: Clapperboard },
  { label: "Storyline", href: "/admin/storyline", icon: Image },
  { label: "Chat Import", href: "/admin/chat", icon: MessageSquare },
  { label: "Book/PDF", href: "/admin/book", icon: BookOpen },
  { label: "Stickers", href: "/admin/stickers", icon: Smile },
  { label: "Text Memories", href: "/admin/text-memories", icon: Sparkles },
  { label: "Nav Tabs", href: "/admin/nav-tabs", icon: LayoutGrid },
  { label: "Settings", href: "/admin/settings", icon: Settings },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  return (
    <motion.aside
      initial={{ x: -280, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="flex h-screen w-64 flex-col border-r border-gray-800 bg-gray-900"
    >
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
    </motion.aside>
  );
}
