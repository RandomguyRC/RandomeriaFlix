"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, Loader2, Upload, X } from "lucide-react";
import StickerMedia from "@/components/ui/StickerMedia";

interface Sticker {
  id: string;
  title: string;
  asset: { id: string; mimeType?: string };
  profile: { name: string };
}

interface Profile {
  id: string;
  name: string;
}

export default function AdminStickersPage() {
  const [stickers, setStickers] = useState<Sticker[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formProfileId, setFormProfileId] = useState("");
  const [formTitle, setFormTitle] = useState("");
  const [formFile, setFormFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const [showBulkForm, setShowBulkForm] = useState(false);
  const [bulkProfileId, setBulkProfileId] = useState("");
  const [bulkFiles, setBulkFiles] = useState<File[]>([]);
  const [bulkUploading, setBulkUploading] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ done: 0, total: 0 });
  const [bulkErrors, setBulkErrors] = useState<string[]>([]);

  useEffect(() => { fetchStickers(); fetchProfiles(); }, []);

  async function fetchStickers() {
    try {
      const res = await fetch("/api/admin/stickers");
      if (res.ok) setStickers(await res.json());
    } catch {}
    setLoading(false);
  }

  async function fetchProfiles() {
    const res = await fetch("/api/admin/profiles");
    if (res.ok) setProfiles(await res.json());
  }

  async function handleUpload() {
    if (!formFile || !formProfileId) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", formFile);
      const uploadRes = await fetch("/api/admin/upload", { method: "POST", body: formData });
      if (!uploadRes.ok) { alert("Upload failed"); return; }
      const uploadData = await uploadRes.json();

      await fetch("/api/admin/stickers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId: formProfileId, title: formTitle.trim(), assetId: uploadData.id }),
      });

      setFormTitle(""); setFormFile(null);
      setShowForm(false);
      fetchStickers();
    } catch { alert("Failed"); }
    finally { setUploading(false); }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this sticker?")) return;
    await fetch(`/api/admin/stickers/${id}`, { method: "DELETE" });
    setStickers(stickers.filter((s) => s.id !== id));
  }

  function handleBulkFilesSelected(files: FileList | null) {
    if (!files) return;
    const sorted = Array.from(files).sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" })
    );
    setBulkFiles(sorted);
  }

  async function handleBulkUpload() {
    if (!bulkFiles.length || !bulkProfileId) return;
    setBulkUploading(true);
    setBulkErrors([]);
    setBulkProgress({ done: 0, total: bulkFiles.length });

    const errors: string[] = [];

    // Upload sequentially so stickers keep the numbered order from the filenames
    for (let i = 0; i < bulkFiles.length; i++) {
      const file = bulkFiles[i];
      try {
        const formData = new FormData();
        formData.append("file", file);
        const uploadRes = await fetch("/api/admin/upload", { method: "POST", body: formData });
        if (!uploadRes.ok) {
          errors.push(file.name);
        } else {
          const uploadData = await uploadRes.json();
          await fetch("/api/admin/stickers", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ profileId: bulkProfileId, title: "", assetId: uploadData.id }),
          });
        }
      } catch {
        errors.push(file.name);
      }
      setBulkProgress({ done: i + 1, total: bulkFiles.length });
    }

    setBulkErrors(errors);
    setBulkUploading(false);
    if (errors.length === 0) {
      setBulkFiles([]);
      setShowBulkForm(false);
    }
    fetchStickers();
  }

  return (
    <div>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Stickers</h1>
          <p className="mt-2 text-gray-400">Upload stickers for each profile</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => { setShowBulkForm(!showBulkForm); setShowForm(false); }}
            className="flex items-center gap-2 rounded-lg border border-gray-700 bg-gray-800 px-6 py-3 text-sm font-semibold text-white hover:bg-gray-700">
            <Upload className="h-5 w-5" /> Bulk Add
          </button>
          <button onClick={() => { setShowForm(!showForm); setShowBulkForm(false); }}
            className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-lg bg-red-600 px-6 py-3 text-sm font-semibold text-white shadow-lg hover:bg-red-700">
            <Plus className="h-5 w-5" /> Add Sticker
          </button>
        </div>
      </div>

      {showBulkForm && (
        <div className="mb-6 rounded-xl border border-gray-700 bg-gray-900 p-6">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">Bulk Add Stickers</h2>
              <p className="mt-1 text-xs text-gray-500">Select all files at once — they'll be added in numeric filename order (1, 2, 3...). Titles are left blank so you can fill them in later.</p>
            </div>
            <button onClick={() => setShowBulkForm(false)} className="text-gray-400 hover:text-white"><X className="h-5 w-5" /></button>
          </div>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm text-gray-400">Profile *</label>
              <select value={bulkProfileId} onChange={(e) => setBulkProfileId(e.target.value)}
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 text-white focus:border-red-500 focus:outline-none">
                <option value="">Select profile...</option>
                {profiles.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm text-gray-400">Sticker files * (PNG, WEBP, GIF or WEBM)</label>
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-700 bg-gray-800/50 px-6 py-6 text-sm text-gray-400 hover:border-gray-600 hover:text-gray-300">
                <Upload className="h-5 w-5" />
                {bulkFiles.length ? `${bulkFiles.length} files selected` : "Choose sticker files..."}
                <input type="file" multiple accept="image/png,image/webp,image/gif,image/jpeg,video/webm" className="hidden"
                  onChange={(e) => handleBulkFilesSelected(e.target.files)} />
              </label>
            </div>

            {bulkFiles.length > 0 && (
              <div className="max-h-40 overflow-y-auto rounded-lg border border-gray-800 bg-gray-950 p-3">
                <p className="mb-2 text-xs text-gray-500">Upload order:</p>
                <ol className="space-y-0.5 text-xs text-gray-400">
                  {bulkFiles.map((f, i) => (
                    <li key={f.name + i} className="truncate">{i + 1}. {f.name}</li>
                  ))}
                </ol>
              </div>
            )}

            {bulkUploading && (
              <div>
                <div className="mb-1 flex justify-between text-xs text-gray-400">
                  <span>Uploading...</span>
                  <span>{bulkProgress.done} / {bulkProgress.total}</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-gray-800">
                  <div className="h-full bg-red-600 transition-all"
                    style={{ width: `${bulkProgress.total ? (bulkProgress.done / bulkProgress.total) * 100 : 0}%` }} />
                </div>
              </div>
            )}

            {bulkErrors.length > 0 && (
              <p className="text-xs text-red-400">Failed to upload: {bulkErrors.join(", ")}</p>
            )}

            <button onClick={handleBulkUpload} disabled={bulkUploading || !bulkFiles.length || !bulkProfileId}
              className="flex items-center gap-2 rounded-lg bg-red-600 px-6 py-3 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50">
              {bulkUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {bulkUploading ? `Uploading ${bulkProgress.done}/${bulkProgress.total}...` : `Upload ${bulkFiles.length || ""} Stickers`}
            </button>
          </div>
        </div>
      )}

      {showForm && (
        <div className="mb-6 rounded-xl border border-gray-700 bg-gray-900 p-6">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-lg font-semibold text-white">New Sticker</h2>
            <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-white"><X className="h-5 w-5" /></button>
          </div>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm text-gray-400">Profile *</label>
                <select value={formProfileId} onChange={(e) => setFormProfileId(e.target.value)}
                  className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 text-white focus:border-red-500 focus:outline-none">
                  <option value="">Select profile...</option>
                  {profiles.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm text-gray-400">Title (optional)</label>
                <input type="text" value={formTitle} onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="Sticker name..."
                  className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 text-white placeholder-gray-500 focus:border-red-500 focus:outline-none" />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm text-gray-400">Sticker file * (PNG, WEBP, GIF or WEBM)</label>
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-700 bg-gray-800/50 px-6 py-6 text-sm text-gray-400 hover:border-gray-600 hover:text-gray-300">
                <Upload className="h-5 w-5" />
                {formFile ? formFile.name : "Choose sticker file..."}
                <input type="file" accept="image/png,image/webp,image/gif,image/jpeg,video/webm" className="hidden" onChange={(e) => setFormFile(e.target.files?.[0] || null)} />
              </label>
            </div>
            <button onClick={handleUpload} disabled={uploading || !formFile || !formProfileId}
              className="flex items-center gap-2 rounded-lg bg-red-600 px-6 py-3 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50">
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {uploading ? "Uploading..." : "Add Sticker"}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin rounded-full border-4 border-red-500 border-t-transparent" />
        </div>
      ) : stickers.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-700 bg-gray-900 py-16 text-center">
          <p className="text-gray-400">No stickers yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4">
          {stickers.map((sticker) => (
            <div key={sticker.id} className="group relative rounded-xl border border-gray-800 bg-gray-900 p-2 transition-all hover:border-gray-700">
              <div className="aspect-square overflow-hidden rounded-lg bg-gray-800">
                <StickerMedia assetId={sticker.asset.id} mimeType={sticker.asset.mimeType} title={sticker.title}
                  className="h-full w-full object-contain" />
              </div>
              {sticker.title && (
                <p className="mt-2 text-center text-xs text-gray-400 truncate">{sticker.title}</p>
              )}
              <button onClick={() => handleDelete(sticker.id)}
                className="absolute -top-2 -right-2 rounded-full bg-gray-800 p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <X className="h-3.5 w-3.5 text-gray-400 hover:text-red-400" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
