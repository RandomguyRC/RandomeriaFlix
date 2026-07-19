"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Loader2, ArrowLeft, BookOpen } from "lucide-react";

const BookViewer = dynamic(() => import("@/components/book/BookViewer"), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-red-500" />
    </div>
  ),
});

interface Book {
  id: string;
  title: string;
  description?: string | null;
  dateLabel?: string | null;
  pdfAssetId: string;
}

export default function BookReaderPage() {
  const params = useParams();
  const profileSlug = params.profileslug as string;
  const bookId = params.bookId as string;
  const [book, setBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    async function loadBook() {
      try {
        const res = await fetch(`/api/books?profileSlug=${profileSlug}&bookId=${bookId}`);
        if (res.ok) {
          setBook(await res.json());
        } else {
          setNotFound(true);
        }
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    }
    loadBook();
  }, [profileSlug, bookId]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-red-500" />
      </div>
    );
  }

  if (notFound || !book) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <BookOpen className="mx-auto mb-4 h-16 w-16 text-gray-600" />
          <h2 className="mb-2 text-2xl font-bold text-white">Book Not Found</h2>
          <Link href={`/watch/${profileSlug}/book`} className="text-red-400 hover:text-red-300">
            ← Back to Books
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="px-6 py-8 sm:px-12">
      {/* Back link */}
      <Link
        href={`/watch/${profileSlug}/book`}
        className="mb-6 inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Books
      </Link>

      {/* Book header */}
      <div className="mb-8 text-center">
        <h1 className="mb-2 text-3xl font-bold text-white">{book.title}</h1>
        {book.description && (
          <p className="mb-2 max-w-2xl mx-auto text-gray-300">{book.description}</p>
        )}
        {book.dateLabel && (
          <p className="text-sm text-gray-400">{book.dateLabel}</p>
        )}
      </div>

      {/* Book viewer */}
      <BookViewer key={book.id} pdfUrl={`/api/media/${book.pdfAssetId}`} />
    </div>
  );
}
