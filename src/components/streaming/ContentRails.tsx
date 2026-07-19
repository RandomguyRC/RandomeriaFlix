"use client";

import { useState } from "react";

import MovieRow from "./MovieRow";
import MemoryModal from "./MemoryModal";
import AudioModal from "./AudioModal";

import type { Category, ContentItem } from "./types";

interface ContentRailsProps {
  categories: Category[];
}

export default function ContentRails({
  categories,
}: ContentRailsProps) {
  const [selectedItem, setSelectedItem] =
    useState<ContentItem | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] =
    useState<string | null>(null);

  function openItem(item: ContentItem, categoryId: string) {
    setSelectedItem(item);
    setSelectedCategoryId(categoryId);
  }

  function closeModal() {
    setSelectedItem(null);
    setSelectedCategoryId(null);
  }

  const activeCategory = categories.find(
    (c) => c.id === selectedCategoryId
  );

  const categoryItems =
    activeCategory?.placements.map((p) => p.contentItem) ?? [];

  return (
    <>
      <div className="pt-12 pb-20">
        {categories.map((category) => (
          <MovieRow
            key={category.id}
            title={category.title}
            placements={category.placements}
            onSelect={(item) => openItem(item, category.id)}
          />
        ))}
      </div>

      {selectedItem && selectedItem.type === "AUDIO" ? (
        <AudioModal
          item={selectedItem}
          items={categoryItems}
          onClose={closeModal}
          onNavigate={setSelectedItem}
        />
      ) : (
        <MemoryModal
          item={selectedItem}
          items={categoryItems}
          onClose={closeModal}
          onNavigate={setSelectedItem}
        />
      )}
    </>
  );
}