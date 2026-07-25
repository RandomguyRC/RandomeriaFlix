"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import MovieCard from "./MovieCard";
import type { Placement, ContentItem } from "./types";

interface MovieRowProps {
  title: string;
  placements: Placement[];
  onSelect: (item: ContentItem) => void;
}

const GAP = 12;
const VISIBLE_CARDS = 5;

export default function MovieRow({
  title,
  placements,
  onSelect,
}: MovieRowProps) {
  const viewportRef = useRef<HTMLDivElement>(null);

  const [page, setPage] = useState(0);

  const [cardWidth, setCardWidth] = useState(0);

  useEffect(() => {
    function updateCardWidth() {
      if (!viewportRef.current) return;

      const viewportWidth = viewportRef.current.clientWidth;

      const width =
        (viewportWidth - GAP * (VISIBLE_CARDS - 1)) /
        (VISIBLE_CARDS + 0.25);

      setCardWidth(width);
    }

    updateCardWidth();

    window.addEventListener("resize", updateCardWidth);

    return () =>
      window.removeEventListener("resize", updateCardWidth);
  }, []);

  const maxPage = useMemo(() => {
    return Math.max(
      0,
      Math.ceil(placements.length / VISIBLE_CARDS) - 1
    );
  }, [placements.length]);

  const translate = page * (cardWidth + GAP) * VISIBLE_CARDS;

  const canGoLeft = page > 0;

  const canGoRight = page < maxPage;

  function next() {
    setPage((p) => Math.min(maxPage, p + 1));
  }

  function previous() {
    setPage((p) => Math.max(0, p - 1));
  }

  if (placements.length === 0) return null;

  return (
    <section className="group/row mb-12">
      <div className="md:hidden">
        <h2 className="mb-3 pl-4 pr-4 text-xl font-bold text-white">
          {title}
        </h2>

        <div
          className="scrollbar-hide overflow-x-auto px-4 pb-2"
          style={{
            WebkitOverflowScrolling: "touch",
            overscrollBehaviorX: "contain",
          }}
        >
          <div className="flex gap-3 pr-4">
            {placements.map((placement) => (
              <div
                key={placement.id}
                className="w-[70vw] min-w-[220px] max-w-[280px] shrink-0"
              >
                <MovieCard
                  placement={placement}
                  onClick={() => onSelect(placement.contentItem)}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="hidden md:block">
        <h2 className="mb-4 pl-12 text-2xl font-bold text-white">
          {title}
        </h2>

        <div className="relative w-full">

          {canGoLeft && (
            <button
              onClick={previous}
              className="
                absolute
                left-0
                -top-6
                -bottom-6
                z-30
                w-24
                opacity-0
                transition-opacity
                duration-300
                group-hover/row:opacity-100
                bg-gradient-to-r
                from-black/90
                to-transparent
                flex
                items-center
                justify-center
              "
            >
              <ChevronLeft className="h-9 w-9 text-white" />
            </button>
          )}

          {canGoRight && (
            <button
              onClick={next}
              className="
                absolute
                right-0
                -top-6
                -bottom-6
                z-30
                w-14
                opacity-0
                transition-opacity
                duration-300
                group-hover/row:opacity-100
                bg-gradient-to-l
                from-black/90
                to-transparent
                flex
                items-center
                justify-center
              "
            >
              <ChevronRight className="h-9 w-9 text-white" />
            </button>
          )}

          <div
            ref={viewportRef}
            className="overflow-visible pl-12"
          >

            <div
              className="
                flex
                pr-12
                transition-transform
                duration-500
                ease-[cubic-bezier(.22,.61,.36,1)]
              "
              style={{
                gap: `${GAP}px`,
                transform: `translateX(-${translate}px)`,
              }}
            >            {placements.map((placement) => (
                <div
                  key={placement.id}
                  style={{
                    width: `${cardWidth}px`,
                    flex: `0 0 ${cardWidth}px`,
                  }}
                >
                  <MovieCard
                    placement={placement}
                    onClick={() => onSelect(placement.contentItem)}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}