"use client";

import { useState, useEffect } from "react";
import { Upload, Trash2, Loader2, BookOpen, Star, Pencil, X, Check } from "lucide-react";

interface Book {
  id: string;
  title: string;
  description?: string | null;
  dateLabel?: string | null;
  isFeatured: boolean;
  pdfAssetId: string;
  profileId: string;
  profile: { name: string; slug: string };
}

interface Profile {
  id: string;
  name: string;
  slug: string;
}

export default function AdminBookPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const [selectedProfile, setSelectedProfile] = useState("");
  const [bookTitle, setBookTitle] = useState("");
  const [bookDescription, setBookDescription] = useState("");
  const [bookDateLabel, setBookDateLabel] = useState("");
  const [isFeatured, setIsFeatured] = useState(false);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editDateLabel, setEditDateLabel] = useState("");
  const [editFeatured, setEditFeatured] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [pdfFile, setPdfFile] = useState<File | null>(null);

  useEffect(() => { fetchBooks(); fetchProfiles(); }, []);

  async function fetchBooks() {
    try {
      const res = await fetch("/api/admin/books");
      if (res.ok) setBooks(await res.json());
    } catch {}
    setLoading(false);
  }

  async function fetchProfiles() {
    const res = await fetch("/api/admin/profiles");
    if (res.ok) setProfiles(await res.json());
  }

  async function handleUpload() {
    if (!selectedProfile || !bookTitle.trim() || !pdfFile) return;
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("profileId", selectedProfile);
      formData.append("title", bookTitle.trim());
      formData.append("description", bookDescription.trim());
      formData.append("dateLabel", bookDateLabel.trim());
      formData.append("isFeatured", String(isFeatured));
      formData.append("file", pdfFile);

      const res = await fetch("/api/admin/books", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        setPdfFile(null);
        setBookTitle("");
        setBookDescription("");
        setBookDateLabel("");
        setIsFeatured(false);
        fetchBooks();
      } else {
        const err = await res.json();
        alert(err.error || "Upload failed");
      }
    } catch {
      alert("Upload failed");
    } finally {
      setUploading(false);
    }
  }

  function startEdit(book: Book) {
    setEditingId(book.id);
    setEditTitle(book.title);
    setEditDescription(book.description || "");
    setEditDateLabel(book.dateLabel || "");
    setEditFeatured(book.isFeatured);
  }

  function cancelEdit() {
    setEditingId(null);
  }

  async function saveEdit() {
    if (!editingId || !editTitle.trim()) return;
    setSavingEdit(true);
    try {
      await fetch(`/api/admin/books/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editTitle.trim(),
          description: editDescription.trim() || null,
          dateLabel: editDateLabel.trim() || null,
          isFeatured: editFeatured,
        }),
      });
      setEditingId(null);
      fetchBooks();
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this book?")) return;
    await fetch(`/api/admin/books/${id}`, { method: "DELETE" });
    setBooks(books.filter((b) => b.id !== id));
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Book / PDF</h1>
        <p className="mt-2 text-gray-400">Upload PDF books for each profile</p>
      </div>

      {/* Upload form */}
      <div className="mb-8 rounded-xl border border-gray-800 bg-gray-900 p-6">
        <h2 className="mb-4 text-lg font-semibold text-white">Upload Book</h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm text-gray-400">Profile</label>
            <select value={selectedProfile} onChange={(e) => setSelectedProfile(e.target.value)}
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 text-white focus:border-red-500 focus:outline-none">
              <option value="">Select profile...</option>
              {profiles.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm text-gray-400">Book Title *</label>
            <input type="text" value={bookTitle} onChange={(e) => setBookTitle(e.target.value)}
              placeholder="e.g. Our Love Story"
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 text-white placeholder-gray-500 focus:border-red-500 focus:outline-none" />
          </div>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm text-gray-400">Description (optional)</label>
            <input type="text" value={bookDescription} onChange={(e) => setBookDescription(e.target.value)}
              placeholder="A short description..."
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 text-white placeholder-gray-500 focus:border-red-500 focus:outline-none" />
          </div>
          <div>
            <label className="mb-1 block text-sm text-gray-400">Date (optional)</label>
            <input type="text" value={bookDateLabel} onChange={(e) => setBookDateLabel(e.target.value)}
              placeholder="e.g. June 2024"
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 text-white placeholder-gray-500 focus:border-red-500 focus:outline-none" />
          </div>
        </div>

        <div className="mt-4">
          <label className="mb-1 block text-sm text-gray-400">PDF File *</label>
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-700 bg-gray-800/50 px-6 py-8 text-sm text-gray-400 transition-colors hover:border-gray-600 hover:text-gray-300">
            <Upload className="h-5 w-5" />
            {pdfFile ? pdfFile.name : "Choose PDF file..."}
            <input type="file" accept=".pdf" className="hidden" onChange={(e) => setPdfFile(e.target.files?.[0] || null)} />
          </label>
        </div>

        <div className="mt-4 flex items-center gap-4">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={isFeatured} onChange={(e) => setIsFeatured(e.target.checked)}
              className="h-4 w-4 rounded border-gray-600 bg-gray-800 text-red-500 focus:ring-red-500" />
            <span className="text-sm text-gray-300">Featured book (shown at top)</span>
          </label>
        </div>

        <button onClick={handleUpload} disabled={uploading || !selectedProfile || !bookTitle.trim() || !pdfFile}
          className="mt-4 flex items-center gap-2 rounded-lg bg-red-600 px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-red-700 disabled:opacity-50">
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          {uploading ? "Uploading..." : "Upload Book"}
        </button>
      </div>

      {/* Books list */}
      <h2 className="mb-4 text-lg font-semibold text-white">Uploaded Books</h2>
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-red-500" />
        </div>
      ) : books.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-700 bg-gray-900 py-12 text-center">
          <BookOpen className="mx-auto mb-3 h-10 w-10 text-gray-600" />
          <p className="text-gray-400">No books uploaded yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {books.map((book) => (
            <div key={book.id}
              className="rounded-lg border border-gray-800 bg-gray-900 px-4 py-3">
              {editingId === book.id ? (
                /* Edit mode */
                <div className="space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <input type="text" value={editTitle} onChange={(e) => setEditTitle(e.target.value)}
                      placeholder="Title"
                      className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-red-500 focus:outline-none" />
                    <input type="text" value={editDateLabel} onChange={(e) => setEditDateLabel(e.target.value)}
                      placeholder="Date label"
                      className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-red-500 focus:outline-none" />
                  </div>
                  <input type="text" value={editDescription} onChange={(e) => setEditDescription(e.target.value)}
                    placeholder="Description"
                    className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-red-500 focus:outline-none" />
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2">
                      <input type="checkbox" checked={editFeatured} onChange={(e) => setEditFeatured(e.target.checked)}
                        className="h-4 w-4 rounded border-gray-600 bg-gray-800 text-red-500 focus:ring-red-500" />
                      <span className="text-sm text-gray-300">Featured</span>
                    </label>
                    <div className="flex-1" />
                    <button onClick={cancelEdit}
                      className="rounded-lg bg-gray-800 px-3 py-1.5 text-xs text-gray-400 hover:bg-gray-700 hover:text-white">
                      <X className="inline h-3.5 w-3.5" /> Cancel
                    </button>
                    <button onClick={saveEdit} disabled={savingEdit}
                      className="flex items-center gap-1 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50">
                      {savingEdit ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                /* View mode */
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <BookOpen className="h-5 w-5 text-red-400" />
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-white">{book.title}</p>
                        {book.isFeatured && <Star className="h-3.5 w-3.5 text-yellow-400 fill-yellow-400" />}
                      </div>
                      <p className="text-xs text-gray-500">
                        {book.profile.name}
                        {book.dateLabel && ` · ${book.dateLabel}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => startEdit(book)}
                      className="rounded-lg p-2 text-gray-400 hover:bg-gray-800 hover:text-white">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button onClick={() => handleDelete(book.id)}
                      className="rounded-lg p-2 text-gray-400 hover:bg-red-900/50 hover:text-red-400">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
