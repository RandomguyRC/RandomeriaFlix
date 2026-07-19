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

// How many cards are visible at once, per breakpoint. Below md the row is a
// native swipeable/scrollable strip (touch devices have no hover, so the
// old JS-only translateX carousel was completely unreachable on mobile).
function getVisibleCards(width: number) {
  if (width < 480) return 2.3;
  if (width < 640) return 2.8;
  if (width < 768) return 3.4;
  if (width < 1024) return 4;
  return 5;
}

export default function MovieRow({
  title,
  placements,
  onSelect,
}: MovieRowProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);

  const [cardWidth, setCardWidth] = useState(0);
  const [visibleCards, setVisibleCards] = useState(5);
  const [canGoLeft, setCanGoLeft] = useState(false);
  const [canGoRight, setCanGoRight] = useState(false);

  useEffect(() => {
    function updateCardWidth() {
      if (!viewportRef.current) return;

      const viewportWidth = viewportRef.current.clientWidth;
      const cards = getVisibleCards(window.innerWidth);

      const width = (viewportWidth - GAP * (cards - 1)) / (cards + 0.25);

      setVisibleCards(cards);
      setCardWidth(width);
    }

    updateCardWidth();

    window.addEventListener("resize", updateCardWidth);

    return () =>
      window.removeEventListener("resize", updateCardWidth);
  }, []);

  const updateArrows = useMemo(
    () => () => {
      const el = scrollerRef.current;
      if (!el) return;
      setCanGoLeft(el.scrollLeft > 4);
      setCanGoRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
    },
    []
  );

  useEffect(() => {
    updateArrows();
  }, [cardWidth, placements.length, updateArrows]);

  // Scroll by slightly less than a full page of cards so the card just
  // outside the viewport keeps peeking in on both edges (matches the old
  // translateX carousel's "peek" look instead of landing exactly on a card
  // boundary, which left a blank gap with nothing showing through).
  const PEEK_CARDS = 0.2;

  function next() {
    const el = scrollerRef.current;
    if (!el) return;
    const cards = Math.max(1, Math.floor(visibleCards) - PEEK_CARDS);
    el.scrollBy({ left: (cardWidth + GAP) * cards, behavior: "smooth" });
  }

  function previous() {
    const el = scrollerRef.current;
    if (!el) return;
    const cards = Math.max(1, Math.floor(visibleCards) - PEEK_CARDS);
    el.scrollBy({ left: -(cardWidth + GAP) * cards, behavior: "smooth" });
  }

  if (placements.length === 0) return null;

  return (
    <section className="group/row mb-8 sm:mb-12">

      <h2 className="mb-3 pl-4 text-lg font-bold text-white sm:mb-4 sm:pl-8 sm:text-xl md:pl-12 md:text-2xl">
        {title}
      </h2>

      <div className="relative w-full flow-root">

        {canGoLeft && (
          <button
            onClick={previous}
            className="
              absolute
              left-0
              -top-6
              -bottom-6
              z-40
              hidden
              w-24
              opacity-0
              transition-opacity
              duration-300
              group-hover/row:opacity-100
              bg-gradient-to-r
              from-black/90
              to-transparent
              items-center
              justify-center
              md:flex
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
              z-40
              hidden
              w-14
              opacity-0
              transition-opacity
              duration-300
              group-hover/row:opacity-100
              bg-gradient-to-l
              from-black/90
              to-transparent
              items-center
              justify-center
              md:flex
            "
          >
            <ChevronRight className="h-9 w-9 text-white" />
          </button>
        )}

        <div
          ref={viewportRef}
          className="overflow-visible pl-4 sm:pl-8 md:pl-12 md:-my-8"
        >

          <div
            ref={scrollerRef}
            onScroll={updateArrows}
            className="
              flex
              overflow-x-auto
              scroll-smooth
              scrollbar-hide
              snap-x
              snap-mandatory
              pr-4
              sm:pr-8
              md:pr-12
              md:py-8
              md:snap-none
            "
            style={{
              gap: `${GAP}px`,
            }}
          >
            {placements.map((placement) => (
              <div
                key={placement.id}
                className="snap-start"
                style={{
                  width: cardWidth ? `${cardWidth}px` : undefined,
                  flex: cardWidth ? `0 0 ${cardWidth}px` : "0 0 40%",
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
    </section>
  );
}