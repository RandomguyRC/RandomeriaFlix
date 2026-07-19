"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, Pencil, Loader2, X, Check, Sparkles } from "lucide-react";

interface TextMemory {
  id: string;
  title: string;
  paragraph: string;
  owner: string;
  profileId: string;
  profile: { name: string; slug: string };
}

interface Profile {
  id: string;
  name: string;
  slug: string;
}

export default function TextMemoriesPage() {
  const [memories, setMemories] = useState<TextMemory[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  // Add form
  const [showForm, setShowForm] = useState(false);
  const [formParagraph, setFormParagraph] = useState("");
  const [formOwner, setFormOwner] = useState<"random" | "cherry">("random");
  const [formProfileId, setFormProfileId] = useState("");
  const [saving, setSaving] = useState(false);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editParagraph, setEditParagraph] = useState("");
  const [editOwner, setEditOwner] = useState("random");

  useEffect(() => { fetchMemories(); fetchProfiles(); }, []);

  async function fetchMemories() {
    const res = await fetch("/api/admin/text-memories");
    if (res.ok) setMemories(await res.json());
    setLoading(false);
  }

  async function fetchProfiles() {
    const res = await fetch("/api/admin/profiles");
    if (res.ok) setProfiles(await res.json());
  }

  async function handleAdd() {
    if (!formParagraph.trim() || !formProfileId) return;
    setSaving(true);
    try {
      await fetch("/api/admin/text-memories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profileId: formProfileId,
          paragraph: formParagraph.trim(),
          owner: formOwner,
        }),
      });
      setFormParagraph("");
      setFormOwner("random");
      setShowForm(false);
      fetchMemories();
    } finally { setSaving(false); }
  }

  async function handleSaveEdit() {
    if (!editingId || !editParagraph.trim()) return;
    setSaving(true);
    try {
      await fetch(`/api/admin/text-memories/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paragraph: editParagraph.trim(), owner: editOwner }),
      });
      setEditingId(null);
      fetchMemories();
    } finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this memory?")) return;
    await fetch(`/api/admin/text-memories/${id}`, { method: "DELETE" });
    setMemories(memories.filter((m) => m.id !== id));
  }

  return (
    <div>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Text Memories</h1>
          <p className="mt-2 text-gray-400">Add memories for the bubble universe</p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-lg bg-red-600 px-6 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:bg-red-700">
          <Plus className="h-5 w-5" /> Add Memory
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="mb-6 rounded-xl border border-gray-700 bg-gray-900 p-6">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-lg font-semibold text-white">New Memory</h2>
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
                <label className="mb-1 block text-sm text-gray-400">Written by</label>
                <div className="flex gap-3">
                  {(["random", "cherry"] as const).map((o) => (
                    <button key={o} type="button" onClick={() => setFormOwner(o)}
                      className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                        formOwner === o ? "bg-red-600 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                      }`}>
                      {o === "random" ? "Random" : "Cherry"}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm text-gray-400">Memory Text *</label>
              <textarea value={formParagraph} onChange={(e) => setFormParagraph(e.target.value)}
                placeholder="Write your memory here..."
                rows={4}
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 text-white placeholder-gray-500 focus:border-red-500 focus:outline-none" />
            </div>
            <button onClick={handleAdd} disabled={saving || !formParagraph.trim() || !formProfileId}
              className="flex items-center gap-2 rounded-lg bg-red-600 px-6 py-3 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Add Memory
            </button>
          </div>
        </div>
      )}

      {/* Memories list */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin rounded-full border-4 border-red-500 border-t-transparent" />
        </div>
      ) : memories.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-700 bg-gray-900 py-16 text-center">
          <Sparkles className="mx-auto mb-3 h-10 w-10 text-gray-600" />
          <p className="text-gray-400">No memories yet. Add your first one above.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {memories.map((mem) => (
            <div key={mem.id} className="rounded-lg border border-gray-800 bg-gray-900 px-4 py-3">
              {editingId === mem.id ? (
                <div className="space-y-3">
                  <textarea value={editParagraph} onChange={(e) => setEditParagraph(e.target.value)} rows={3}
                    className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-red-500 focus:outline-none" />
                  <div className="flex items-center gap-3">
                    <select value={editOwner} onChange={(e) => setEditOwner(e.target.value)}
                      className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-red-500 focus:outline-none">
                      <option value="random">Random</option>
                      <option value="cherry">Cherry</option>
                    </select>
                    <div className="flex-1" />
                    <button onClick={() => setEditingId(null)} className="rounded-lg bg-gray-800 px-3 py-1.5 text-xs text-gray-400 hover:bg-gray-700 hover:text-white">Cancel</button>
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
                      <p className="font-medium text-white">{mem.title}</p>
                      <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                        mem.owner === "random" ? "bg-red-900/40 text-red-300" : "bg-pink-900/40 text-pink-300"
                      }`}>{mem.owner}</span>
                      <span className="text-xs text-gray-500">· {mem.profile.name}</span>
                    </div>
                    <p className="mt-1 text-sm text-gray-400 line-clamp-2">{mem.paragraph}</p>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => { setEditingId(mem.id); setEditParagraph(mem.paragraph); setEditOwner(mem.owner); }}
                      className="rounded-lg p-2 text-gray-400 hover:bg-gray-800 hover:text-white">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button onClick={() => handleDelete(mem.id)}
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
