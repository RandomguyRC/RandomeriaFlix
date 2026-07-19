"use client";

import { useState, useEffect, useRef } from "react";
import { Plus, Trash2, Loader2, Film, Upload, X, Pencil, Check } from "lucide-react";

interface ReelItem {
  id: string;
  title: string;
  type: "PHOTO" | "VIDEO" | "AUDIO";
  description?: string | null;
  dateLabel?: string | null;
  mood?: string | null;
  isReel: boolean;

  mainAsset: {
    id: string;
    originalName: string;
    mimeType: string;
  };

  thumbnailAsset?: {
    id: string;
    originalName: string;
    mimeType: string;
  } | null;

  profile: {
    name: string;
  };
}

interface Profile {
  id: string;
  name: string;
}

export default function AdminReelsPage() {
  const [reels, setReels] = useState<ReelItem[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  // Upload form
  const [showForm, setShowForm] = useState(false);
  const [formProfileId, setFormProfileId] = useState("");
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formDateLabel, setFormDateLabel] = useState("");
  const [formMood, setFormMood] = useState("");
  const [formFile, setFormFile] = useState<File | null>(null);
  const [formType, setFormType] = useState<"PHOTO" | "VIDEO">("VIDEO");
  const [uploading, setUploading] = useState(false);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editDateLabel, setEditDateLabel] = useState("");
  const [editMood, setEditMood] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchReels(); fetchProfiles(); }, []);

  async function fetchReels() {
    try {
      const res = await fetch("/api/admin/reels");
      if (res.ok) setReels(await res.json());
    } catch {}
    setLoading(false);
  }

  async function fetchProfiles() {
    const res = await fetch("/api/admin/profiles");
    if (res.ok) setProfiles(await res.json());
  }

  async function handleUpload() {
    if (!formFile || !formTitle.trim() || !formProfileId) return;
    setUploading(true);
    try {
      // Upload file
      const formData = new FormData();
      formData.append("file", formFile);
      const uploadRes = await fetch("/api/admin/upload", { method: "POST", body: formData });
      if (!uploadRes.ok) { alert("Upload failed"); return; }
      const uploadData = await uploadRes.json();

      // Create content item as reel
      await fetch("/api/admin/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profileId: formProfileId,
          type: formType,
          title: formTitle.trim(),
          description: formDescription.trim() || undefined,
          dateLabel: formDateLabel.trim() || undefined,
          mood: formMood.trim() || undefined,
          mainAssetId: uploadData.id,
          isPublished: true,
          isReel: true,
        }),
      });

      setFormTitle(""); setFormDescription(""); setFormDateLabel(""); setFormMood("");
      setFormFile(null);
      setShowForm(false);
      fetchReels();
    } catch { alert("Failed"); }
    finally { setUploading(false); }
  }

  async function handleSaveEdit() {
    if (!editingId || !editTitle.trim()) return;
    setSaving(true);
    try {
      await fetch(`/api/admin/content/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editTitle.trim(),
          description: editDescription.trim() || null,
          dateLabel: editDateLabel.trim() || null,
          mood: editMood.trim() || null,
        }),
      });
      setEditingId(null);
      fetchReels();
    } finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this reel?")) return;
    await fetch(`/api/admin/content/${id}`, { method: "DELETE" });
    setReels(reels.filter((r) => r.id !== id));
  }

  return (
    <div>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Reels</h1>
          <p className="mt-2 text-gray-400">Upload videos and photos for the Reels tab</p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-lg bg-red-600 px-6 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:bg-red-700">
          <Plus className="h-5 w-5" /> Add Reel
        </button>
      </div>

      {/* Upload form */}
      {showForm && (
        <div className="mb-6 rounded-xl border border-gray-700 bg-gray-900 p-6">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-lg font-semibold text-white">New Reel</h2>
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
                <label className="mb-1 block text-sm text-gray-400">Type</label>
                <div className="flex gap-3">
                  {(["VIDEO", "PHOTO"] as const).map((t) => (
                    <button key={t} type="button" onClick={() => setFormType(t)}
                      className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                        formType === t ? "bg-red-600 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                      }`}>
                      {t === "VIDEO" ? "🎬 Video" : "📷 Photo"}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm text-gray-400">Title *</label>
              <input type="text" value={formTitle} onChange={(e) => setFormTitle(e.target.value)}
                placeholder="Reel title..."
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 text-white placeholder-gray-500 focus:border-red-500 focus:outline-none" />
            </div>
            <div>
              <label className="mb-1 block text-sm text-gray-400">Description</label>
              <textarea value={formDescription} onChange={(e) => setFormDescription(e.target.value)} rows={2}
                placeholder="What's this about?"
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 text-white placeholder-gray-500 focus:border-red-500 focus:outline-none" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm text-gray-400">Date</label>
                <input type="text" value={formDateLabel} onChange={(e) => setFormDateLabel(e.target.value)}
                  placeholder="e.g. June 2024"
                  className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 text-white placeholder-gray-500 focus:border-red-500 focus:outline-none" />
              </div>
              <div>
                <label className="mb-1 block text-sm text-gray-400">Mood</label>
                <input type="text" value={formMood} onChange={(e) => setFormMood(e.target.value)}
                  placeholder="e.g. romantic, funny"
                  className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 text-white placeholder-gray-500 focus:border-red-500 focus:outline-none" />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm text-gray-400">File *</label>
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-700 bg-gray-800/50 px-6 py-6 text-sm text-gray-400 transition-colors hover:border-gray-600 hover:text-gray-300">
                <Upload className="h-5 w-5" />
                {formFile ? formFile.name : formType === "VIDEO" ? "Choose video..." : "Choose photo..."}
                <input type="file" accept={formType === "VIDEO" ? "video/*" : "image/*"} className="hidden"
                  onChange={(e) => setFormFile(e.target.files?.[0] || null)} />
              </label>
            </div>
            <button onClick={handleUpload} disabled={uploading || !formFile || !formTitle.trim() || !formProfileId}
              className="flex items-center gap-2 rounded-lg bg-red-600 px-6 py-3 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50">
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Film className="h-4 w-4" />}
              {uploading ? "Uploading..." : "Add Reel"}
            </button>
          </div>
        </div>
      )}

      {/* Edit form */}
      {editingId && (
        <div className="mb-6 rounded-xl border border-gray-700 bg-gray-900 p-6">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-lg font-semibold text-white">Edit Reel</h2>
            <button onClick={() => setEditingId(null)} className="text-gray-400 hover:text-white"><X className="h-5 w-5" /></button>
          </div>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm text-gray-400">Title *</label>
              <input type="text" value={editTitle} onChange={(e) => setEditTitle(e.target.value)}
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 text-white focus:border-red-500 focus:outline-none" />
            </div>
            <div>
              <label className="mb-1 block text-sm text-gray-400">Description</label>
              <textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} rows={3}
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 text-white focus:border-red-500 focus:outline-none" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm text-gray-400">Date</label>
                <input type="text" value={editDateLabel} onChange={(e) => setEditDateLabel(e.target.value)}
                  className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 text-white focus:border-red-500 focus:outline-none" />
              </div>
              <div>
                <label className="mb-1 block text-sm text-gray-400">Mood</label>
                <input type="text" value={editMood} onChange={(e) => setEditMood(e.target.value)}
                  className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 text-white focus:border-red-500 focus:outline-none" />
              </div>
            </div>
            <button onClick={handleSaveEdit} disabled={saving || !editTitle.trim()}
              className="flex items-center gap-2 rounded-lg bg-red-600 px-6 py-3 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Update Reel
            </button>
          </div>
        </div>
      )}

      {/* Reels list */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin rounded-full border-4 border-red-500 border-t-transparent" />
        </div>
      ) : reels.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-700 bg-gray-900 py-16 text-center">
          <Film className="mx-auto mb-3 h-10 w-10 text-gray-600" />
          <p className="text-gray-400">No reels yet. Add your first one above.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {reels.map((reel) => (
            <div key={reel.id} className="group overflow-hidden rounded-xl border border-gray-800 bg-gray-900 transition-all hover:border-gray-700">
              <div className="relative h-48 bg-gray-800">
                {reel.thumbnailAsset ? (
                  <img src={`/api/media/${reel.thumbnailAsset.id}`} alt={reel.title}
                    className="h-full w-full object-cover" />
                ) : reel.type === "VIDEO" ? (
                  <VideoThumb videoSrc={`/api/media/${reel.mainAsset.id}`} />
                ) : (
                  <img src={`/api/media/${reel.mainAsset.id}`} alt={reel.title}
                    className="h-full w-full object-cover" />
                )}
                <div className="absolute top-2 left-2">
                  <span className="rounded bg-black/60 px-2 py-1 text-xs font-medium text-white backdrop-blur-sm">
                    {reel.type === "VIDEO" ? "🎬" : "📷"} {reel.type}
                  </span>
                </div>
              </div>
              <div className="p-4">
                <p className="font-medium text-white">{reel.title}</p>
                <p className="text-xs text-gray-500">{reel.profile.name}{reel.dateLabel && ` · ${reel.dateLabel}`}</p>
                <div className="mt-3 flex justify-end gap-1">
                  <button onClick={() => { setEditingId(reel.id); setEditTitle(reel.title); setEditDescription(reel.description || ""); setEditDateLabel(reel.dateLabel || ""); setEditMood(reel.mood || ""); }}
                    className="rounded-lg p-2 text-gray-400 hover:bg-gray-800 hover:text-white">
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button onClick={() => handleDelete(reel.id)}
                    className="rounded-lg p-2 text-gray-400 hover:bg-red-900/50 hover:text-red-400">
                    <Trash2 className="h-4 w-4" />
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

function VideoThumb({ videoSrc }: { videoSrc: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [frameUrl, setFrameUrl] = useState<string | null>(null);

  useEffect(() => {
    const video = document.createElement("video");
    video.src = videoSrc;
    video.muted = true;
    video.preload = "metadata";

    video.addEventListener("loadeddata", () => {
      // Seek to 10% of the video for a good frame
      video.currentTime = video.duration * 0.1;
    });

    video.addEventListener("seeked", () => {
      const canvas = document.createElement("canvas");
      canvas.width = 320;
      canvas.height = 180;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(video, 0, 0, 320, 180);
      setFrameUrl(canvas.toDataURL("image/jpeg", 0.8));
    });
  }, [videoSrc]);

  return (
    <div className="h-full w-full bg-gray-800 flex items-center justify-center">
      {frameUrl ? (
        <img src={frameUrl} alt="Video frame" className="h-full w-full object-cover" />
      ) : (
        <span className="text-gray-500 text-xs">Loading frame...</span>
      )}
    </div>
  );
}
