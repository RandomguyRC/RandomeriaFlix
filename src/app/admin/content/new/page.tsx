"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Upload, X, Loader2, Crop } from "lucide-react";
import ImagePositionPicker from "@/components/ui/ImagePositionPicker";
import AudioTrimmer from "@/components/ui/AudioTrimmer";
import VideoFramePicker from "@/components/ui/VideoFramePicker";
import { uploadFileChunked, formatBytes, formatSpeed, formatEta, type UploadProgress } from "@/lib/upload-client";

interface Profile {
  id: string;
  name: string;
  slug: string;
}

interface Category {
  id: string;
  title: string;
  profileId: string;
  _count: { placements: number };
}

interface UploadedFile {
  id: string;
  originalName: string;
}

export default function NewContentPage() {
  const router = useRouter();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const [profileId, setProfileId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dateLabel, setDateLabel] = useState("");
  const [tags, setTags] = useState("");
  const [mood, setMood] = useState("");
  const [type, setType] = useState<"PHOTO" | "VIDEO" | "AUDIO">("PHOTO");
  const [isFeatured, setIsFeatured] = useState(false);
  const [videoRotation, setVideoRotation] = useState(0);
  const [categoryId, setCategoryId] = useState("");

  const [mainFile, setMainFile] = useState<UploadedFile | null>(null);
  const [thumbFile, setThumbFile] = useState<UploadedFile | null>(null);
  const [musicFile, setMusicFile] = useState<UploadedFile | null>(null);
  const [uploadingField, setUploadingField] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadErrorField, setUploadErrorField] = useState<string | null>(null);

  const [aspectMode, setAspectMode] = useState<"auto" | "portrait" | "landscape">("auto");
  const [detailZoom, setDetailZoom] = useState(1);

  const [musicStartMs, setMusicStartMs] = useState(0);
  const [musicDurationMs, setMusicDurationMs] = useState(15000);
  const [trimmerOpen, setTrimmerOpen] = useState(false);
  const [framePickerOpen, setFramePickerOpen] = useState(false);

  const [detailCropX, setDetailCropX] = useState(50);
  const [detailCropY, setDetailCropY] = useState(50);
  const [thumbCropX, setThumbCropX] = useState(50);
  const [thumbCropY, setThumbCropY] = useState(50);
  const [positionPickerOpen, setPositionPickerOpen] = useState<"detail" | "thumb" | null>(null);

  useEffect(() => { fetchProfiles(); }, []);

  async function fetchProfiles() {
    const res = await fetch("/api/admin/profiles");
    if (res.ok) setProfiles(await res.json());
  }

  async function fetchCategories(pId: string) {
    const res = await fetch(`/api/admin/categories?profileId=${pId}`);
    if (res.ok) setCategories(await res.json());
  }

  function handleProfileChange(pId: string) {
    setProfileId(pId);
    setCategoryId("");
    if (pId) fetchCategories(pId);
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>, field: "main" | "thumb" | "music") {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingField(field);
    setUploadError(null);
    setUploadErrorField(null);
    setUploadProgress(null);
    try {
      const data = await uploadFileChunked(file, (progress) => setUploadProgress(progress));
      const uploaded: UploadedFile = { id: data.id, originalName: data.originalName };
      if (field === "main") setMainFile(uploaded);
      else if (field === "thumb") setThumbFile(uploaded);
      else if (field === "music") setMusicFile(uploaded);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
      setUploadErrorField(field);
    } finally {
      setUploadingField(null);
      setUploadProgress(null);
      e.target.value = "";
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!mainFile) { alert("Upload a file"); return; }
    if (!title.trim()) { alert("Enter a title"); return; }
    if (!profileId) { alert("Select a profile"); return; }
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profileId, type, title: title.trim(),
          description: description.trim() || undefined,
          dateLabel: dateLabel.trim() || undefined,
          tags: tags.trim() || undefined,
          mood: mood.trim() || undefined,
          isFeatured,
          videoRotation,
          mainAssetId: mainFile.id,
          thumbnailAssetId: thumbFile?.id || undefined,
          musicAssetId: musicFile?.id || undefined,
          musicStartMs, musicDurationMs,
          detailCropX, detailCropY, thumbCropX, thumbCropY,
          aspectMode,
          detailZoom,
          categoryId: categoryId || undefined,
        }),
      });
      if (res.ok) router.push("/admin/content");
      else alert("Failed to create");
    } finally { setSubmitting(false); }
  }

  return (
    <div className="mx-auto max-w-2xl">
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

      {framePickerOpen && mainFile && (
        <VideoFramePicker
          videoSrc={`/api/media/${mainFile.id}`}
          onSave={async (blob) => {
            setFramePickerOpen(false);
            setUploadingField("thumb");
            const formData = new FormData();
            formData.append("file", blob, "thumbnail.jpg");
            try {
              const res = await fetch("/api/admin/upload", { method: "POST", body: formData });
              if (res.ok) { const data = await res.json(); setThumbFile({ id: data.id, originalName: "Video thumbnail" }); }
            } catch { alert("Upload failed"); } finally { setUploadingField(null); }
          }}
          onCancel={() => setFramePickerOpen(false)}
        />
      )}

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
      {positionPickerOpen === "thumb" && mainFile && (
        <ImagePositionPicker
          imageSrc={thumbFile ? `/api/media/${thumbFile.id}` : `/api/media/${mainFile.id}`}
          targetAspect={16 / 10}
          targetLabel="Thumbnail Card"
          currentX={thumbCropX}
          currentY={thumbCropY}
          onSave={(x, y) => { setThumbCropX(x); setThumbCropY(y); setPositionPickerOpen(null); }}
          onCancel={() => setPositionPickerOpen(null)}
        />
      )}

      <h1 className="mb-8 text-2xl sm:text-3xl font-bold text-white">Add Content</h1>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Profile */}
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-300">Profile *</label>
          <select value={profileId} onChange={(e) => handleProfileChange(e.target.value)}
            className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 text-white focus:border-red-500 focus:outline-none">
            <option value="">Select profile...</option>
            {profiles.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>

        {/* Category */}
        {profileId && categories.length > 0 && (
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-300">Category</label>
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 text-white focus:border-red-500 focus:outline-none">
              <option value="">No category (won&apos;t appear on home)</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.title} ({c._count.placements})</option>)}
            </select>
          </div>
        )}

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
          <label className="mb-2 block text-sm font-medium text-gray-300">{type === "PHOTO" ? "Photo *" : "Video *"}</label>
          <UploadZone file={mainFile} uploading={uploadingField === "main"} accept={type === "PHOTO" ? "image/*" : type === "VIDEO" ? "video/*" : "audio/*"}
            progress={uploadingField === "main" ? uploadProgress : null} error={uploadErrorField === "main" ? uploadError : null}
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
            progress={uploadingField === "thumb" ? uploadProgress : null} error={uploadErrorField === "thumb" ? uploadError : null}
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
              progress={uploadingField === "music" ? uploadProgress : null} error={uploadErrorField === "music" ? uploadError : null}
              onUpload={(e) => handleUpload(e, "music")} onRemove={() => setMusicFile(null)} label="Upload audio" />
            {musicFile && (
              <div className="mt-2 flex items-center gap-3">
                <button type="button" onClick={() => setTrimmerOpen(true)}
                  className="flex items-center gap-1.5 rounded-lg bg-gray-800 px-3 py-2 text-xs font-medium text-gray-300 hover:bg-gray-700 hover:text-white">
                  ✂️ Trim Audio
                </button>
                <span className="text-xs text-gray-500">
                  Playing {Math.round(musicDurationMs / 1000)}s from {Math.round(musicStartMs / 1000)}s
                </span>
              </div>
            )}
          </div>
        )}

        {/* Title */}
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-300">Title *</label>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Give it a name..."
            className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 text-white placeholder-gray-500 focus:border-red-500 focus:outline-none" />
        </div>

        {/* Description */}
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-300">Description</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What's the story behind this?" rows={3}
            className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 text-white placeholder-gray-500 focus:border-red-500 focus:outline-none" />
        </div>

        {/* Date Label */}
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-300">Date Label</label>
          <input type="text" value={dateLabel} onChange={(e) => setDateLabel(e.target.value)} placeholder="e.g. December 2024"
            className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 text-white placeholder-gray-500 focus:border-red-500 focus:outline-none" />
        </div>

        {/* Tags & Mood */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-300">Tags</label>
            <input type="text" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="travel, funny, cute..."
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 text-white placeholder-gray-500 focus:border-red-500 focus:outline-none" />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-300">Mood</label>
            <input type="text" value={mood} onChange={(e) => setMood(e.target.value)} placeholder="happy, nostalgic..."
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 text-white placeholder-gray-500 focus:border-red-500 focus:outline-none" />
          </div>
        </div>

        {/* Featured */}
        <label className="flex items-center gap-3">
          <input type="checkbox" checked={isFeatured} onChange={(e) => setIsFeatured(e.target.checked)}
            className="h-4 w-4 rounded border-gray-600 bg-gray-800 text-red-500 focus:ring-red-500" />
          <span className="text-sm text-gray-300">Featured (shows in hero banner)</span>
        </label>

        {/* Aspect Mode */}
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

        {type === "PHOTO" && (
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-300">Detail Display Mode</label>
            <div className="flex gap-3">
              {(["auto", "portrait", "landscape"] as const).map((m) => (
                <button key={m} type="button" onClick={() => setAspectMode(m)}
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                    aspectMode === m ? "bg-red-600 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                  }`}>
                  {m === "auto" ? "🔍 Auto" : m === "portrait" ? "📱 Portrait" : "🖥️ Landscape"}
                </button>
              ))}
            </div>
            <p className="mt-1 text-xs text-gray-500">
              {aspectMode === "auto" ? "Detects from image dimensions" : aspectMode === "portrait" ? "Full height, centered" : "Full width, crops top/bottom"}
            </p>
          </div>
        )}

        {/* Submit */}
        <button type="submit" disabled={submitting}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-red-600 px-6 py-3 text-lg font-semibold text-white shadow-lg transition-all hover:bg-red-700 disabled:opacity-50">
          {submitting ? <><Loader2 className="h-5 w-5 animate-spin" /> Saving...</> : "Save Content"}
        </button>
      </form>
    </div>
  );
}

function UploadZone({ file, uploading, accept, progress, error, onUpload, onRemove, label }: {
  file: UploadedFile | null; uploading: boolean; accept: string;
  progress?: UploadProgress | null; error?: string | null;
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
      ) : uploading ? (
        <div className="rounded-lg border-2 border-dashed border-gray-700 bg-gray-800/50 px-6 py-5">
          <div className="mb-2 flex items-center gap-2 text-sm text-gray-300">
            <Loader2 className="h-4 w-4 animate-spin text-red-500" />
            Uploading… {progress ? `${progress.percent}%` : ""}
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-700">
            <div
              className="h-full rounded-full bg-red-600 transition-all duration-300"
              style={{ width: `${progress?.percent ?? 0}%` }}
            />
          </div>
          {progress && (
            <div className="mt-1.5 flex justify-between text-xs text-gray-500">
              <span>{formatBytes(progress.loadedBytes)} / {formatBytes(progress.totalBytes)}</span>
              <span>{formatSpeed(progress.speedBytesPerSec)} {progress.etaSeconds !== null && `· ${formatEta(progress.etaSeconds)}`}</span>
            </div>
          )}
        </div>
      ) : (
        <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-700 bg-gray-800/50 px-6 py-8 text-sm text-gray-400 transition-colors hover:border-gray-600 hover:text-gray-300">
          <Upload className="h-5 w-5" />
          {label}
          <input type="file" accept={accept} onChange={onUpload} className="hidden" disabled={uploading} />
        </label>
      )}
      {error && !uploading && (
        <div className="mt-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">
          {error} — try selecting the file again.
        </div>
      )}
    </div>
  );
}
