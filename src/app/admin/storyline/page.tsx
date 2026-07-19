"use client";

import { useState, useEffect } from "react";
import {
  Plus, Trash2, Pencil, Loader2, X, Check, GripVertical, ChevronDown, ChevronUp, Upload, Image as ImageIcon, Crop,
  MessageCircleHeart, Save, Clock,
} from "lucide-react";
import ImagePositionPicker from "@/components/ui/ImagePositionPicker";

interface HoursEntry {
  id: string;
  date: string; // YYYY-MM-DD
  from: string; // HH:mm
  to: string; // HH:mm
  label?: string;
}

function entryHoursDecimal(e: HoursEntry): number {
  const [fh, fm] = e.from.split(":").map((n) => parseInt(n, 10));
  const [th, tm] = e.to.split(":").map((n) => parseInt(n, 10));
  if ([fh, fm, th, tm].some((n) => Number.isNaN(n))) return 0;
  let from = fh * 60 + fm;
  let to = th * 60 + tm;
  if (to <= from) to += 24 * 60;
  return (to - from) / 60;
}

function fmtHoursShort(h: number): string {
  const whole = Math.floor(h);
  const mins = Math.round((h - whole) * 60);
  return mins === 0 ? `${whole}h` : `${whole}h ${mins}m`;
}

interface StoryEvent {
  id: string;
  title: string;
  subtitle?: string | null;
  eventDate?: string | null;
  body?: string | null;
  mood?: string | null;
  sortOrder: number;
  profileId: string;
  profile: { name: string; slug: string };
  assetId?: string | null;
  asset?: { id: string; mimeType: string } | null;
  imageCropX?: number | null;
  imageCropY?: number | null;
}

interface Profile {
  id: string;
  name: string;
  slug: string;
}

export default function AdminStorylinePage() {
  const [events, setEvents] = useState<StoryEvent[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  // Add form
  const [showForm, setShowForm] = useState(false);
  const [formProfileId, setFormProfileId] = useState("");
  const [formTitle, setFormTitle] = useState("");
  const [formSubtitle, setFormSubtitle] = useState("");
  const [formDate, setFormDate] = useState("");
  const [formBody, setFormBody] = useState("");
  const [formMood, setFormMood] = useState("");
  const [formImageAssetId, setFormImageAssetId] = useState<string | null>(null);
  const [formImagePreview, setFormImagePreview] = useState<string | null>(null);
  const [formImageIsVideo, setFormImageIsVideo] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [saving, setSaving] = useState(false);

  // Spotify search
  const [spotifyQuery, setSpotifyQuery] = useState("");
  const [spotifyResults, setSpotifyResults] = useState<any[]>([]);
  const [spotifySearching, setSpotifySearching] = useState(false);
  const [selectedTrack, setSelectedTrack] = useState<any>(null);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editSubtitle, setEditSubtitle] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editBody, setEditBody] = useState("");
  const [editMood, setEditMood] = useState("");
  const [editImagePreview, setEditImagePreview] = useState<string | null>(null);
  const [editImageAssetId, setEditImageAssetId] = useState<string | null>(null);
  const [editImageIsVideo, setEditImageIsVideo] = useState(false);
  const [editUploadingImage, setEditUploadingImage] = useState(false);

  // Position picker
  const [positionPickerOpen, setPositionPickerOpen] = useState<"add" | "edit" | null>(null);
  const [addCropX, setAddCropX] = useState(50);
  const [addCropY, setAddCropY] = useState(50);
  const [editCropX, setEditCropX] = useState(50);
  const [editCropY, setEditCropY] = useState(50);

  // Ending question — shown to the viewer after the last chapter
  const [endingQuestion, setEndingQuestion] = useState("");
  const [endingAnswer1, setEndingAnswer1] = useState("");
  const [endingAnswer2, setEndingAnswer2] = useState("");
  const [endingAnswer3, setEndingAnswer3] = useState("");
  const [endingEmptyProfileSlug, setEndingEmptyProfileSlug] = useState("");
  const [endingLoading, setEndingLoading] = useState(true);
  const [endingSaving, setEndingSaving] = useState(false);
  const [endingSaved, setEndingSaved] = useState(false);

  // Hours worked tracker — shown to the viewer inside the "confirm clear"
  // step, alongside the ending question, as a nudge before she confirms.
  const [hoursLog, setHoursLog] = useState<HoursEntry[]>([]);
  const [hoursSaving, setHoursSaving] = useState(false);
  const [newHoursDate, setNewHoursDate] = useState("");
  const [newHoursFrom, setNewHoursFrom] = useState("");
  const [newHoursTo, setNewHoursTo] = useState("");
  const [newHoursLabel, setNewHoursLabel] = useState("");

  useEffect(() => { fetchEvents(); fetchProfiles(); fetchEndingQuestion(); }, []);

  async function fetchEndingQuestion() {
    try {
      const res = await fetch("/api/admin/settings");
      if (res.ok) {
        const data = await res.json();
        setEndingQuestion(data.storylineQuestion || "");
        setEndingAnswer1(data.storylineAnswer1 || "");
        setEndingAnswer2(data.storylineAnswer2 || "");
        setEndingAnswer3(data.storylineAnswer3 || "");
        setEndingEmptyProfileSlug(data.storylineEmptyProfileSlug || "");
        try {
          const parsed = JSON.parse(data.storylineHoursLog || "[]");
          if (Array.isArray(parsed)) setHoursLog(parsed);
        } catch {}
      }
    } catch {}
    setEndingLoading(false);
  }

  async function persistHoursLog(next: HoursEntry[]) {
    setHoursLog(next);
    setHoursSaving(true);
    try {
      await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storylineHoursLog: JSON.stringify(next) }),
      });
    } finally {
      setHoursSaving(false);
    }
  }

  function addHoursEntry() {
    if (!newHoursDate || !newHoursFrom || !newHoursTo) return;
    const entry: HoursEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      date: newHoursDate,
      from: newHoursFrom,
      to: newHoursTo,
      label: newHoursLabel.trim() || undefined,
    };
    const next = [...hoursLog, entry].sort((a, b) => a.date.localeCompare(b.date));
    persistHoursLog(next);
    setNewHoursDate("");
    setNewHoursFrom("");
    setNewHoursTo("");
    setNewHoursLabel("");
  }

  function removeHoursEntry(id: string) {
    persistHoursLog(hoursLog.filter((e) => e.id !== id));
  }

  async function saveEndingQuestion() {
    setEndingSaving(true);
    try {
      await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storylineQuestion: endingQuestion.trim(),
          storylineAnswer1: endingAnswer1.trim(),
          storylineAnswer2: endingAnswer2.trim(),
          storylineAnswer3: endingAnswer3.trim(),
          storylineEmptyProfileSlug: endingEmptyProfileSlug.trim(),
        }),
      });
      setEndingSaved(true);
      setTimeout(() => setEndingSaved(false), 2000);
    } finally {
      setEndingSaving(false);
    }
  }

  async function fetchEvents() {
    try {
      const res = await fetch("/api/admin/storyline");
      if (res.ok) setEvents(await res.json());
    } catch {}
    setLoading(false);
  }

  async function fetchProfiles() {
    const res = await fetch("/api/admin/profiles");
    if (res.ok) setProfiles(await res.json());
  }

  async function handleImageUpload(file: File): Promise<{ id: string; mimeType: string } | null> {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/admin/upload", { method: "POST", body: formData });
    if (!res.ok) return null;
    const data = await res.json();
    return { id: data.id, mimeType: data.mimeType as string };
  }

  async function searchSpotify(query: string) {
    if (query.length < 2) { setSpotifyResults([]); return; }
    setSpotifySearching(true);
    try {
      const res = await fetch(`/api/spotify/search?q=${encodeURIComponent(query)}`);
      if (res.ok) {
        const data = await res.json();
        setSpotifyResults(data.tracks || []);
      }
    } catch {}
    setSpotifySearching(false);
  }

  let searchTimeout: ReturnType<typeof setTimeout>;
  function handleSpotifySearch(e: React.ChangeEvent<HTMLInputElement>) {
    const q = e.target.value;
    setSpotifyQuery(q);
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => searchSpotify(q), 400);
  }

  async function handleAdd() {
    if (!formTitle.trim() || !formProfileId) return;
    setSaving(true);
    try {
      await fetch("/api/admin/storyline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profileId: formProfileId,
          title: formTitle.trim(),
          subtitle: formSubtitle.trim() || null,
          eventDate: formDate.trim() || null,
          body: formBody.trim() || null,
          mood: formMood.trim() || null,
          assetId: formImageAssetId,
          imageCropX: addCropX,
          imageCropY: addCropY,
          spotifyTrackId: selectedTrack?.id || null,
          spotifyUri: selectedTrack?.uri || null,
          spotifyTitle: selectedTrack?.name || null,
          spotifyArtist: selectedTrack?.artist || null,
          spotifyAlbumArt: selectedTrack?.albumArt || null,
          spotifyDuration: selectedTrack?.duration || null,
        }),
      });
      setFormTitle(""); setFormSubtitle(""); setFormDate(""); setFormBody(""); setFormMood("");
      setFormImageAssetId(null); setFormImagePreview(null); setFormImageIsVideo(false);
      setAddCropX(50); setAddCropY(50);
      setSelectedTrack(null); setSpotifyQuery(""); setSpotifyResults([]);
      setShowForm(false);
      fetchEvents();
    } finally { setSaving(false); }
  }

  async function handleSaveEdit() {
    if (!editingId || !editTitle.trim()) return;
    setSaving(true);
    try {
      await fetch(`/api/admin/storyline/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editTitle.trim(),
          subtitle: editSubtitle.trim() || null,
          eventDate: editDate.trim() || null,
          body: editBody.trim() || null,
          mood: editMood.trim() || null,
          imageCropX: editCropX,
          imageCropY: editCropY,
          ...(editImageAssetId ? { assetId: editImageAssetId } : {}),
        }),
      });
      setEditingId(null);
      setEditImageAssetId(null);
      setEditImagePreview(null);
      setEditImageIsVideo(false);
      setEditCropX(50);
      setEditCropY(50);
      fetchEvents();
    } finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this story event?")) return;
    await fetch(`/api/admin/storyline/${id}`, { method: "DELETE" });
    setEvents(events.filter((e) => e.id !== id));
  }

  async function moveEvent(id: string, direction: "up" | "down") {
    const idx = events.findIndex((e) => e.id === id);
    if (idx === -1) return;
    const newEvents = [...events];
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= newEvents.length) return;

    [newEvents[idx], newEvents[swapIdx]] = [newEvents[swapIdx], newEvents[idx]];
    setEvents(newEvents);

    const orderedIds = newEvents.map((e) => e.id);
    await fetch("/api/admin/storyline/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderedIds }),
    });
  }

  return (
    <div>
      {/* Position Pickers */}
      {positionPickerOpen === "add" && formImagePreview && (
        <ImagePositionPicker
          imageSrc={formImagePreview}
          mediaType={formImageIsVideo ? "video" : "image"}
          targetAspect={16 / 9}
          dynamicAspect="modal"
          targetLabel="Event Media (Detail View)"
          currentX={addCropX}
          currentY={addCropY}
          mode="landscape"
          hideZoom
          onSave={(x, y) => { setAddCropX(x); setAddCropY(y); setPositionPickerOpen(null); }}
          onCancel={() => setPositionPickerOpen(null)}
        />
      )}
      {positionPickerOpen === "edit" && editImagePreview && (
        <ImagePositionPicker
          imageSrc={editImagePreview}
          mediaType={editImageIsVideo ? "video" : "image"}
          targetAspect={16 / 9}
          dynamicAspect="modal"
          targetLabel="Event Media (Detail View)"
          currentX={editCropX}
          currentY={editCropY}
          mode="landscape"
          hideZoom
          onSave={(x, y) => { setEditCropX(x); setEditCropY(y); setPositionPickerOpen(null); }}
          onCancel={() => setPositionPickerOpen(null)}
        />
      )}

      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Storyline</h1>
          <p className="mt-2 text-gray-400">Build the timeline of your story</p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 rounded-lg bg-red-600 px-6 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:bg-red-700">
          <Plus className="h-5 w-5" /> Add Event
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="mb-6 rounded-xl border border-gray-700 bg-gray-900 p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">New Story Event</h2>
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
                <label className="mb-1 block text-sm text-gray-400">Title *</label>
                <input type="text" value={formTitle} onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. The Beginning"
                  className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 text-white placeholder-gray-500 focus:border-red-500 focus:outline-none" />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm text-gray-400">Subtitle</label>
                <input type="text" value={formSubtitle} onChange={(e) => setFormSubtitle(e.target.value)}
                  placeholder="e.g. Where it all started"
                  className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 text-white placeholder-gray-500 focus:border-red-500 focus:outline-none" />
              </div>
              <div>
                <label className="mb-1 block text-sm text-gray-400">Date</label>
                <input type="text" value={formDate} onChange={(e) => setFormDate(e.target.value)}
                  placeholder="e.g. January 2023"
                  className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 text-white placeholder-gray-500 focus:border-red-500 focus:outline-none" />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm text-gray-400">Story</label>
              <textarea value={formBody} onChange={(e) => setFormBody(e.target.value)} rows={4}
                placeholder="Write what happened..."
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 text-white placeholder-gray-500 focus:border-red-500 focus:outline-none" />
            </div>
            <div>
              <label className="mb-1 block text-sm text-gray-400">Mood</label>
              <input type="text" value={formMood} onChange={(e) => setFormMood(e.target.value)}
                placeholder="e.g. romantic, funny, adventurous"
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 text-white placeholder-gray-500 focus:border-red-500 focus:outline-none" />
            </div>
            {/* Spotify Track (optional) */}
            <div>
              <label className="mb-1 block text-sm text-gray-400">Spotify Track (optional)</label>
              {selectedTrack ? (
                <div className="flex items-center gap-3 rounded-lg border border-green-500/30 bg-green-900/10 px-4 py-3">
                  <img src={selectedTrack.albumArt} alt="" className="h-10 w-10 rounded-lg object-cover" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white">{selectedTrack.name}</p>
                    <p className="text-xs text-gray-400">{selectedTrack.artist} · {selectedTrack.album}</p>
                  </div>
                  <button onClick={() => setSelectedTrack(null)} className="text-gray-400 hover:text-red-400">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <input type="text" value={spotifyQuery} onChange={handleSpotifySearch}
                    placeholder="Search Spotify for a track..."
                    className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 text-white placeholder-gray-500 focus:border-green-500 focus:outline-none" />
                  {spotifySearching && <p className="text-xs text-gray-500">Searching...</p>}
                  {spotifyResults.length > 0 && (
                    <div className="max-h-48 overflow-y-auto rounded-lg border border-gray-700 bg-gray-800">
                      {spotifyResults.map((track) => (
                        <button key={track.id} onClick={() => { setSelectedTrack(track); setSpotifyQuery(""); setSpotifyResults([]); }}
                          className="flex w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-gray-700">
                          <img src={track.albumArt} alt="" className="h-8 w-8 rounded object-cover" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-white truncate">{track.name}</p>
                            <p className="text-xs text-gray-400 truncate">{track.artist}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Optional image or video */}
            <div>
              <label className="mb-1 block text-sm text-gray-400">Photo or Video (optional)</label>
              <div className="flex items-center gap-4">
                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-700 bg-gray-800/50 px-4 py-3 text-xs text-gray-400 transition-colors hover:border-gray-600 hover:text-gray-300">
                  <Upload className="h-4 w-4" />
                  {uploadingImage ? "Uploading..." : formImagePreview ? "Change media" : "Choose photo or video..."}
                  <input type="file" accept="image/*,video/*,.heic,.heif" className="hidden" disabled={uploadingImage}
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setUploadingImage(true);
                      setFormImageAssetId(null);
                      setFormImagePreview(null);
                      try {
                        const uploaded = await handleImageUpload(file);
                        if (uploaded) {
                          setFormImageAssetId(uploaded.id);
                          setFormImagePreview(`/api/media/${uploaded.id}`);
                          setFormImageIsVideo(uploaded.mimeType.startsWith("video/"));
                        } else {
                          alert("Upload failed. Please try again.");
                        }
                      } finally {
                        setUploadingImage(false);
                      }
                    }} />
                </label>
                {uploadingImage && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
                {formImagePreview && !uploadingImage && (
                  <div className="relative h-16 w-16 overflow-hidden rounded-lg">
                    {formImageIsVideo ? (
                      <video src={formImagePreview} className="h-full w-full object-cover" muted playsInline preload="metadata" />
                    ) : (
                      <img src={formImagePreview} alt="Preview" className="h-full w-full object-cover" />
                    )}
                    <button onClick={() => { setFormImageAssetId(null); setFormImagePreview(null); setFormImageIsVideo(false); }}
                      className="absolute -right-1 -top-1 rounded-full bg-gray-800 p-0.5">
                      <X className="h-3 w-3 text-gray-400" />
                    </button>
                  </div>
                )}
              </div>
              {formImagePreview && !uploadingImage && (
                <button type="button" onClick={() => setPositionPickerOpen("add")}
                  className="mt-2 flex items-center gap-1.5 rounded-lg bg-gray-800 px-3 py-1.5 text-xs font-medium text-gray-300 hover:bg-gray-700 hover:text-white">
                  <Crop className="h-3.5 w-3.5" /> Adjust Position
                </button>
              )}
            </div>

            <button onClick={handleAdd} disabled={saving || !formTitle.trim() || !formProfileId}
              className="flex items-center gap-2 rounded-lg bg-red-600 px-6 py-3 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Add Event
            </button>
          </div>
        </div>
      )}

      {/* Events list */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin rounded-full border-4 border-red-500 border-t-transparent" />
        </div>
      ) : events.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-700 bg-gray-900 py-16 text-center">
          <p className="text-gray-400">No story events yet. Start building your timeline above.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {events.map((event, idx) => (
            <div key={event.id} className="rounded-lg border border-gray-800 bg-gray-900 px-4 py-3">
              {editingId === event.id ? (
                <div className="space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <input type="text" value={editTitle} onChange={(e) => setEditTitle(e.target.value)}
                      placeholder="Title"
                      className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-red-500 focus:outline-none" />
                    <input type="text" value={editDate} onChange={(e) => setEditDate(e.target.value)}
                      placeholder="Date"
                      className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-red-500 focus:outline-none" />
                  </div>
                  <input type="text" value={editSubtitle} onChange={(e) => setEditSubtitle(e.target.value)}
                    placeholder="Subtitle"
                    className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-red-500 focus:outline-none" />
                  <textarea value={editBody} onChange={(e) => setEditBody(e.target.value)} rows={3}
                    placeholder="Story"
                    className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-red-500 focus:outline-none" />
                  <input type="text" value={editMood} onChange={(e) => setEditMood(e.target.value)}
                    placeholder="Mood"
                    className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-red-500 focus:outline-none" />
                  {/* Edit image upload */}
                  <div>
                    <label className="mb-1 block text-xs text-gray-400">Photo or Video (optional)</label>
                    <div className="flex items-center gap-4">
                      <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-700 bg-gray-800/50 px-4 py-3 text-xs text-gray-400 transition-colors hover:border-gray-600 hover:text-gray-300">
                        <Upload className="h-4 w-4" />
                        {editUploadingImage ? "Uploading..." : editImagePreview ? "Change media" : "Choose photo or video..."}
                        <input type="file" accept="image/*,video/*,.heic,.heif" className="hidden" disabled={editUploadingImage}
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            setEditUploadingImage(true);
                            try {
                              const uploaded = await handleImageUpload(file);
                              if (uploaded) {
                                setEditImageAssetId(uploaded.id);
                                setEditImagePreview(`/api/media/${uploaded.id}`);
                                setEditImageIsVideo(uploaded.mimeType.startsWith("video/"));
                              } else {
                                alert("Upload failed. Please try again.");
                              }
                            } finally {
                              setEditUploadingImage(false);
                            }
                          }} />
                      </label>
                      {editUploadingImage && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
                      {editImagePreview && !editUploadingImage && (
                        <div className="relative h-16 w-16 overflow-hidden rounded-lg">
                          {editImageIsVideo ? (
                            <video src={editImagePreview} className="h-full w-full object-cover" muted playsInline preload="metadata" />
                          ) : (
                            <img src={editImagePreview} alt="Preview" className="h-full w-full object-cover" />
                          )}
                          <button onClick={() => { setEditImagePreview(null); setEditImageAssetId(null); setEditImageIsVideo(false); }}
                            className="absolute -right-1 -top-1 rounded-full bg-gray-800 p-0.5">
                            <X className="h-3 w-3 text-gray-400" />
                          </button>
                        </div>
                      )}
                      {editImagePreview && !editUploadingImage && (
                        <button type="button" onClick={() => setPositionPickerOpen("edit")}
                          className="rounded-lg bg-gray-800 px-2 py-1.5 text-[10px] font-medium text-gray-300 hover:bg-gray-700 hover:text-white">
                          <Crop className="h-3 w-3 inline mr-1" /> Adjust
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button onClick={() => { setEditingId(null); setEditImageAssetId(null); setEditImagePreview(null); setEditImageIsVideo(false); setEditCropX(50); setEditCropY(50); }} className="rounded-lg bg-gray-800 px-3 py-1.5 text-xs text-gray-400 hover:bg-gray-700 hover:text-white">Cancel</button>
                    <button onClick={handleSaveEdit} disabled={saving}
                      className="flex items-center gap-1 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50">
                      {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />} Save
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">#{idx + 1}</span>
                      <p className="font-medium text-white">{event.title}</p>
                      {event.asset?.mimeType?.startsWith("video/") && (
                        <span className="rounded bg-blue-900/30 px-1.5 py-0.5 text-[10px] text-blue-300">video</span>
                      )}
                      {event.mood && <span className="rounded bg-red-900/30 px-1.5 py-0.5 text-[10px] text-red-300">{event.mood}</span>}
                      <span className="text-xs text-gray-500">· {event.profile.name}</span>
                    </div>
                    {event.subtitle && <p className="mt-1 text-sm text-gray-400">{event.subtitle}</p>}
                    {event.body && <p className="mt-1 text-xs text-gray-500 line-clamp-1">{event.body}</p>}
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => moveEvent(event.id, "up")} disabled={idx === 0}
                      className="rounded p-1.5 text-gray-500 hover:bg-gray-800 hover:text-white disabled:opacity-30">
                      <ChevronUp className="h-4 w-4" />
                    </button>
                    <button onClick={() => moveEvent(event.id, "down")} disabled={idx === events.length - 1}
                      className="rounded p-1.5 text-gray-500 hover:bg-gray-800 hover:text-white disabled:opacity-30">
                      <ChevronDown className="h-4 w-4" />
                    </button>
                    <button onClick={() => {
                      setEditingId(event.id);
                      setEditTitle(event.title);
                      setEditSubtitle(event.subtitle || "");
                      setEditDate(event.eventDate || "");
                      setEditBody(event.body || "");
                      setEditMood(event.mood || "");
                      setEditImagePreview(event.assetId ? `/api/media/${event.assetId}` : null);
                      setEditImageAssetId(null);
                      setEditImageIsVideo(!!event.asset?.mimeType?.startsWith("video/"));
                      setEditCropX(event.imageCropX ?? 50);
                      setEditCropY(event.imageCropY ?? 50);
                    }}
                      className="rounded p-1.5 text-gray-400 hover:bg-gray-800 hover:text-white">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button onClick={() => handleDelete(event.id)}
                      className="rounded p-1.5 text-gray-400 hover:bg-red-900/50 hover:text-red-400">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Ending Question */}
      <div className="mt-10 rounded-xl border border-gray-800 bg-gray-900 p-6">
        <div className="mb-2 flex items-center gap-3">
          <MessageCircleHeart className="h-5 w-5 text-red-400" />
          <h2 className="text-lg font-semibold text-white">Ending Question</h2>
        </div>
        <p className="mb-5 text-sm text-gray-400">
          Shown after the last chapter, once the viewer has reached the end of the storyline.
          Leave the question blank to hide this section entirely.
        </p>

        {endingLoading ? (
          <Loader2 className="h-5 w-5 animate-spin text-gray-500" />
        ) : (
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-xs text-gray-400">Question</label>
              <input
                type="text"
                value={endingQuestion}
                onChange={(e) => setEndingQuestion(e.target.value)}
                placeholder="e.g. Will you stay in this story with me?"
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 text-sm text-white focus:border-red-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs text-gray-400">Answers (up to 3, shown as buttons)</label>
              <div className="space-y-2">
                {[
                  { value: endingAnswer1, set: setEndingAnswer1, placeholder: "Answer 1" },
                  { value: endingAnswer2, set: setEndingAnswer2, placeholder: "Answer 2" },
                  { value: endingAnswer3, set: setEndingAnswer3, placeholder: "Answer 3" },
                ].map((a, i) => (
                  <input
                    key={i}
                    type="text"
                    value={a.value}
                    onChange={(e) => a.set(e.target.value)}
                    placeholder={a.placeholder}
                    className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 text-sm text-white focus:border-red-500 focus:outline-none"
                  />
                ))}
              </div>
              <p className="mt-1.5 text-xs text-gray-500">
                At least one answer is needed for the question to appear on the storyline page.
              </p>
              <div className="mt-3 rounded-lg border border-amber-500/20 bg-amber-500/[0.06] px-3 py-2.5 text-xs leading-relaxed text-amber-200/80">
                Heads up — this dialog is wired for exactly this 3-answer scenario: <strong>Answer 1</strong> plays
                a joyful confetti + hearts celebration, <strong>Answer 2</strong> plays confetti with a
                bittersweet touch, and <strong>Answer 3</strong> asks for confirmation before redirecting to the
                empty profile below.
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs text-gray-400">
                Redirect Profile Slug (used by Answer 3, after confirmation)
              </label>
              <input
                type="text"
                value={endingEmptyProfileSlug}
                onChange={(e) => setEndingEmptyProfileSlug(e.target.value)}
                placeholder="e.g. empty"
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 text-sm text-white focus:border-red-500 focus:outline-none"
              />
              <p className="mt-1.5 text-xs text-gray-500">
                Create an empty profile in the Profiles tab (no content added), put its slug here. It stays
                unlisted on the profile picker — she'll only land on it through this confirmation.
              </p>
            </div>

            <button
              onClick={saveEndingQuestion}
              disabled={endingSaving}
              className="flex items-center gap-2 rounded-lg bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-red-700 disabled:opacity-50"
            >
              {endingSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : endingSaved ? (
                <Check className="h-4 w-4" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {endingSaving ? "Saving..." : endingSaved ? "Saved!" : "Save"}
            </button>
          </div>
        )}
      </div>

      {/* Hours Worked */}
      <div className="mt-10 rounded-xl border border-gray-800 bg-gray-900 p-6">
        <div className="mb-2 flex items-center gap-3">
          <Clock className="h-5 w-5 text-red-400" />
          <h2 className="text-lg font-semibold text-white">Hours Worked</h2>
          {hoursSaving && <Loader2 className="h-3.5 w-3.5 animate-spin text-gray-500" />}
        </div>
        <p className="mb-5 text-sm text-gray-400">
          Log the time you've put into this project, day by day. It's shown to her as a little
          "before you decide" tracker inside the confirmation step of Answer 3 — a quiet reminder
          of the effort behind it. Changes save automatically.
        </p>

        <div className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-5">
          <input
            type="date"
            value={newHoursDate}
            onChange={(e) => setNewHoursDate(e.target.value)}
            className="col-span-2 rounded-lg border border-gray-700 bg-gray-800 px-3 py-2.5 text-sm text-white focus:border-red-500 focus:outline-none sm:col-span-1"
          />
          <input
            type="time"
            value={newHoursFrom}
            onChange={(e) => setNewHoursFrom(e.target.value)}
            className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2.5 text-sm text-white focus:border-red-500 focus:outline-none"
          />
          <input
            type="time"
            value={newHoursTo}
            onChange={(e) => setNewHoursTo(e.target.value)}
            className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2.5 text-sm text-white focus:border-red-500 focus:outline-none"
          />
          <input
            type="text"
            value={newHoursLabel}
            onChange={(e) => setNewHoursLabel(e.target.value)}
            placeholder="Note (optional)"
            className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2.5 text-sm text-white focus:border-red-500 focus:outline-none"
          />
          <button
            onClick={addHoursEntry}
            disabled={!newHoursDate || !newHoursFrom || !newHoursTo}
            className="flex items-center justify-center gap-1.5 rounded-lg bg-red-600 px-3 py-2.5 text-sm font-semibold text-white transition-all hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Plus className="h-4 w-4" />
            Add
          </button>
        </div>

        {hoursLog.length === 0 ? (
          <p className="rounded-lg border border-dashed border-gray-700 px-4 py-6 text-center text-sm text-gray-500">
            No entries yet — add your first work session above.
          </p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-gray-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 bg-gray-800/50 text-left text-xs uppercase tracking-wide text-gray-500">
                  <th className="px-3 py-2 font-medium">Date</th>
                  <th className="px-3 py-2 font-medium">From</th>
                  <th className="px-3 py-2 font-medium">To</th>
                  <th className="px-3 py-2 font-medium">Duration</th>
                  <th className="px-3 py-2 font-medium">Note</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {hoursLog
                  .slice()
                  .sort((a, b) => a.date.localeCompare(b.date) || a.from.localeCompare(b.from))
                  .map((e) => (
                    <tr key={e.id} className="border-b border-gray-800 last:border-0">
                      <td className="px-3 py-2 text-gray-300">{e.date}</td>
                      <td className="px-3 py-2 text-gray-400">{e.from}</td>
                      <td className="px-3 py-2 text-gray-400">{e.to}</td>
                      <td className="px-3 py-2 text-gray-200">{fmtHoursShort(entryHoursDecimal(e))}</td>
                      <td className="px-3 py-2 text-gray-500">{e.label || "—"}</td>
                      <td className="px-3 py-2 text-right">
                        <button
                          onClick={() => removeHoursEntry(e.id)}
                          aria-label="Remove entry"
                          className="rounded p-1 text-gray-500 transition-colors hover:bg-red-500/10 hover:text-red-400"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-800/40">
                  <td colSpan={3} className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Total
                  </td>
                  <td colSpan={3} className="px-3 py-2 font-semibold text-red-300">
                    {fmtHoursShort(hoursLog.reduce((s, e) => s + entryHoursDecimal(e), 0))} across{" "}
                    {new Set(hoursLog.map((e) => e.date)).size} day
                    {new Set(hoursLog.map((e) => e.date)).size === 1 ? "" : "s"}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
