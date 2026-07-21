"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Eye, EyeOff, Film, ImageIcon, Loader2, MapPin, Pencil, Save, Trash2, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import SlippyMap from "@/components/maps/SlippyMap";
import VideoFrameThumb from "@/components/maps/VideoFrameThumb";
import type { MapConfig, MapMarker, MapPlace } from "@/components/maps/types";

interface Profile {
  id: string;
  name: string;
  slug: string;
}

interface ContentPlacement {
  category: { id: string; title: string };
}

interface ContentItem {
  id: string;
  title: string;
  type: string;
  mainAsset: { id: string; mimeType: string };
  thumbnailAsset?: { id: string } | null;
  placements?: ContentPlacement[];
}

interface FormState {
  id?: string;
  title: string;
  description: string;
  latitude: number;
  longitude: number;
  iconEmoji: string;
  color: string;
  thumbnailContentId: string;
  isPublished: boolean;
  contentIds: string[];
}

const DEFAULT_CONFIG: MapConfig = { defaultLat: 22.9734, defaultLng: 78.6569, defaultZoom: 5 };
const EMPTY_FORM: FormState = {
  title: "",
  description: "",
  latitude: 28.6139,
  longitude: 77.209,
  iconEmoji: "💖",
  color: "rose",
  thumbnailContentId: "",
  isPublished: true,
  contentIds: [],
};

const COLORS = [
  { value: "rose", label: "Rose" },
  { value: "amber", label: "Amber" },
  { value: "violet", label: "Violet" },
  { value: "sky", label: "Sky" },
  { value: "emerald", label: "Emerald" },
];

function mediaThumb(item: ContentItem) {
  return `/api/media/${item.thumbnailAsset?.id || item.mainAsset.id}`;
}

function markerThumb(place: MapPlace) {
  const preferred = place.thumbnailContentId
    ? place.media.find((m) => m.contentItem.id === place.thumbnailContentId)?.contentItem
    : null;
  const fallback = place.media[0]?.contentItem;
  const item = preferred || fallback;
  return item ? `/api/media/${item.thumbnailAsset?.id || item.mainAsset.id}` : undefined;
}

export default function AdminMapsPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [profileId, setProfileId] = useState("");
  const [content, setContent] = useState<ContentItem[]>([]);
  const [places, setPlaces] = useState<MapPlace[]>([]);
  const [config, setConfig] = useState<MapConfig>(DEFAULT_CONFIG);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [flyTo, setFlyTo] = useState<{ lat: number; lng: number; zoom: number } | null>(null);
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);
  const [mediaFilterCategory, setMediaFilterCategory] = useState<string | null>(null);
  const [storylineEvents, setStorylineEvents] = useState<StoryEventItem[]>([]);

  interface StoryEventItem {
    id: string;
    title: string;
    assetId?: string | null;
    asset?: { id: string; mimeType: string } | null;
  }

  // Build virtual ContentItems from storyline event images (resolved lazily)
  const storylineContentItems = useMemo((): ContentItem[] => {
    return storylineEvents
      .filter((e) => e.assetId || e.asset?.id)
      .map((e) => {
        const assetId = e.assetId || e.asset!.id;
        const isVideo = (e.asset?.mimeType || "").startsWith("video/");
        // Temporarily use assetId as a placeholder — resolved to real ContentItem on toggle
        return {
          id: `storyline:${e.id}:${assetId}`,
          title: e.title || "Storyline image",
          type: isVideo ? "VIDEO" : "PHOTO",
          mainAsset: { id: assetId, mimeType: e.asset?.mimeType || "image/jpeg" },
          placements: [],
          _storylineAssetId: assetId,
        } as ContentItem & { _storylineAssetId: string };
      });
  }, [storylineEvents]);

  // Group content by category ("Uncategorized" for items without placements)
  // Merged with Storyline virtual category
  const contentByCategory = useMemo(() => {
    const map = new Map<string, { catName: string; items: ContentItem[] }>();
    const ungrouped: ContentItem[] = [];
    for (const item of content) {
      const cats = item.placements?.filter((p) => p.category) ?? [];
      if (cats.length === 0) { ungrouped.push(item); continue; }
      for (const p of cats) {
        if (!map.has(p.category.id)) map.set(p.category.id, { catName: p.category.title, items: [] });
        map.get(p.category.id)!.items.push(item);
      }
    }
    const entries = Array.from(map.entries()).map(([id, v]) => ({ id, ...v }));
    if (ungrouped.length > 0) entries.push({ id: "__uncategorized", catName: "Uncategorized", items: ungrouped });
    // Add Storyline virtual category
    if (storylineContentItems.length > 0) {
      entries.push({ id: "__storyline", catName: "Storyline", items: storylineContentItems });
    }
    return entries;
  }, [content, storylineContentItems]);

  // Combined content + storyline items for lookups (e.g. thumbnail select, media preview)
  const mergedContent = useMemo(() => {
    const map = new Map<string, ContentItem>();
    for (const item of content) map.set(item.id, item);
    for (const item of storylineContentItems) map.set(item.id, item);
    return map;
  }, [content, storylineContentItems]);

  useEffect(() => { fetchProfiles(); }, []);

  useEffect(() => {
    if (!profileId) return;
    fetchMapData(profileId);
    fetchContent(profileId);
  }, [profileId]);

  const markers: MapMarker[] = useMemo(() => places.map((place) => ({
    id: place.id,
    title: place.title,
    latitude: place.latitude,
    longitude: place.longitude,
    iconEmoji: place.iconEmoji,
    color: place.color,
    thumbnailUrl: markerThumb(place),
  })), [places]);

  const formMarker: MapMarker = {
    id: "draft",
    title: form.title || "New place",
    latitude: form.latitude,
    longitude: form.longitude,
    iconEmoji: form.iconEmoji,
    color: form.color,
    thumbnailUrl: mergedContent.get(form.thumbnailContentId || form.contentIds[0]) ? mediaThumb(mergedContent.get(form.thumbnailContentId || form.contentIds[0])!) : undefined,
  };

  async function fetchProfiles() {
    const res = await fetch("/api/admin/profiles");
    if (res.ok) {
      const data = await res.json();
      setProfiles(data);
      if (data[0]) setProfileId(data[0].id);
    }
    setLoading(false);
  }

  async function fetchMapData(pId = profileId) {
    const res = await fetch(`/api/admin/maps?profileId=${pId}`);
    if (res.ok) {
      const data = await res.json();
      setConfig(data.config ?? DEFAULT_CONFIG);
      setPlaces(data.places ?? []);
      setForm((current) => ({ ...current, latitude: data.config?.defaultLat ?? DEFAULT_CONFIG.defaultLat, longitude: data.config?.defaultLng ?? DEFAULT_CONFIG.defaultLng }));
    }
  }

  async function fetchContent(pId: string) {
    const [contentRes, storyRes] = await Promise.all([
      fetch(`/api/admin/content?profileId=${pId}`),
      fetch(`/api/admin/storyline?profileId=${pId}`),
    ]);
    if (contentRes.ok) {
      const data = await contentRes.json();
      setContent(data.filter((item: ContentItem) => item.type === "PHOTO" || item.type === "VIDEO"));
    }
    if (storyRes.ok) {
      const data = await storyRes.json();
      setStorylineEvents(data);
    }
  }

  function resetForm() {
    setForm({ ...EMPTY_FORM, latitude: config.defaultLat, longitude: config.defaultLng });
  }

  function editPlace(place: MapPlace) {
    setForm({
      id: place.id,
      title: place.title,
      description: place.description || "",
      latitude: place.latitude,
      longitude: place.longitude,
      iconEmoji: place.iconEmoji || "💖",
      color: place.color || "rose",
      thumbnailContentId: place.thumbnailContentId || "",
      isPublished: place.isPublished ?? true,
      contentIds: place.media.map((m) => m.contentItem.id),
    });
    // Fly to the place on the map
    setFlyTo({ lat: place.latitude, lng: place.longitude, zoom: 15 });
  }

  function toggleContent(id: string) {
    setForm((current) => {
      const exists = current.contentIds.includes(id);
      const contentIds = exists ? current.contentIds.filter((itemId) => itemId !== id) : [...current.contentIds, id];
      return {
        ...current,
        contentIds,
        thumbnailContentId: contentIds.includes(current.thumbnailContentId) ? current.thumbnailContentId : contentIds[0] || "",
      };
    });
  }

  // Resolve storyline virtual IDs to real ContentItem IDs before saving
  async function resolveContentIds(ids: string[]): Promise<string[]> {
    const storylineAssetIds: string[] = [];
    for (const id of ids) {
      if (id.startsWith("storyline:")) {
        const parts = id.split(":");
        if (parts[2]) storylineAssetIds.push(parts[2]);
      }
    }
    if (storylineAssetIds.length === 0) return ids;

    const res = await fetch("/api/admin/maps/resolve-storyline", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assetIds: storylineAssetIds, profileId }),
    });
    if (!res.ok) throw new Error("Failed to resolve storyline assets");

    const { results } = await res.json();
    const assetToContent = new Map(results.map((r: { assetId: string; contentItemId: string }) => [r.assetId, r.contentItemId]));

    return ids.map((id) => {
      if (!id.startsWith("storyline:")) return id;
      const parts = id.split(":");
      return assetToContent.get(parts[2]) || id;
    });
  }

  async function savePlace(e: React.FormEvent) {
    e.preventDefault();
    if (!profileId) return;
    if (!form.title.trim()) { alert("Add a place title"); return; }
    setSaving(true);
    try {
      const resolvedIds = await resolveContentIds(form.contentIds);

      // Resolve the thumbnail ID too — it may be a storyline virtual ID
      let resolvedThumb = form.thumbnailContentId;
      if (resolvedThumb) {
        if (resolvedThumb.startsWith("storyline:")) {
          const resolvedAll = await resolveContentIds([resolvedThumb]);
          resolvedThumb = resolvedAll[0] || resolvedThumb;
        }
        if (!resolvedIds.includes(resolvedThumb)) {
          resolvedThumb = resolvedIds[0] || "";
        }
      }
      if (!resolvedIds.includes(resolvedThumb)) {
        resolvedThumb = resolvedIds[0] || "";
      }
      // Update local state with resolved IDs so subsequent saves are fast
      setForm((current) => ({ ...current, contentIds: resolvedIds, thumbnailContentId: resolvedThumb }));
      const payload = {
        profileId,
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        latitude: Number(form.latitude),
        longitude: Number(form.longitude),
        iconEmoji: form.iconEmoji.trim() || "💖",
        color: form.color,
        thumbnailContentId: resolvedThumb || undefined,
        isPublished: form.isPublished,
        contentIds: resolvedIds,
      };
      const res = await fetch(form.id ? `/api/admin/maps/${form.id}` : "/api/admin/maps", {
        method: form.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) { alert("Failed to save place"); return; }
      await fetchMapData();
      resetForm();
    } finally {
      setSaving(false);
    }
  }

  async function deletePlace(id: string) {
    if (!confirm("Delete this map place?")) return;
    await fetch(`/api/admin/maps/${id}`, { method: "DELETE" });
    await fetchMapData();
  }

  async function togglePublished(place: MapPlace) {
    await fetch(`/api/admin/maps/${place.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPublished: !place.isPublished }),
    });
    setPlaces((current) => current.map((p) => p.id === place.id ? { ...p, isPublished: !place.isPublished } : p));
  }

  async function movePlace(index: number, direction: -1 | 1) {
    const next = [...places];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setPlaces(next);
    await fetch("/api/admin/maps/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderedIds: next.map((p) => p.id) }),
    });
  }

  async function saveDefaultView() {
    if (!profileId) return;
    setSavingConfig(true);
    try {
      const res = await fetch("/api/admin/maps/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId, ...config }),
      });
      if (!res.ok) alert("Failed to save default view");
    } finally {
      setSavingConfig(false);
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-red-500" /></div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white sm:text-3xl">Randomeria Maps</h1>
          <p className="mt-2 text-gray-400">Pin your special places across India and attach existing photos/videos.</p>
        </div>
        <select value={profileId} onChange={(e) => setProfileId(e.target.value)} className="rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 text-white focus:border-red-500 focus:outline-none">
          {profiles.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="overflow-hidden rounded-2xl border border-gray-800 bg-gray-900">
          <div className="border-b border-gray-800 p-4">
            <h2 className="font-semibold text-white">Click the map to place the marker</h2>
            <p className="mt-1 text-sm text-gray-500">Pan/zoom around India, then click the exact spot. The draft marker updates instantly.</p>
          </div>
          <SlippyMap
            center={{ lat: config.defaultLat, lng: config.defaultLng }}
            zoom={config.defaultZoom}
            markers={[...markers, formMarker]}
            activeMarkerId="draft"
            onMapClick={(point) => { setForm((current) => ({ ...current, latitude: Number(point.lat.toFixed(6)), longitude: Number(point.lng.toFixed(6)) })); setFlyTo(null); }}
            onViewChange={(view) => setConfig({ defaultLat: Number(view.lat.toFixed(6)), defaultLng: Number(view.lng.toFixed(6)), defaultZoom: view.zoom })}
            clickToPlace
            flyTo={flyTo}
            className="h-[560px] w-full"
          />
          <div className="flex flex-col gap-3 border-t border-gray-800 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-gray-400">
              Default view: {config.defaultLat.toFixed(4)}, {config.defaultLng.toFixed(4)} · zoom {config.defaultZoom}
            </div>
            <button onClick={saveDefaultView} disabled={savingConfig} className="inline-flex items-center justify-center gap-2 rounded-lg bg-gray-800 px-4 py-2 text-sm font-semibold text-gray-200 hover:bg-gray-700 disabled:opacity-50">
              {savingConfig ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save default view
            </button>
          </div>
        </div>

        <form onSubmit={savePlace} className="rounded-2xl border border-gray-800 bg-gray-900 p-5 shadow-xl">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">{form.id ? "Edit place" : "Add place"}</h2>
            {form.id && <button type="button" onClick={resetForm} className="rounded-lg p-2 text-gray-400 hover:bg-gray-800 hover:text-white"><X className="h-4 w-4" /></button>}
          </div>

          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-300">Place title *</label>
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Where we met, first date..." className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 text-white placeholder-gray-500 focus:border-red-500 focus:outline-none" />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-300">Your map description</label>
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} placeholder="Write what makes this place special..." className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 text-white placeholder-gray-500 focus:border-red-500 focus:outline-none" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-300">Latitude</label>
                <input type="number" step="any" value={form.latitude} onChange={(e) => setForm({ ...form, latitude: Number(e.target.value) })} className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2.5 text-white focus:border-red-500 focus:outline-none" />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-300">Longitude</label>
                <input type="number" step="any" value={form.longitude} onChange={(e) => setForm({ ...form, longitude: Number(e.target.value) })} className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2.5 text-white focus:border-red-500 focus:outline-none" />
              </div>
            </div>

            <div className="grid grid-cols-[96px_1fr] gap-3">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-300">Icon</label>
                <input value={form.iconEmoji} onChange={(e) => setForm({ ...form, iconEmoji: e.target.value })} maxLength={8} className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2.5 text-center text-xl text-white focus:border-red-500 focus:outline-none" />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-300">Marker color</label>
                <select value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-3 text-white focus:border-red-500 focus:outline-none">
                  {COLORS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
            </div>

            <label className="flex items-center gap-3 rounded-lg border border-gray-800 bg-gray-950/60 px-4 py-3">
              <input type="checkbox" checked={form.isPublished} onChange={(e) => setForm({ ...form, isPublished: e.target.checked })} className="h-4 w-4 accent-red-500" />
              <span className="text-sm text-gray-300">Show on viewer map</span>
            </label>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-300">Attached media ({form.contentIds.length})</label>
              <button type="button" onClick={() => { setMediaFilterCategory(null); setMediaPickerOpen(true); }}
                className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-700 bg-gray-950/30 px-4 py-4 text-sm text-gray-400 transition-colors hover:border-gray-500 hover:text-gray-300">
                <span className="text-lg">🖼️</span> Browse &amp; select photos / videos
              </button>
              {form.contentIds.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {form.contentIds.map((id) => {
                    const item = mergedContent.get(id);
                    if (!item) return null;
                    return (
                      <button key={id} type="button" onClick={() => toggleContent(id)}
                        className="group relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-white/10 transition-all hover:border-red-400">
                        {item.type === "VIDEO" && !item.thumbnailAsset?.id ? (
                          <VideoFrameThumb src={`/api/media/${item.mainAsset.id}`} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <img src={mediaThumb(item)} alt="" className="h-full w-full object-cover" />
                        )}
                        <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                          <X className="h-5 w-5 text-red-300" />
                        </div>
                        <span className="absolute bottom-0.5 right-0.5 drop-shadow-lg">
                          {item.type === "VIDEO" ? <Film className="h-3 w-3 text-white" /> : <ImageIcon className="h-3 w-3 text-white" />}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {form.contentIds.length > 0 && (
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-300">Marker thumbnail</label>
                <select value={form.thumbnailContentId} onChange={(e) => setForm({ ...form, thumbnailContentId: e.target.value })} className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-3 text-white focus:border-red-500 focus:outline-none">
                  {form.contentIds.map((id) => {
                    const item = mergedContent.get(id);
                    return item ? <option key={id} value={id}>{item.title}</option> : null;
                  })}
                </select>
              </div>
            )}

            <button type="submit" disabled={saving} className="flex w-full items-center justify-center gap-2 rounded-lg bg-red-600 px-5 py-3 font-semibold text-white shadow-lg transition-colors hover:bg-red-700 disabled:opacity-50">
              {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <MapPin className="h-5 w-5" />}
              {form.id ? "Save place" : "Pin this place"}
            </button>
          </div>
        </form>
      </div>

      {/* ── Media picker modal ── */}
      <AnimatePresence>
        {mediaPickerOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
            onClick={() => setMediaPickerOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="flex w-full max-w-3xl max-h-[85vh] flex-col overflow-hidden rounded-2xl border border-gray-700 bg-gray-900 shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-gray-800 px-6 py-4">
                <h2 className="text-lg font-semibold text-white">Attach photos &amp; videos</h2>
                <button onClick={() => setMediaPickerOpen(false)} className="rounded-lg p-2 text-gray-400 hover:bg-gray-800 hover:text-white">
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Category filter chips */}
              {contentByCategory.length > 1 && (
                <div className="flex shrink-0 flex-wrap gap-2 border-b border-gray-800 px-6 py-3">
                  <button type="button" onClick={() => setMediaFilterCategory(null)}
                    className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-medium transition-all ${
                      mediaFilterCategory === null
                        ? "bg-red-600 text-white"
                        : "bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-200"
                    }`}>
                    All
                  </button>
                  {contentByCategory.map((cat) => (
                    <button key={cat.id} type="button" onClick={() => setMediaFilterCategory(cat.id)}
                      className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-medium transition-all ${
                        mediaFilterCategory === cat.id
                          ? "bg-red-600 text-white"
                          : "bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-200"
                      }`}>
                      {cat.catName}
                    </button>
                  ))}
                </div>
              )}

              <div className="flex-1 overflow-y-auto px-6 py-5">
                {contentByCategory.length === 0 ? (
                  <p className="py-10 text-center text-gray-500">No photos or videos found for this profile.</p>
                ) : contentByCategory.filter((cat) => mediaFilterCategory === null || cat.id === mediaFilterCategory).map((cat) => (
                  <div key={cat.id} className="mb-6 last:mb-0">
                    <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-400">{cat.catName}</h3>
                    <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
                      {cat.items.map((item) => {
                        const checked = form.contentIds.includes(item.id);
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => toggleContent(item.id)}
                            className={`group relative aspect-[4/3] overflow-hidden rounded-xl border-2 transition-all ${
                              checked
                                ? "border-red-400 ring-2 ring-red-400/30 shadow-lg shadow-red-500/10"
                                : "border-gray-700 hover:border-gray-500"
                            }`}
                          >
                            {item.type === "VIDEO" && !item.thumbnailAsset?.id ? (
                              <VideoFrameThumb src={`/api/media/${item.mainAsset.id}`} alt={item.title} className="h-full w-full object-cover" />
                            ) : (
                              <img src={mediaThumb(item)} alt={item.title} className="h-full w-full object-cover" />
                            )}
                            {checked && (
                              <div className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-lg">
                                ✓
                              </div>
                            )}
                            {item.type === "VIDEO" && (
                              <div className="absolute bottom-1.5 left-1.5 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm">
                                <Film className="mr-0.5 inline h-3 w-3" /> Video
                              </div>
                            )}
                            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent p-2 pt-6 opacity-0 transition-opacity group-hover:opacity-100">
                              <p className="truncate text-xs font-medium text-white drop-shadow-lg">{item.title}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t border-gray-800 px-6 py-4 text-right">
                <p className="mb-2 text-sm text-gray-400">{form.contentIds.length} item{form.contentIds.length !== 1 && "s"} selected</p>
                <button
                  onClick={() => setMediaPickerOpen(false)}
                  className="rounded-xl bg-red-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg transition-colors hover:bg-red-700"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="rounded-2xl border border-gray-800 bg-gray-900 p-5">
        <h2 className="mb-4 text-lg font-semibold text-white">Pinned places</h2>
        {places.length === 0 ? (
          <p className="rounded-xl border border-gray-800 bg-gray-950/50 p-8 text-center text-gray-500">No places yet. Click the map and pin your first memory.</p>
        ) : (
          <div className="space-y-2">
            {places.map((place, index) => (
              <div key={place.id} className="flex flex-col gap-3 rounded-xl border border-gray-800 bg-gray-950/40 p-3 sm:flex-row sm:items-center">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gray-800 text-2xl">
                    {markerThumb(place) ? <img src={markerThumb(place)} alt="" className="h-full w-full object-cover" /> : place.iconEmoji}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-white">{place.title}</p>
                    <p className="text-sm text-gray-500">{place.latitude.toFixed(4)}, {place.longitude.toFixed(4)} · {place.media.length} media</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => movePlace(index, -1)} disabled={index === 0} className="rounded-lg bg-gray-800 p-2 text-gray-300 hover:bg-gray-700 disabled:opacity-30"><ArrowUp className="h-4 w-4" /></button>
                  <button onClick={() => movePlace(index, 1)} disabled={index === places.length - 1} className="rounded-lg bg-gray-800 p-2 text-gray-300 hover:bg-gray-700 disabled:opacity-30"><ArrowDown className="h-4 w-4" /></button>
                  <button onClick={() => togglePublished(place)} className="rounded-lg bg-gray-800 p-2 text-gray-300 hover:bg-gray-700">{place.isPublished ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}</button>
                  <button onClick={() => editPlace(place)} className="rounded-lg bg-gray-800 p-2 text-gray-300 hover:bg-gray-700"><Pencil className="h-4 w-4" /></button>
                  <button onClick={() => deletePlace(place.id)} className="rounded-lg bg-gray-800 p-2 text-gray-300 hover:bg-red-900/50 hover:text-red-300"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
