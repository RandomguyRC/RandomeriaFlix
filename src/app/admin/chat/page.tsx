"use client";

import { useState, useEffect } from "react";
import { MessageSquare, Upload, Trash2, Loader2, Check, X } from "lucide-react";

interface ChatImport {
  id: string;
  title: string;
  myNames: string;
  friendNames: string | null;
  profile: { name: string };
  _count: { messages: number };
  createdAt: string;
}

interface Profile {
  id: string;
  name: string;
}

export default function AdminChatPage() {
  const [imports, setImports] = useState<ChatImport[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  // Upload form
  const [showForm, setShowForm] = useState(false);
  const [formProfileId, setFormProfileId] = useState("");
  const [formTitle, setFormTitle] = useState("");
  const [formMyNames, setFormMyNames] = useState("");
  const [formFriendNames, setFormFriendNames] = useState("");
  const [formFile, setFormFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importSuccess, setImportSuccess] = useState(false);

  useEffect(() => { fetchImports(); fetchProfiles(); }, []);

  async function fetchImports() {
    try {
      const res = await fetch("/api/admin/chat-import");
      if (res.ok) setImports(await res.json());
    } catch {}
    setLoading(false);
  }

  async function fetchProfiles() {
    const res = await fetch("/api/admin/profiles");
    if (res.ok) setProfiles(await res.json());
  }

  async function handleImport() {
    if (!formFile || !formTitle.trim() || !formProfileId || !formMyNames.trim()) return;
    setImporting(true);
    setImportSuccess(false);
    try {
      const formData = new FormData();
      formData.append("file", formFile);
      formData.append("profileId", formProfileId);
      formData.append("title", formTitle.trim());
      formData.append("myNames", formMyNames.trim());
      formData.append("friendNames", formFriendNames.trim());

      const res = await fetch("/api/admin/chat-import", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setImportSuccess(true);
        setFormTitle(""); setFormMyNames(""); setFormFriendNames(""); setFormFile(null);
        fetchImports();
      } else {
        const err = await res.json();
        alert(err.error || "Import failed");
      }
    } catch {
      alert("Import failed");
    } finally {
      setImporting(false);
    }
  }

  async function handleDeleteImport(id: string) {
    if (!confirm("Delete this chat import and all its messages?")) return;
    try {
      const res = await fetch(`/api/admin/chat-import/${id}`, { method: "DELETE" });
      console.log("Delete response:", res.status);
      if (res.ok) {
        setImports(imports.filter((i) => i.id !== id));
      }
    } catch (err) {
      console.error("Delete failed:", err);
    }
  }

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Chat Import</h1>
          <p className="mt-2 text-gray-400">Import WhatsApp chats for each profile</p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 rounded-lg bg-red-600 px-6 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:bg-red-700">
          <Upload className="h-5 w-5" /> Import Chat
        </button>
      </div>

      {/* Import form */}
      {showForm && (
        <div className="mb-6 rounded-xl border border-gray-700 bg-gray-900 p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Import WhatsApp Chat</h2>
            <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-white">
              <X className="h-5 w-5" />
            </button>
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
                <label className="mb-1 block text-sm text-gray-400">Chat Title *</label>
                <input type="text" value={formTitle} onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. Our First Chat"
                  className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 text-white placeholder-gray-500 focus:border-red-500 focus:outline-none" />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm text-gray-400">My Names (comma separated) *</label>
                <input type="text" value={formMyNames} onChange={(e) => setFormMyNames(e.target.value)}
                  placeholder="e.g. Rahul, Ra"
                  className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 text-white placeholder-gray-500 focus:border-red-500 focus:outline-none" />
                <p className="mt-1 text-[10px] text-gray-500">Names that appear as "me" in the chat</p>
              </div>
              <div>
                <label className="mb-1 block text-sm text-gray-400">Friend Names (comma separated)</label>
                <input type="text" value={formFriendNames} onChange={(e) => setFormFriendNames(e.target.value)}
                  placeholder="e.g. Cherry, 🍒"
                  className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 text-white placeholder-gray-500 focus:border-red-500 focus:outline-none" />
                <p className="mt-1 text-[10px] text-gray-500">The other person's names</p>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm text-gray-400">WhatsApp Export File (.txt or .zip) *</label>
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-700 bg-gray-800/50 px-6 py-6 text-sm text-gray-400 transition-colors hover:border-gray-600 hover:text-gray-300">
                <Upload className="h-5 w-5" />
                {formFile ? formFile.name : "Choose WhatsApp export file..."}
                <input type="file" accept=".txt,.zip" className="hidden"
                  onChange={(e) => setFormFile(e.target.files?.[0] || null)} />
              </label>
              <p className="mt-1 text-[10px] text-gray-500">
                Export from WhatsApp: Settings → Chats → Export Chat
              </p>
            </div>

            {importSuccess && (
              <div className="rounded-lg bg-green-900/20 border border-green-500/20 px-4 py-3 text-sm text-green-300">
                Chat imported successfully!
              </div>
            )}

            <button onClick={handleImport} disabled={importing || !formFile || !formTitle.trim() || !formProfileId || !formMyNames.trim()}
              className="flex items-center gap-2 rounded-lg bg-red-600 px-6 py-3 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50">
              {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquare className="h-4 w-4" />}
              {importing ? "Importing..." : "Import Chat"}
            </button>
          </div>
        </div>
      )}

      {/* Imported chats list */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin rounded-full border-4 border-red-500 border-t-transparent" />
        </div>
      ) : imports.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-700 bg-gray-900 py-16 text-center">
          <MessageSquare className="mx-auto mb-3 h-10 w-10 text-gray-600" />
          <p className="text-gray-400">No chats imported yet. Export a WhatsApp chat and import it above.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {imports.map((imp) => (
            <div key={imp.id}
              className="flex items-center justify-between rounded-lg border border-gray-800 bg-gray-900 px-4 py-3">
              <div className="flex items-center gap-3">
                <MessageSquare className="h-5 w-5 text-green-400" />
                <div>
                  <p className="font-medium text-white">{imp.title}</p>
                  <p className="text-xs text-gray-500">
                    {imp.profile.name} · {imp._count.messages} messages · {imp.myNames}
                  </p>
                </div>
              </div>
              <button onClick={() => handleDeleteImport(imp.id)}
                className="rounded-lg p-2 text-gray-400 hover:bg-red-900/50 hover:text-red-400">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
