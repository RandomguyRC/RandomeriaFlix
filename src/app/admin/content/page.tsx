"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Trash2, Edit, Star, Eye, EyeOff } from "lucide-react";

interface ContentItem {
  id: string;
  title: string;
  type: string;
  description?: string;
  dateLabel?: string;
  isFeatured: boolean;
  isPublished: boolean;
  createdAt: string;
  mainAsset: { id: string; originalName: string; mimeType: string };
  thumbnailAsset?: { id: string } | null;
  profile: { name: string; slug: string };
}

export default function ContentPage() {
  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchContent();
  }, []);

  async function fetchContent() {
    const res = await fetch("/api/admin/content");
    if (res.ok) {
      setItems(await res.json());
    }
    setLoading(false);
  }

  async function deleteItem(id: string) {
    if (!confirm("Delete this item?")) return;
    await fetch(`/api/admin/content/${id}`, { method: "DELETE" });
    setItems(items.filter((i) => i.id !== id));
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
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Content Library</h1>
          <p className="mt-2 text-gray-400">Manage your photos and videos</p>
        </div>
        <Link
          href="/admin/content/new"
          className="flex items-center gap-2 rounded-lg bg-red-600 px-6 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:bg-red-700"
        >
          <Plus className="h-5 w-5" />
          Add Content
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="rounded-xl border border-gray-800 bg-gray-900 py-16 text-center">
          <p className="text-gray-400">No content yet.</p>
          <Link
            href="/admin/content/new"
            className="mt-4 inline-block text-red-400 hover:text-red-300"
          >
            Add your first memory →
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="group overflow-hidden rounded-xl border border-gray-800 bg-gray-900 transition-all hover:border-gray-700"
            >
              {/* Thumbnail */}
              <div className="relative h-48 bg-gray-800">
                {item.type === "AUDIO" ? (
                  <div className="flex h-full items-center justify-center bg-gradient-to-br from-gray-700 to-gray-900">
                    <svg className="h-16 w-16 text-gray-500" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                    </svg>
                  </div>
                ) : item.thumbnailAsset || item.mainAsset ? (
                  <img
                    src={`/api/media/${item.thumbnailAsset?.id || item.mainAsset.id}`}
                    alt={item.title}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <span className="text-4xl font-bold text-gray-600">
                      {item.title.charAt(0)}
                    </span>
                  </div>
                )}

                {/* Badges */}
                <div className="absolute top-2 left-2 flex gap-1">
                  <span className="rounded bg-black/60 px-2 py-1 text-xs font-medium text-white backdrop-blur-sm">
                    {item.type}
                  </span>
                  {item.isFeatured && (
                    <span className="rounded bg-yellow-500/80 px-2 py-1 text-xs font-medium text-black">
                      <Star className="inline h-3 w-3" /> Featured
                    </span>
                  )}
                </div>

                <div className="absolute top-2 right-2">
                  {item.isPublished ? (
                    <Eye className="h-5 w-5 text-green-400" />
                  ) : (
                    <EyeOff className="h-5 w-5 text-gray-500" />
                  )}
                </div>
              </div>

              {/* Info */}
              <div className="p-4">
                <h3 className="text-lg font-semibold text-white">{item.title}</h3>
                <p className="mt-1 text-sm text-gray-400">
                  {item.profile.name}
                  {item.dateLabel && ` · ${item.dateLabel}`}
                </p>
                {item.description && (
                  <p className="mt-2 line-clamp-2 text-sm text-gray-500">
                    {item.description}
                  </p>
                )}

                {/* Actions */}
                <div className="mt-4 flex gap-2">
                  <Link
                    href={`/admin/content/${item.id}`}
                    className="flex items-center gap-1 rounded-lg bg-gray-800 px-3 py-2 text-xs font-medium text-gray-300 transition-colors hover:bg-gray-700 hover:text-white"
                  >
                    <Edit className="h-3.5 w-3.5" />
                    Edit
                  </Link>
                  <button
                    onClick={() => deleteItem(item.id)}
                    className="flex items-center gap-1 rounded-lg bg-gray-800 px-3 py-2 text-xs font-medium text-gray-300 transition-colors hover:bg-red-900/50 hover:text-red-400"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
