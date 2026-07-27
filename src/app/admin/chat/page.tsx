"use client";

import { useState, useEffect } from "react";
import { MessageSquare, Upload, Trash2, Loader2, Check, X, User } from "lucide-react";

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
  const [formFile, setFormFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importSuccess, setImportSuccess] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Sender picking — after upload, before extraction
  const [detectedSenders, setDetectedSenders] = useState<string[]>([]);
  const [meChoice, setMeChoice] = useState<string>("");
  const [uploadId, setUploadId] = useState<string>("");

  function nanoid() {
    return crypto.randomUUID ? crypto.randomUUID().replace(/-/g, "").slice(0, 12) : Math.random().toString(36).slice(2, 14);
  }

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
    if (!formFile || !formTitle.trim() || !formProfileId) return;
    setImporting(true);
    setImportSuccess(false);
    setUploadProgress(0);
    setDetectedSenders([]);
    setMeChoice("");

    try {
      const totalSize = formFile.size;
      const CHUNK_SIZE = 8 * 1024 * 1024;
      const uid = nanoid();
      setUploadId(uid);

      // Start
      const startRes = await fetch(`/api/admin/chat-import/chunk?uploadId=${uid}&action=start`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          profileId: formProfileId,
          title: formTitle.trim(),
          totalSize,
          filename: formFile.name,
          mimeType: formFile.type,
        }),
      });
      if (!startRes.ok) {
        const err = await startRes.json();
        alert(err.error || "Import start failed");
        setImporting(false);
        return;
      }

      let offset = 0;
      let chunkIndex = 0;
      while (offset < totalSize) {
        const chunk = formFile.slice(offset, offset + CHUNK_SIZE);
        const chunkRes = await fetch(
          `/api/admin/chat-import/chunk?uploadId=${uid}&action=chunk&chunkIndex=${chunkIndex}`,
          { method: "POST", body: chunk }
        );
        if (!chunkRes.ok) {
          const err = await chunkRes.json();
          alert(err.error || `Chunk ${chunkIndex} failed`);
          setImporting(false);
          return;
        }
        offset += CHUNK_SIZE;
        chunkIndex++;
        setUploadProgress(Math.min(95, Math.round((offset / totalSize) * 100)));
      }

      // Detect senders
      const detectRes = await fetch(`/api/admin/chat-import/chunk?uploadId=${uid}&action=detect`, {
        method: "POST",
      });
      if (!detectRes.ok) {
        const err = await detectRes.json();
        alert(err.error || "Sender detection failed");
        setImporting(false);
        return;
      }
      const detectData = await detectRes.json();

      if (!detectData.senders || detectData.senders.length === 0) {
        alert("Could not detect any senders in the chat.");
        setImporting(false);
        return;
      }

      // Show sender picker instead of proceeding
      setDetectedSenders(detectData.senders);
      setMeChoice(detectData.senders[0] || "");
      setUploadProgress(100);
      setImporting(false);
    } catch {
      alert("Upload failed");
      setImporting(false);
    }
  }

  async function handleFinishImport() {
    if (!uploadId || !meChoice) return;

    const myNames = meChoice;
    const friendNames = detectedSenders.filter((s) => s !== meChoice).join(", ");

    try {
      setImporting(true);
      setUploadProgress(0);

      const finishRes = await fetch(
        `/api/admin/chat-import/chunk?uploadId=${uploadId}&action=finish&myNames=${encodeURIComponent(myNames)}&friendNames=${encodeURIComponent(friendNames)}`,
        { method: "POST" }
      );

      if (!finishRes.ok) {
        const err = await finishRes.json();
        // If already imported from a prior detect call, it may return 409 with importId
        if (err.importId) {
          setImportSuccess(true);
          setDetectedSenders([]);
          setFormTitle(""); setFormFile(null); setFormProfileId("");
          fetchImports();
          setImporting(false);
          return;
        }
        alert(err.error || "Import failed");
        setImporting(false);
        return;
      }

      const finishData = await finishRes.json();

      setUploadProgress(100);
      setImportSuccess(true);
      setDetectedSenders([]);
      setFormTitle(""); setFormFile(null); setFormProfileId("");
      fetchImports();

      if (finishData.unmatchedAttachments?.length > 0) {
        alert(
          `Import succeeded, but ${finishData.unmatchedAttachments.length} attachment(s) couldn't be matched ` +
          `to a file in the zip and will show as missing:\n\n` +
          finishData.unmatchedAttachments.slice(0, 10).join("\n") +
          (finishData.unmatchedAttachments.length > 10 ? `\n...and ${finishData.unmatchedAttachments.length - 10} more` : "")
        );
      }
    } catch {
      alert("Import failed");
    } finally {
      setImporting(false);
    }
  }

  function cancelImport() {
    setDetectedSenders([]);
    setFormFile(null);
    setImporting(false);
    setUploadProgress(0);
  }

  async function handleDeleteImport(id: string) {
    if (!confirm("Delete this chat import and all its messages?")) return;
    try {
      const res = await fetch(`/api/admin/chat-import/${id}`, { method: "DELETE" });
      if (res.ok) setImports(imports.filter((i) => i.id !== id));
    } catch (err) {
      console.error("Delete failed:", err);
    }
  }

  return (
    <div>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Chat Import</h1>
          <p className="mt-2 text-gray-400">Import WhatsApp chats for each profile</p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-lg bg-red-600 px-6 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:bg-red-700">
          <Upload className="h-5 w-5" /> Import Chat
        </button>
      </div>

      {/* Import form */}
      {showForm && (
        <div className="mb-6 rounded-xl border border-gray-700 bg-gray-900 p-6">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-lg font-semibold text-white">Import WhatsApp Chat</h2>
            <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-white">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Step 1: Basic form + file pick */}
          {detectedSenders.length === 0 && (
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

              <div>
                <label className="mb-1 block text-sm text-gray-400">WhatsApp Export File (.txt or .zip) *</label>
                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-700 bg-gray-800/50 px-6 py-6 text-sm text-gray-400 transition-colors hover:border-gray-600 hover:text-gray-300">
                  <Upload className="h-5 w-5" />
                  {formFile ? formFile.name : "Choose WhatsApp export file..."}
                  <input type="file" accept=".txt,.zip" className="hidden"
                    onChange={(e) => setFormFile(e.target.files?.[0] || null)} />
                </label>
                <p className="mt-1 text-[10px] text-gray-500">
                  Export from WhatsApp: Settings → Chats → Export Chat. Large ZIPs are processed on the server; the temporary ZIP is deleted after extraction so only indexed chat media remains.
                </p>
              </div>

              <button onClick={handleImport} disabled={importing || !formFile || !formTitle.trim() || !formProfileId}
                className="flex items-center gap-2 rounded-lg bg-red-600 px-6 py-3 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50">
                {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquare className="h-4 w-4" />}
                {importing ? `Uploading${uploadProgress > 0 ? ` (${uploadProgress}%)` : "..."}` : "Upload & Detect Senders"}
              </button>
            </div>
          )}

          {/* Step 2: Choose who "I am" */}
          {detectedSenders.length > 0 && (
            <div className="space-y-5">
              <div className="rounded-lg border border-white/10 bg-white/[0.03] p-5">
                <p className="mb-1 text-sm font-medium text-white">Detected Participants</p>
                <p className="text-xs text-gray-400">
                  We found {detectedSenders.length} people in this chat. Select <strong>who you are</strong> — messages from you will be shown on the right (like WhatsApp).
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {detectedSenders.map((name) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => setMeChoice(name)}
                    className={`flex items-center gap-3 rounded-xl border p-4 text-left transition-all ${
                      meChoice === name
                        ? "border-red-500 bg-red-600/10 ring-1 ring-red-500"
                        : "border-gray-700 bg-gray-800/50 hover:border-gray-600"
                    }`}
                  >
                    <div className={`flex h-10 w-10 items-center justify-center rounded-full ${
                      meChoice === name ? "bg-red-600" : "bg-gray-700"
                    }`}>
                      <User className="h-5 w-5 text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-white">{name}</p>
                      <p className="text-xs text-gray-400">
                        {meChoice === name ? "That's me ✓" : "Click to select as me"}
                      </p>
                    </div>
                  </button>
                ))}
              </div>

              {!importing && (
                <div className="flex gap-3">
                  <button onClick={handleFinishImport} disabled={!meChoice}
                    className="flex items-center gap-2 rounded-lg bg-red-600 px-6 py-3 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50">
                    <Check className="h-4 w-4" /> Import Chat
                  </button>
                  <button onClick={cancelImport}
                    className="flex items-center gap-2 rounded-lg border border-gray-700 px-6 py-3 text-sm text-gray-300 hover:bg-gray-800">
                    Cancel
                  </button>
                </div>
              )}
            </div>
          )}

          {importSuccess && (
            <div className="rounded-lg bg-green-900/20 border border-green-500/20 px-4 py-3 text-sm text-green-300">
              Chat imported successfully!
            </div>
          )}

          {importing && detectedSenders.length === 0 && uploadProgress > 0 && (
            <div className="rounded-lg border border-amber-500/20 bg-amber-900/10 px-4 py-3 text-sm text-amber-200">
              Uploading... Large files can take a while.
              <div className="mt-2 w-full bg-gray-700 rounded-full h-2">
                <div className="bg-amber-500 h-2 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
              </div>
              <span className="mt-1 block text-xs text-amber-300/70">{uploadProgress}% uploaded</span>
            </div>
          )}

          {importing && detectedSenders.length > 0 && (
            <div className="rounded-lg border border-amber-500/20 bg-amber-900/10 px-4 py-3 text-sm text-amber-200">
              Importing and extracting... this can take a while for large chats.
            </div>
          )}
        </div>
      )}

      {/* Imported chats list */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-red-500" />
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
                    {imp.profile.name} · {imp._count.messages} messages · me: {imp.myNames}
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
