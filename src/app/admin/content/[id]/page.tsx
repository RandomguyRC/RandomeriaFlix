"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { Upload, X, Loader2, ArrowLeft, Crop } from "lucide-react";
import Link from "next/link";
import ImagePositionPicker from "@/components/ui/ImagePositionPicker";
import AudioTrimmer from "@/components/ui/AudioTrimmer";
import VideoFramePicker from "@/components/ui/VideoFramePicker";

interface UploadedFile { id: string; originalName: string; }
interface Category { id: string; title: string; profileId: string; _count: { placements: number }; }

export default function EditContentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dateLabel, setDateLabel] = useState("");
  const [tags, setTags] = useState("");
  const [mood, setMood] = useState("");
  const [type, setType] = useState<"PHOTO" | "VIDEO" | "AUDIO">("PHOTO");
  const [isFeatured, setIsFeatured] = useState(false);
  const [isPublished, setIsPublished] = useState(true);

  const [mainFile, setMainFile] = useState<UploadedFile | null>(null);
  const [thumbFile, setThumbFile] = useState<UploadedFile | null>(null);
  const [musicFile, setMusicFile] = useState<UploadedFile | null>(null);
  const [uploadingField, setUploadingField] = useState<string | null>(null);

  // Aspect mode
  const [aspectMode, setAspectMode] = useState<"auto" | "portrait" | "landscape">("auto");
  const [detailZoom, setDetailZoom] = useState(1);
  const [videoRotation, setVideoRotation] = useState(0);

  // Music trim
  const [musicStartMs, setMusicStartMs] = useState(0);
  const [musicDurationMs, setMusicDurationMs] = useState(15000);
  const [trimmerOpen, setTrimmerOpen] = useState(false);
  const [framePickerOpen, setFramePickerOpen] = useState(false);

  // Crop positions
  const [detailCropX, setDetailCropX] = useState(50);
  const [detailCropY, setDetailCropY] = useState(50);
  const [thumbCropX, setThumbCropX] = useState(50);
  const [thumbCropY, setThumbCropY] = useState(50);
  const [positionPickerOpen, setPositionPickerOpen] = useState<"detail" | "thumb" | null>(null);

  const [categories, setCategories] = useState<Category[]>([]);
  const [currentCategoryId, setCurrentCategoryId] = useState("");
  const [savingCategory, setSavingCategory] = useState(false);

  useEffect(() => { fetchContent(); }, [id]);

  async function fetchContent() {
    try {
      const res = await fetch(`/api/admin/content/${id}`);
      if (!res.ok) { router.push("/admin/content"); return; }
      const item = await res.json();
      setTitle(item.title);
      setDescription(item.description || "");
      setDateLabel(item.dateLabel || "");
      setTags(item.tags || "");
      setMood(item.mood || "");
      setType(item.type);
      setIsFeatured(item.isFeatured);
      setIsPublished(item.isPublished);
      setDetailCropX(item.detailCropX ?? 50);
      setDetailCropY(item.detailCropY ?? 50);
      setThumbCropX(item.thumbCropX ?? 50);
      setThumbCropY(item.thumbCropY ?? 50);
      setAspectMode(item.aspectMode ?? "auto");
      setDetailZoom(item.detailZoom ?? 1);
      setVideoRotation(item.videoRotation ?? 0);
      setMusicStartMs(item.musicStartMs ?? 0);
      setMusicDurationMs(item.musicDurationMs ?? 15000);
      if (item.mainAsset) setMainFile(item.mainAsset);
      if (item.thumbnailAsset) setThumbFile(item.thumbnailAsset);
      if (item.musicAsset) setMusicFile(item.musicAsset);
      if (item.placements?.length > 0) setCurrentCategoryId(item.placements[0].categoryId);
      const catRes = await fetch(`/api/admin/categories?profileId=${item.profileId}`);
      if (catRes.ok) setCategories(await catRes.json());
    } catch { router.push("/admin/content"); } finally { setLoading(false); }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>, field: "main" | "thumb" | "music") {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingField(field);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch("/api/admin/upload", { method: "POST", body: formData });
      if (!res.ok) { alert("Upload failed"); return; }
      const data = await res.json();
      const uploaded: UploadedFile = { id: data.id, originalName: data.originalName };
      if (field === "main") setMainFile(uploaded);
      else if (field === "thumb") setThumbFile(uploaded);
      else if (field === "music") setMusicFile(uploaded);
    } catch { alert("Upload failed"); } finally { setUploadingField(null); }
  }

  async function handleFrameCapture(blob: Blob) {
    setFramePickerOpen(false);
    setUploadingField("thumb");
    const formData = new FormData();
    formData.append("file", blob, "thumbnail.jpg");
    try {
      const res = await fetch("/api/admin/upload", { method: "POST", body: formData });
      if (res.ok) {
        const data = await res.json();
        setThumbFile({ id: data.id, originalName: "Video thumbnail" });
      }
    } catch { alert("Upload failed"); } finally { setUploadingField(null); }
  }

  async function handleCategorySave() {
    setSavingCategory(true);
    try {
      if (currentCategoryId) {
        await fetch("/api/admin/placements", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contentItemId: id, categoryId: currentCategoryId }),
        });
      } else {
        await fetch(`/api/admin/placements?contentItemId=${id}`, { method: "DELETE" });
      }
    } finally { setSavingCategory(false); }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!mainFile) { alert("Upload a file"); return; }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/content/${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type, title: title.trim(),
          description: description.trim() || undefined,
          dateLabel: dateLabel.trim() || undefined,
          tags: tags.trim() || undefined, mood: mood.trim() || undefined,
          isFeatured, isPublished,
          mainAssetId: mainFile.id,
          thumbnailAssetId: thumbFile?.id || null,
          musicAssetId: musicFile?.id || null,
          musicStartMs, musicDurationMs,
          detailCropX, detailCropY, thumbCropX, thumbCropY,
          aspectMode,
          detailZoom,
          videoRotation,
        }),
      });
      if (res.ok) router.push("/admin/content");
      else alert("Failed to update");
    } finally { setSubmitting(false); }
  }

  if (loading) return <div className="flex items-center justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-red-500 border-t-transparent" /></div>;

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/admin/content" className="mb-6 inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white">
        <ArrowLeft className="h-4 w-4" /> Back to Content
      </Link>
      <h1 className="mb-8 text-2xl sm:text-3xl font-bold text-white">Edit Content</h1>

      {/* Audio Trimmer */}
      {trimmerOpen && musicFile && (
        <AudioTrimmer
          audioSrc={`/api/media/${musicFile.id}`}
          currentStartMs={musicStartMs}
          currentDurationMs={musicDurationMs}
          onSave={(start, duration) => {
            setMusicStartMs(start);
            setMusicDurationMs(duration);
            setTrimmerOpen(false);
          }}
          onCancel={() => setTrimmerOpen(false)}
        />
      )}

      {/* Video Frame Picker */}
      {framePickerOpen && mainFile && (
        <VideoFramePicker
          videoSrc={`/api/media/${mainFile.id}`}
          onSave={handleFrameCapture}
          onCancel={() => setFramePickerOpen(false)}
        />
      )}

      {/* Position Pickers */}
      {positionPickerOpen === "detail" && mainFile && (
        <ImagePositionPicker
          imageSrc={`/api/media/${mainFile.id}`}
          targetAspect={16 / 9}
          dynamicAspect="modal"
          targetLabel="Detail View (Modal)"
          currentX={detailCropX}
          currentY={detailCropY}
          mode={aspectMode}
          onModeChange={setAspectMode}
          currentZoom={detailZoom}
          onSave={(x, y, z) => { setDetailCropX(x); setDetailCropY(y); setDetailZoom(z); setPositionPickerOpen(null); }}
          onCancel={() => setPositionPickerOpen(null)}
        />
      )}
      {positionPickerOpen === "thumb" && (thumbFile || mainFile) && (
        <ImagePositionPicker
          imageSrc={thumbFile ? `/api/media/${thumbFile.id}` : `/api/media/${mainFile!.id}`}
          targetAspect={16 / 10}
          targetLabel="Thumbnail Card"
          currentX={thumbCropX}
          currentY={thumbCropY}
          onSave={(x, y) => { setThumbCropX(x); setThumbCropY(y); setPositionPickerOpen(null); }}
          onCancel={() => setPositionPickerOpen(null)}
        />
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Type */}
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-300">Type</label>
          <div className="flex gap-4">
            {(["PHOTO", "VIDEO", "AUDIO"] as const).map((t) => (
              <button key={t} type="button" onClick={() => setType(t)}
                className={`rounded-lg px-6 py-2.5 text-sm font-medium transition-colors ${type === t ? "bg-red-600 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"}`}>
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Main file */}
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-300">{type === "PHOTO" ? "Photo" : "Video"}</label>
          <UploadZone file={mainFile} uploading={uploadingField === "main"} accept={type === "PHOTO" ? "image/*" : type === "VIDEO" ? "video/*" : "audio/*"}
            onUpload={(e) => handleUpload(e, "main")} onRemove={() => setMainFile(null)} label={type === "AUDIO" ? "Upload audio file" : `Upload ${type.toLowerCase()}`} />
          {mainFile && type === "PHOTO" && (
            <button type="button" onClick={() => setPositionPickerOpen("detail")}
              className="mt-2 flex items-center gap-1.5 rounded-lg bg-gray-800 px-3 py-2 text-xs font-medium text-gray-300 hover:bg-gray-700 hover:text-white">
              <Crop className="h-3.5 w-3.5" /> Edit Detail Position
            </button>
          )}
          {mainFile && type === "VIDEO" && (
            <button type="button" onClick={() => setFramePickerOpen(true)}
              className="mt-2 flex items-center gap-1.5 rounded-lg bg-gray-800 px-3 py-2 text-xs font-medium text-gray-300 hover:bg-gray-700 hover:text-white">
              🎬 Pick Thumbnail from Video
            </button>
          )}
        </div>

        {/* Thumbnail */}
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-300">Thumbnail (optional)</label>
          <UploadZone file={thumbFile} uploading={uploadingField === "thumb"} accept="image/*"
            onUpload={(e) => handleUpload(e, "thumb")} onRemove={() => setThumbFile(null)} label="Upload thumbnail" />
          {thumbFile && (
            <button type="button" onClick={() => setPositionPickerOpen("thumb")}
              className="mt-2 flex items-center gap-1.5 rounded-lg bg-gray-800 px-3 py-2 text-xs font-medium text-gray-300 hover:bg-gray-700 hover:text-white">
              <Crop className="h-3.5 w-3.5" /> Edit Thumbnail Position
            </button>
          )}
        </div>

        {/* Music */}
        {type === "PHOTO" && (
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-300">Background Music (optional)</label>
            <UploadZone file={musicFile} uploading={uploadingField === "music"} accept="audio/*"
              onUpload={(e) => handleUpload(e, "music")} onRemove={() => setMusicFile(null)} label="Upload audio" />
            {musicFile && (
              <div className="mt-2 flex items-center gap-3">
                <button type="button" onClick={() => setTrimmerOpen(true)}
                  className="flex items-center gap-1.5 rounded-lg bg-gray-800 px-3 py-2 text-xs font-medium text-gray-300 hover:bg-gray-700 hover:text-white">
                  ✂️ Trim Audio
                </button>
                <span className="text-xs text-gray-500">
                  {musicStartMs > 0 || musicDurationMs < 15000
                    ? `Playing ${Math.round(musicDurationMs / 1000)}s from ${Math.round(musicStartMs / 1000)}s`
                    : "Full track"}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Category */}
        {categories.length > 0 && (
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-300">Category</label>
            <div className="flex gap-2">
              <select value={currentCategoryId} onChange={(e) => setCurrentCategoryId(e.target.value)}
                className="flex-1 rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 text-white focus:border-red-500 focus:outline-none">
                <option value="">No category</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.title} ({c._count.placements})</option>)}
              </select>
              <button type="button" onClick={handleCategorySave} disabled={savingCategory}
                className="rounded-lg bg-gray-700 px-4 py-3 text-sm font-medium text-white hover:bg-gray-600 disabled:opacity-50">
                {savingCategory ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        )}

        {/* Title */}
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-300">Title</label>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 text-white placeholder-gray-500 focus:border-red-500 focus:outline-none" />
        </div>

        {/* Description */}
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-300">Description</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3}
            className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 text-white placeholder-gray-500 focus:border-red-500 focus:outline-none" />
        </div>

        {/* Date Label */}
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-300">Date Label</label>
          <input type="text" value={dateLabel} onChange={(e) => setDateLabel(e.target.value)}
            className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 text-white placeholder-gray-500 focus:border-red-500 focus:outline-none" />
        </div>

        {/* Tags & Mood */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-300">Tags</label>
            <input type="text" value={tags} onChange={(e) => setTags(e.target.value)}
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 text-white placeholder-gray-500 focus:border-red-500 focus:outline-none" />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-300">Mood</label>
            <input type="text" value={mood} onChange={(e) => setMood(e.target.value)}
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 text-white placeholder-gray-500 focus:border-red-500 focus:outline-none" />
          </div>
        </div>

        {/* Featured & Published */}
        <div className="flex gap-6">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={isFeatured} onChange={(e) => setIsFeatured(e.target.checked)}
              className="h-4 w-4 rounded border-gray-600 bg-gray-800 text-red-500 focus:ring-red-500" />
            <span className="text-sm text-gray-300">Featured</span>
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={isPublished} onChange={(e) => setIsPublished(e.target.checked)}
              className="h-4 w-4 rounded border-gray-600 bg-gray-800 text-red-500 focus:ring-red-500" />
            <span className="text-sm text-gray-300">Published</span>
          </label>
        </div>

        {/* Video Rotation */}
        {type === "VIDEO" && mainFile && (
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-300">Video Rotation</label>
            <div className="flex gap-3">
              {[0, 90, 180, 270].map((deg) => (
                <button key={deg} type="button" onClick={() => setVideoRotation(deg)}
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                    videoRotation === deg ? "bg-red-600 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                  }`}>
                  {deg}°
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Aspect Mode */}
        {type === "PHOTO" && (
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-300">Detail Display Mode</label>
            <div className="flex gap-3">
              {(["auto", "portrait", "landscape"] as const).map((mode) => (
                <button key={mode} type="button" onClick={() => setAspectMode(mode)}
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                    aspectMode === mode ? "bg-red-600 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                  }`}>
                  {mode === "auto" ? "🔍 Auto" : mode === "portrait" ? "📱 Portrait" : "🖥️ Landscape"}
                </button>
              ))}
            </div>
            <p className="mt-1 text-xs text-gray-500">
              {aspectMode === "auto" ? "Detects from image dimensions" : aspectMode === "portrait" ? "Full height, centered" : "Full width, crops top/bottom"}
            </p>
          </div>
        )}

        <button type="submit" disabled={submitting}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-red-600 px-6 py-3 text-lg font-semibold text-white shadow-lg transition-all hover:bg-red-700 disabled:opacity-50">
          {submitting ? <><Loader2 className="h-5 w-5 animate-spin" /> Saving...</> : "Update Content"}
        </button>
      </form>
    </div>
  );
}

function UploadZone({ file, uploading, accept, onUpload, onRemove, label }: {
  file: { id: string; originalName: string } | null; uploading: boolean; accept: string;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void; onRemove: () => void; label: string;
}) {
  return (
    <div className="relative">
      {file ? (
        <div className="flex items-center gap-3 rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3">
          <span className="flex-1 truncate text-sm text-green-400">✓ {file.originalName}</span>
          <button type="button" onClick={onRemove} className="rounded p-1 text-gray-400 hover:text-red-400">
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-700 bg-gray-800/50 px-6 py-8 text-sm text-gray-400 transition-colors hover:border-gray-600 hover:text-gray-300">
          {uploading ? <Loader2 className="h-5 w-5 animate-spin text-red-500" /> : <Upload className="h-5 w-5" />}
          {uploading ? "Uploading..." : label}
          <input type="file" accept={accept} onChange={onUpload} className="hidden" disabled={uploading} />
        </label>
      )}
    </div>
  );
}
