"use client";

import { useEffect, useState } from "react";
import {
  Plus,
  Trash2,
  Loader2,
  ArrowUp,
  ArrowDown,
  Sparkles,
  Flame,
  Save,
  Check,
  ListPlus,
  X,
} from "lucide-react";

interface WishlistItem {
  id: string;
  text: string;
}

interface WishlistData {
  wantedTitle: string;
  actualTitle: string;
  wanted: WishlistItem[];
  actual: WishlistItem[];
}

const EMPTY: WishlistData = {
  wantedTitle: "Everything I Dream Of",
  actualTitle: "Actually Happening",
  wanted: [],
  actual: [],
};

function genId() {
  return Math.random().toString(36).slice(2, 10);
}

// Parses pasted lists like:
//   Things I wanted to do
//   1. Be happy
//   2. Get married...
// Numbering is treated as relative, not absolute — items are simply appended
// in the order they appear, after whatever's already in the list. If most
// lines are numbered/bulleted, any stray non-list line (like a header) is
// dropped automatically.
function parseBulkLines(raw: string): string[] {
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const listPattern = /^(\d+[.)]|[-*•])\s*/;
  const listLines = lines.filter((l) => listPattern.test(l));
  const source = listLines.length >= Math.ceil(lines.length / 2) ? listLines : lines;

  return source
    .map((l) => l.replace(listPattern, "").trim())
    .filter(Boolean);
}

export default function AdminWishlistPage() {
  const [data, setData] = useState<WishlistData>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [newWanted, setNewWanted] = useState("");
  const [newActual, setNewActual] = useState("");

  const [showBulk, setShowBulk] = useState(false);
  const [bulkText, setBulkText] = useState("");

  useEffect(() => {
    fetch("/api/admin/wishlist")
      .then((r) => r.json())
      .then((d) => setData({ ...EMPTY, ...d }))
      .finally(() => setLoading(false));
  }, []);

  async function persist(next: WishlistData) {
    setData(next);
    setSaving(true);
    setSaved(false);
    try {
      await fetch("/api/admin/wishlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } finally {
      setSaving(false);
    }
  }

  function addItem(list: "wanted" | "actual", text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;
    persist({ ...data, [list]: [...data[list], { id: genId(), text: trimmed }] });
    if (list === "wanted") setNewWanted("");
    else setNewActual("");
  }

  function bulkAddWanted() {
    const items = parseBulkLines(bulkText);
    if (items.length === 0) return;
    persist({
      ...data,
      wanted: [...data.wanted, ...items.map((text) => ({ id: genId(), text }))],
    });
    setBulkText("");
    setShowBulk(false);
  }

  function deleteItem(list: "wanted" | "actual", id: string) {
    persist({ ...data, [list]: data[list].filter((i) => i.id !== id) });
  }

  function move(list: "wanted" | "actual", index: number, dir: -1 | 1) {
    const arr = [...data[list]];
    const target = index + dir;
    if (target < 0 || target >= arr.length) return;
    [arr[index], arr[target]] = [arr[target], arr[index]];
    persist({ ...data, [list]: arr });
  }

  function updateTitle(field: "wantedTitle" | "actualTitle", value: string) {
    setData((d) => ({ ...d, [field]: value }));
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-gray-500">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Bucket List</h1>
          <p className="mt-1 text-sm text-gray-500">
            What you dream of, and what's actually happening. Shows up on the{" "}
            <span className="text-gray-300">Bucket List</span> tab.
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          {saving && (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Saving…
            </>
          )}
          {!saving && saved && (
            <>
              <Check className="h-4 w-4 text-green-500" /> Saved
            </>
          )}
        </div>
      </div>

      {/* Actually happening */}
      <div className="mb-8 rounded-xl border border-red-900/40 bg-red-950/10 p-5">
        <div className="mb-4 flex items-center gap-2">
          <Flame className="h-4 w-4 text-red-400" />
          <input
            value={data.actualTitle}
            onChange={(e) => updateTitle("actualTitle", e.target.value)}
            onBlur={() => persist(data)}
            className="w-full max-w-sm bg-transparent text-lg font-semibold text-white outline-none focus:border-b focus:border-red-500"
          />
        </div>
        <p className="mb-3 text-xs text-gray-500">
          Keep this short — 2 or 3 items look best as trophy cards.
        </p>

        <div className="space-y-2">
          {data.actual.map((item, i) => (
            <div
              key={item.id}
              className="flex items-center gap-2 rounded-lg border border-gray-800 bg-gray-900 px-3 py-2"
            >
              <span className="flex-1 text-sm text-white">{item.text}</span>
              <button
                onClick={() => move("actual", i, -1)}
                disabled={i === 0}
                className="rounded p-1 text-gray-500 hover:text-white disabled:opacity-30"
              >
                <ArrowUp className="h-4 w-4" />
              </button>
              <button
                onClick={() => move("actual", i, 1)}
                disabled={i === data.actual.length - 1}
                className="rounded p-1 text-gray-500 hover:text-white disabled:opacity-30"
              >
                <ArrowDown className="h-4 w-4" />
              </button>
              <button
                onClick={() => deleteItem("actual", item.id)}
                className="rounded p-1 text-gray-500 hover:text-red-400"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>

        <div className="mt-3 flex gap-2">
          <input
            value={newActual}
            onChange={(e) => setNewActual(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addItem("actual", newActual)}
            placeholder="Something that's actually happening…"
            className="flex-1 rounded-lg border border-gray-800 bg-gray-900 px-3 py-2 text-sm text-white outline-none focus:border-red-500"
          />
          <button
            onClick={() => addItem("actual", newActual)}
            className="flex items-center gap-1 rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-500"
          >
            <Plus className="h-4 w-4" /> Add
          </button>
        </div>
      </div>

      {/* Wanted list */}
      <div className="rounded-xl border border-gray-800 bg-gray-900/40 p-5">
        <div className="mb-4 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-amber-400" />
          <input
            value={data.wantedTitle}
            onChange={(e) => updateTitle("wantedTitle", e.target.value)}
            onBlur={() => persist(data)}
            className="w-full max-w-sm bg-transparent text-lg font-semibold text-white outline-none focus:border-b focus:border-amber-500"
          />
        </div>
        <p className="mb-3 text-xs text-gray-500">
          The long list — shows up as pinned notes on the corkboard.
        </p>

        <div className="mb-3 flex gap-2">
          <input
            value={newWanted}
            onChange={(e) => setNewWanted(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addItem("wanted", newWanted)}
            placeholder="Something you want to do together…"
            className="flex-1 rounded-lg border border-gray-800 bg-gray-900 px-3 py-2 text-sm text-white outline-none focus:border-amber-500"
          />
          <button
            onClick={() => addItem("wanted", newWanted)}
            className="flex items-center gap-1 rounded-lg bg-amber-600 px-3 py-2 text-sm font-medium text-white hover:bg-amber-500"
          >
            <Plus className="h-4 w-4" /> Add
          </button>
          <button
            onClick={() => setShowBulk((s) => !s)}
            className="flex items-center gap-1 rounded-lg border border-gray-700 px-3 py-2 text-sm font-medium text-gray-300 hover:bg-gray-800"
          >
            {showBulk ? <X className="h-4 w-4" /> : <ListPlus className="h-4 w-4" />}
            {showBulk ? "Cancel" : "Bulk add"}
          </button>
        </div>

        {showBulk && (
          <div className="mb-4 rounded-lg border border-amber-800/40 bg-amber-950/10 p-3">
            <p className="mb-2 text-xs text-gray-500">
              Paste a whole list — numbering can be anything (it's relative, not
              absolute), and a header line like "Things I wanted to do" is fine, it
              gets skipped automatically. Items are added to the end of the list.
            </p>
            <textarea
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              rows={8}
              placeholder={"1. Be happy\n2. Get married with the love of my life\n3. ..."}
              className="w-full resize-y rounded-lg border border-gray-800 bg-gray-900 px-3 py-2 text-sm text-white outline-none focus:border-amber-500"
            />
            <div className="mt-2 flex items-center justify-between">
              <span className="text-xs text-gray-500">
                {parseBulkLines(bulkText).length} item
                {parseBulkLines(bulkText).length === 1 ? "" : "s"} will be added
              </span>
              <button
                onClick={bulkAddWanted}
                className="flex items-center gap-1 rounded-lg bg-amber-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-500"
              >
                <ListPlus className="h-4 w-4" /> Add all
              </button>
            </div>
          </div>
        )}

        <div className="max-h-[28rem] space-y-2 overflow-y-auto pr-1">
          {data.wanted.map((item, i) => (
            <div
              key={item.id}
              className="flex items-center gap-2 rounded-lg border border-gray-800 bg-gray-900 px-3 py-2"
            >
              <span className="flex-1 text-sm text-white">{item.text}</span>
              <button
                onClick={() => move("wanted", i, -1)}
                disabled={i === 0}
                className="rounded p-1 text-gray-500 hover:text-white disabled:opacity-30"
              >
                <ArrowUp className="h-4 w-4" />
              </button>
              <button
                onClick={() => move("wanted", i, 1)}
                disabled={i === data.wanted.length - 1}
                className="rounded p-1 text-gray-500 hover:text-white disabled:opacity-30"
              >
                <ArrowDown className="h-4 w-4" />
              </button>
              <button
                onClick={() => deleteItem("wanted", item.id)}
                className="rounded p-1 text-gray-500 hover:text-red-400"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
          {data.wanted.length === 0 && (
            <p className="py-6 text-center text-sm text-gray-600">No items yet.</p>
          )}
        </div>
      </div>

      <button
        onClick={() => persist(data)}
        className="mt-6 flex items-center gap-2 rounded-lg bg-gray-800 px-4 py-2 text-sm font-medium text-gray-300 hover:bg-gray-700"
      >
        <Save className="h-4 w-4" /> Save titles
      </button>
    </div>
  );
}
