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

const GAP = 16;
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
    <section className="group/row mb-16">
      {/* Mobile view - horizontal scroll */}
      <div className="md:hidden">
        <h2 className="mb-4 px-6 font-['Playfair_Display'] text-2xl font-bold tracking-tight text-white">
          {title}
        </h2>

        <div
          className="scrollbar-hide overflow-x-auto px-6 pb-3"
          style={{
            WebkitOverflowScrolling: "touch",
            overscrollBehaviorX: "contain",
          }}
        >
          <div className="flex gap-4 pr-6">
            {placements.map((placement) => (
              <div
                key={placement.id}
                className="w-[75vw] min-w-[240px] max-w-[320px] shrink-0"
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

      {/* Desktop view - paginated with navigation */}
      <div className="hidden md:block">
        <h2 className="mb-5 px-12 font-['Playfair_Display'] text-3xl font-bold tracking-tight text-white lg:px-16 lg:text-4xl">
          {title}
        </h2>

        <div className="relative w-full">

          {/* Left navigation button */}
          {canGoLeft && (
            <button
              onClick={previous}
              className="
                absolute
                left-0
                -top-8
                -bottom-8
                z-30
                w-16
                opacity-0
                transition-opacity
                duration-300
                group-hover/row:opacity-100
                bg-gradient-to-r
                from-[#050304]/95
                to-transparent
                flex
                items-center
                justify-center
                hover:scale-110
              "
              data-testid="row-nav-left"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-white/10 backdrop-blur-md transition-all duration-300 hover:border-white/40 hover:bg-white/20">
                <ChevronLeft className="h-7 w-7 text-white" />
              </div>
            </button>
          )}

          {/* Right navigation button */}
          {canGoRight && (
            <button
              onClick={next}
              className="
                absolute
                right-0
                -top-8
                -bottom-8
                z-30
                w-16
                opacity-0
                transition-opacity
                duration-300
                group-hover/row:opacity-100
                bg-gradient-to-l
                from-[#050304]/95
                to-transparent
                flex
                items-center
                justify-center
                hover:scale-110
              "
              data-testid="row-nav-right"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-white/10 backdrop-blur-md transition-all duration-300 hover:border-white/40 hover:bg-white/20">
                <ChevronRight className="h-7 w-7 text-white" />
              </div>
            </button>
          )}

          {/* Scrollable content */}
          <div
            ref={viewportRef}
            className="overflow-visible px-12 lg:px-16"
          >

            <div
              className="
                flex
                pr-12
                transition-transform
                duration-700
                ease-[cubic-bezier(.22,.61,.36,1)]
                lg:pr-16
              "
              style={{
                gap: `${GAP}px`,
                transform: `translateX(-${translate}px)`,
              }}
            >            
              {placements.map((placement, index) => (
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
