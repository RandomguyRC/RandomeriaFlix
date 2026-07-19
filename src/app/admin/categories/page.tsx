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
import { GripVertical, Plus, Pencil, Trash2, X, Check, Loader2 } from "lucide-react";

interface Category {
  id: string;
  title: string;
  slug: string;
  sortOrder: number;
  profileId: string;
  profile: { name: string; slug: string };
  _count: { placements: number };
}

interface Profile {
  id: string;
  name: string;
  slug: string;
}

function SortableCategory({
  category,
  onEdit,
  onDelete,
}: {
  category: Category;
  onEdit: (cat: Category) => void;
  onDelete: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: category.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : "auto",
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 rounded-lg border bg-gray-900 px-4 py-3 transition-colors ${
        isDragging ? "border-red-500 shadow-2xl opacity-80" : "border-gray-800 hover:border-gray-700"
      }`}
    >
      <button {...attributes} {...listeners} className="cursor-grab text-gray-600 hover:text-gray-400">
        <GripVertical className="h-5 w-5" />
      </button>

      <div className="flex-1">
        <p className="font-medium text-white">{category.title}</p>
        <p className="text-xs text-gray-500">{category._count.placements} items</p>
      </div>

      <button onClick={() => onEdit(category)} className="rounded-lg p-2 text-gray-400 hover:bg-gray-800 hover:text-white">
        <Pencil className="h-4 w-4" />
      </button>
      <button onClick={() => onDelete(category.id)} className="rounded-lg p-2 text-gray-400 hover:bg-red-900/50 hover:text-red-400">
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [editingCat, setEditingCat] = useState<Category | null>(null);
  const [formTitle, setFormTitle] = useState("");
  const [formProfileId, setFormProfileId] = useState("");
  const [saving, setSaving] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => { fetchCategories(); fetchProfiles(); }, []);

  async function fetchCategories() {
    const res = await fetch("/api/admin/categories");
    if (res.ok) setCategories(await res.json());
    setLoading(false);
  }

  async function fetchProfiles() {
    const res = await fetch("/api/admin/profiles");
    if (res.ok) setProfiles(await res.json());
  }

  function handleDragEnd(event: DragEndEvent, profileId: string) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const profileCats = categories.filter((c) => c.profileId === profileId);
    const otherCats = categories.filter((c) => c.profileId !== profileId);
    const oldIndex = profileCats.findIndex((c) => c.id === active.id);
    const newIndex = profileCats.findIndex((c) => c.id === over.id);

    const reordered = arrayMove(profileCats, oldIndex, newIndex);
    setCategories([...otherCats, ...reordered]);

    fetch("/api/admin/categories/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderedIds: reordered.map((c) => c.id) }),
    });
  }

  function openAddForm(profileId: string) {
    setEditingCat(null); setFormTitle(""); setFormProfileId(profileId); setShowForm(true);
  }

  function openEditForm(cat: Category) {
    setEditingCat(cat); setFormTitle(cat.title); setFormProfileId(cat.profileId); setShowForm(true);
  }

  async function handleSave() {
    if (!formTitle.trim() || !formProfileId) return;
    setSaving(true);
    try {
      if (editingCat) {
        await fetch(`/api/admin/categories/${editingCat.id}`, {
          method: "PATCH", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: formTitle.trim() }),
        });
      } else {
        await fetch("/api/admin/categories", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: formTitle.trim(), profileId: formProfileId }),
        });
      }
      setShowForm(false); fetchCategories();
    } finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this category?")) return;
    await fetch(`/api/admin/categories/${id}`, { method: "DELETE" });
    setCategories(categories.filter((c) => c.id !== id));
  }

  const grouped = profiles.map((p) => ({
    profile: p,
    categories: categories.filter((c) => c.profileId === p.id).sort((a, b) => a.sortOrder - b.sortOrder),
  }));

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Categories</h1>
          <p className="mt-2 text-gray-400">Manage content rows for each profile</p>
        </div>
        <button onClick={() => openAddForm("")}
          className="flex items-center gap-2 rounded-lg bg-red-600 px-6 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:bg-red-700">
          <Plus className="h-5 w-5" /> Add Category
        </button>
      </div>

      {showForm && (
        <div className="mb-6 rounded-xl border border-gray-700 bg-gray-900 p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">{editingCat ? "Edit Category" : "Add Category"}</h2>
            <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-white"><X className="h-5 w-5" /></button>
          </div>
          <div className="flex gap-4">
            <input type="text" value={formTitle} onChange={(e) => setFormTitle(e.target.value)}
              placeholder="Category name..."
              className="flex-1 rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 text-white placeholder-gray-500 focus:border-red-500 focus:outline-none" />
            {!editingCat && (
              <select value={formProfileId} onChange={(e) => setFormProfileId(e.target.value)}
                className="rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 text-white focus:border-red-500 focus:outline-none">
                {profiles.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            )}
            <button onClick={handleSave} disabled={saving || !formTitle.trim()}
              className="flex items-center gap-2 rounded-lg bg-red-600 px-6 py-3 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {editingCat ? "Update" : "Create"}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-red-500 border-t-transparent" />
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map(({ profile, categories: cats }) => (
            <div key={profile.id} className="rounded-xl border border-gray-800 bg-gray-900/50 p-6">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg text-sm font-bold text-white ${
                    profile.slug === "randomeria" ? "bg-red-600" : "bg-violet-600"
                  }`}>
                    {profile.name.charAt(0)}
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-white">{profile.name}</h2>
                    <p className="text-xs text-gray-500">{cats.length} categories</p>
                  </div>
                </div>
                <button onClick={() => openAddForm(profile.id)}
                  className="flex items-center gap-1.5 rounded-lg bg-gray-800 px-3 py-2 text-xs font-medium text-gray-300 hover:bg-gray-700 hover:text-white">
                  <Plus className="h-4 w-4" /> Add
                </button>
              </div>

              {cats.length === 0 ? (
                <p className="py-4 text-center text-sm text-gray-500">No categories yet</p>
              ) : (
                <DndContext sensors={sensors} collisionDetection={closestCenter}
                  onDragEnd={(e) => handleDragEnd(e, profile.id)}>
                  <SortableContext items={cats.map((c) => c.id)} strategy={verticalListSortingStrategy}>
                    <div className="space-y-2">
                      {cats.map((cat) => (
                        <SortableCategory key={cat.id} category={cat} onEdit={openEditForm} onDelete={handleDelete} />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
