"use client";

import { useState, useEffect } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Plus, Pencil, Trash2, X, Check, Loader2, Eye, EyeOff } from "lucide-react";

interface NavTab {
  id: string;
  slug: string;
  label: string;
  kind: string;
  sortOrder: number;
  isEnabled: boolean;
}

const AVAILABLE_TABS = [
  { slug: "home", label: "Home", kind: "HOME" },
  { slug: "reels", label: "Reels", kind: "COLLECTION" },
  { slug: "memories", label: "Memories", kind: "COLLECTION" },
  { slug: "storyline", label: "Storyline", kind: "STORYLINE" },
  { slug: "chat", label: "Chat History", kind: "CHAT" },
  { slug: "book", label: "Book", kind: "BOOK" },
  { slug: "stickers", label: "Stickers", kind: "COLLECTION" },
];

function SortableTab({
  tab,
  onEdit,
  onToggle,
  onDelete,
}: {
  tab: NavTab;
  onEdit: (tab: NavTab) => void;
  onToggle: (id: string, enabled: boolean) => void;
  onDelete: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: tab.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 rounded-lg border px-4 py-3 transition-all ${
        isDragging ? "border-red-500 shadow-2xl" : tab.isEnabled ? "border-gray-800 bg-gray-900" : "border-gray-800/50 bg-gray-900/50"
      }`}
    >
      <button {...attributes} {...listeners} className="cursor-grab text-gray-600 hover:text-gray-400">
        <GripVertical className="h-5 w-5" />
      </button>

      <div className="flex-1">
        <p className={`font-medium ${tab.isEnabled ? "text-white" : "text-gray-500"}`}>{tab.label}</p>
        <p className="text-xs text-gray-500">{tab.slug}</p>
      </div>

      <button onClick={() => onToggle(tab.id, !tab.isEnabled)}
        className={`rounded-lg p-2 transition-colors ${
          tab.isEnabled ? "text-gray-400 hover:bg-gray-800 hover:text-white" : "text-gray-600 hover:bg-gray-800 hover:text-gray-400"
        }`}>
        {tab.isEnabled ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
      </button>
      <button onClick={() => onEdit(tab)}
        className="rounded-lg p-2 text-gray-400 hover:bg-gray-800 hover:text-white">
        <Pencil className="h-4 w-4" />
      </button>
      <button onClick={() => onDelete(tab.id)}
        className="rounded-lg p-2 text-gray-400 hover:bg-red-900/50 hover:text-red-400">
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

export default function AdminNavTabsPage() {
  const [tabs, setTabs] = useState<NavTab[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [saving, setSaving] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => { fetchTabs(); }, []);

  async function fetchTabs() {
    const res = await fetch("/api/admin/nav-tabs");
    if (res.ok) setTabs(await res.json());
    setLoading(false);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = tabs.findIndex((t) => t.id === active.id);
    const newIndex = tabs.findIndex((t) => t.id === over.id);
    const reordered = arrayMove(tabs, oldIndex, newIndex);
    setTabs(reordered);

    fetch("/api/admin/nav-tabs/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderedIds: reordered.map((t) => t.id) }),
    });
  }

  async function handleToggle(id: string, enabled: boolean) {
    await fetch(`/api/admin/nav-tabs/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isEnabled: enabled }),
    });
    setTabs(tabs.map((t) => (t.id === id ? { ...t, isEnabled: enabled } : t)));
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this tab?")) return;
    await fetch(`/api/admin/nav-tabs/${id}`, { method: "DELETE" });
    setTabs(tabs.filter((t) => t.id !== id));
  }

  // Tabs not yet added
  const existingSlugs = new Set(tabs.map((t) => t.slug));
  const availableToAdd = AVAILABLE_TABS.filter((t) => !existingSlugs.has(t.slug));

  async function handleAdd(slug: string) {
    const tabDef = AVAILABLE_TABS.find((t) => t.slug === slug);
    if (!tabDef) return;
    setSaving(true);
    try {
      await fetch("/api/admin/nav-tabs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: tabDef.slug, label: tabDef.label, kind: tabDef.kind }),
      });
      fetchTabs();
    } finally { setSaving(false); }
  }

  async function handleSaveEdit() {
    if (!editingId || !editLabel.trim()) return;
    setSaving(true);
    try {
      await fetch(`/api/admin/nav-tabs/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: editLabel.trim() }),
      });
      setEditingId(null);
      fetchTabs();
    } finally { setSaving(false); }
  }

  return (
    <div>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Navigation Tabs</h1>
          <p className="mt-2 text-gray-400">Reorder and manage the viewer navigation tabs</p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-lg bg-red-600 px-6 py-3 text-sm font-semibold text-white shadow-lg hover:bg-red-700">
          <Plus className="h-5 w-5" /> Add Tab
        </button>
      </div>

      {showForm && (
        <div className="mb-6 rounded-xl border border-gray-700 bg-gray-900 p-6">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-lg font-semibold text-white">Add Tab</h2>
            <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-white"><X className="h-5 w-5" /></button>
          </div>
          <div className="flex flex-wrap gap-3">
            {availableToAdd.length === 0 ? (
              <p className="text-sm text-gray-500">All tabs have been added.</p>
            ) : (
              availableToAdd.map((tab) => (
                <button key={tab.slug} onClick={() => handleAdd(tab.slug)} disabled={saving}
                  className="rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 text-sm text-gray-300 transition-colors hover:border-gray-600 hover:text-white disabled:opacity-50">
                  {tab.label}
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin rounded-full border-4 border-red-500 border-t-transparent" />
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={tabs.map((t) => t.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {tabs.map((tab) => (
                <SortableTab key={tab.id} tab={tab}
                  onEdit={(t) => { setEditingId(t.id); setEditLabel(t.label); }}
                  onToggle={handleToggle}
                  onDelete={handleDelete} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}