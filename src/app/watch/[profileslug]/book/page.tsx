"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Loader2, BookOpen, Star } from "lucide-react";

interface Book {
  id: string;
  title: string;
  description?: string | null;
  dateLabel?: string | null;
  isFeatured: boolean;
}

export default function BookPage() {
  const params = useParams();
  const profileSlug = params.profileslug as string;
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadBooks() {
      try {
        const res = await fetch(`/api/books?profileSlug=${profileSlug}`);
        if (res.ok) setBooks(await res.json());
      } catch {}
      setLoading(false);
    }
    loadBooks();
  }, [profileSlug]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-red-500" />
      </div>
    );
  }

  if (books.length === 0) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <BookOpen className="mx-auto mb-4 h-16 w-16 text-gray-600" />
          <h2 className="mb-2 text-2xl font-bold text-white">No Books</h2>
          <p className="text-gray-400">The books are gone with your Random Guy.</p>
        </div>
      </div>
    );
  }

  const featuredBooks = books.filter((b) => b.isFeatured);
  const otherBooks = books.filter((b) => !b.isFeatured);

  return (
    <div className="px-4 py-6 sm:px-12 sm:py-8">
      {/* Featured Books — flex layout fills rows equally, max 3 per row */}
      {featuredBooks.length > 0 && (
        <div className="mb-8">
          <h2 className="mb-4 text-xl font-semibold text-white">Featured Books</h2>
          <div className="flex flex-wrap gap-4">
            {featuredBooks.map((book) => (
              <Link
                key={book.id}
                href={`/watch/${profileSlug}/book/${book.id}`}
                className="group flex-grow basis-full sm:basis-[calc(50%-0.5rem)] lg:basis-[calc(33.333%-0.667rem)] rounded-xl border border-red-500/20 bg-gradient-to-br from-red-950/20 via-gray-900 to-gray-900 p-5 transition-all hover:border-red-500/40 hover:shadow-red-500/10"
              >
                <div className="mb-2 flex items-center gap-2 text-red-400">
                  <Star className="h-4 w-4 fill-red-400" />
                  <span className="text-xs font-semibold uppercase tracking-widest">Featured</span>
                </div>
                <h3 className="mb-1 font-semibold text-white">{book.title}</h3>
                {book.dateLabel && <p className="text-sm text-gray-400">{book.dateLabel}</p>}
                {book.description && (
                  <p className="mt-2 line-clamp-2 text-sm text-gray-500">{book.description}</p>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Other book cards */}
      {otherBooks.length > 0 && (
        <div>
          <h2 className="mb-4 text-xl font-semibold text-white">All Books</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {otherBooks.map((book) => (
              <Link
                key={book.id}
                href={`/watch/${profileSlug}/book/${book.id}`}
                className="group rounded-xl border border-gray-800 bg-gray-900 p-5 transition-all hover:border-gray-700 hover:bg-gray-800/50"
              >
                <BookOpen className="mb-3 h-6 w-6 text-red-400" />
                <h3 className="mb-1 font-semibold text-white">{book.title}</h3>
                {book.dateLabel && <p className="text-sm text-gray-400">{book.dateLabel}</p>}
                {book.description && (
                  <p className="mt-2 line-clamp-2 text-sm text-gray-500">{book.description}</p>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
