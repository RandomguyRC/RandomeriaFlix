import { prisma } from "@/lib/db";
import { Film, Image, MessageSquare, BookOpen, Users, LayoutGrid } from "lucide-react";
import Link from "next/link";

export default async function AdminDashboard() {
  const [
    profiles,
    contentItems,
    storyEvents,
    chatImports,
    books,
    categories,
  ] = await Promise.all([
    prisma.profile.count(),
    prisma.contentItem.count(),
    prisma.storyEvent.count(),
    prisma.chatImport.count(),
    prisma.book.count(),
    prisma.category.count(),
  ]);

  const stats = [
    {
      label: "Profiles",
      count: profiles,
      icon: Users,
      href: "/admin/profiles",
      color: "from-blue-500 to-blue-700",
    },
    {
      label: "Content Items",
      count: contentItems,
      icon: Film,
      href: "/admin/content",
      color: "from-red-500 to-red-700",
    },
    {
      label: "Categories",
      count: categories,
      icon: LayoutGrid,
      href: "/admin/content",
      color: "from-green-500 to-green-700",
    },
    {
      label: "Story Events",
      count: storyEvents,
      icon: Image,
      href: "/admin/storyline",
      color: "from-purple-500 to-purple-700",
    },
    {
      label: "Chat Imports",
      count: chatImports,
      icon: MessageSquare,
      href: "/admin/chat",
      color: "from-yellow-500 to-yellow-700",
    },
    {
      label: "Books",
      count: books,
      icon: BookOpen,
      href: "/admin/book",
      color: "from-pink-500 to-pink-700",
    },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-white">Dashboard</h1>
        <p className="mt-2 text-gray-400">
          Manage your RandomeriaFlix content
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Link
              key={stat.label}
              href={stat.href}
              className="group relative overflow-hidden rounded-xl border border-gray-800 bg-gray-900 p-6 transition-all hover:border-gray-700 hover:shadow-lg"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-400">
                    {stat.label}
                  </p>
                  <p className="mt-2 text-2xl sm:text-3xl font-bold text-white">
                    {stat.count}
                  </p>
                </div>
                <div
                  className={`rounded-lg bg-gradient-to-br ${stat.color} p-3 text-white shadow-lg`}
                >
                  <Icon className="h-6 w-6" />
                </div>
              </div>

              {/* Hover arrow */}
              <div className="absolute bottom-4 right-4 text-gray-600 transition-all group-hover:translate-x-1 group-hover:text-gray-400">
                <svg
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Quick actions */}
      <div className="mt-12">
        <h2 className="mb-4 text-xl font-bold text-white">Quick Actions</h2>
        <div className="flex flex-wrap gap-4">
          <Link
            href="/admin/content/new"
            className="rounded-lg bg-red-600 px-6 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:bg-red-700 hover:shadow-xl"
          >
            + Add Content
          </Link>
          <Link
            href="/admin/storyline"
            className="rounded-lg bg-gray-800 px-6 py-3 text-sm font-semibold text-gray-300 shadow-lg transition-all hover:bg-gray-700 hover:text-white"
          >
            + Add Story Event
          </Link>
          <Link
            href="/admin/chat"
            className="rounded-lg bg-gray-800 px-6 py-3 text-sm font-semibold text-gray-300 shadow-lg transition-all hover:bg-gray-700 hover:text-white"
          >
            Import WhatsApp Chat
          </Link>
          <Link
            href="/admin/book"
            className="rounded-lg bg-gray-800 px-6 py-3 text-sm font-semibold text-gray-300 shadow-lg transition-all hover:bg-gray-700 hover:text-white"
          >
            Upload PDF Book
          </Link>
        </div>
      </div>
    </div>
  );
}
