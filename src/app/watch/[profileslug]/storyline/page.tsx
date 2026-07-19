"use client";

import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { Loader2, Play, Pause, Volume2, VolumeX, X, HelpCircle, AlertTriangle } from "lucide-react";
import CelebrationOverlay, { CelebrationVariant } from "@/components/storyline/CelebrationOverlay";

interface StoryEvent {
  id: string;
  title: string;
  subtitle?: string | null;
  eventDate?: string | null;
  body?: string | null;
  mood?: string | null;
  sortOrder: number;
  assetId?: string | null;
  asset?: { id: string; mimeType: string } | null;
  imageCropX?: number | null;
  imageCropY?: number | null;
}

// Mood → background color
const MOOD_COLORS: Record<string, string> = {
  happy: "from-amber-950/40 via-amber-900/20 to-transparent",
  trip: "from-sky-950/40 via-sky-900/20 to-transparent",
  night: "from-indigo-950/50 via-indigo-900/20 to-transparent",
  rain: "from-slate-950/40 via-slate-800/20 to-transparent",
  christmas: "from-red-950/40 via-red-900/20 to-transparent",
  festival: "from-purple-950/40 via-purple-900/20 to-transparent",
  romantic: "from-rose-950/40 via-rose-900/20 to-transparent",
  funny: "from-yellow-950/30 via-yellow-900/15 to-transparent",
  default: "from-red-950/15 via-transparent to-transparent",
};

function getMoodGradient(mood: string | null | undefined): string {
  if (!mood) return MOOD_COLORS.default;
  const key = mood.toLowerCase().trim();
  return MOOD_COLORS[key] || MOOD_COLORS.default;
}

// Deterministic pseudo-random hash, used so the star field doesn't reshuffle on every render
function hash(n: number) {
  let h = n * 2654435761;
  h = ((h >>> 16) ^ h) * 0x45d9f3b;
  h = ((h >>> 16) ^ h) * 0x45d9f3b;
  h = (h >>> 16) ^ h;
  return (h & 0x7fffffff) / 0x7fffffff; // 0..1
}

export default function StorylinePage() {
  const params = useParams();
  const profileSlug = params.profileslug as string;
  const [events, setEvents] = useState<StoryEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [endingQuestion, setEndingQuestion] = useState<{
    question: string;
    answers: string[];
    emptyProfileSlug: string;
  } | null>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const chapterRefs = useRef<(HTMLDivElement | null)[]>([]);
  // Tracks whether the user is currently scrolling down (forward) or up
  // (backward). Chapters use this to decide whether to replay their
  // entrance animation or just stay put.
  const scrollDirectionRef = useRef<"down" | "up">("down");

  useEffect(() => {
    let lastY = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      if (Math.abs(y - lastY) > 4) {
        scrollDirectionRef.current = y > lastY ? "down" : "up";
        lastY = y;
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Track which chapter is most visible based on intersection ratio
  useEffect(() => {
    if (events.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        let best = -1;
        let bestRatio = 0;
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio > bestRatio) {
            bestRatio = entry.intersectionRatio;
            best = parseInt(entry.target.getAttribute("data-chapter") || "-1");
          }
        });
        if (best >= 0) setActiveIndex(best);
      },
      { threshold: [0.05, 0.15, 0.3, 0.5] }
    );
    // Small delay to ensure refs are populated
    const timer = setTimeout(() => {
      chapterRefs.current.forEach((el) => { if (el) observer.observe(el); });
    }, 100);
    return () => { clearTimeout(timer); observer.disconnect(); };
  }, [events.length]);

  // Scroll progress bar
  useEffect(() => {
    let ticking = false;
    const update = () => {
      const doc = document.documentElement;
      const scrollable = doc.scrollHeight - doc.clientHeight;
      const pct = scrollable > 0 ? (doc.scrollTop / scrollable) * 100 : 0;
      setScrollProgress(Math.min(100, Math.max(0, pct)));
      ticking = false;
    };
    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(update);
        ticking = true;
      }
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/storyline?profileSlug=${profileSlug}`);
        if (res.ok) setEvents(await res.json());
      } catch {}
      setLoading(false);
    }
    load();
  }, [profileSlug]);

  // The ending question is optional and admin-configurable, so it's fetched
  // separately and only rendered once a question has actually been set.
  useEffect(() => {
    async function loadEndingQuestion() {
      try {
        const res = await fetch("/api/settings");
        if (!res.ok) return;
        const data = await res.json();
        const question = (data.storylineQuestion || "").trim();
        if (!question) return;
        const answers = [data.storylineAnswer1, data.storylineAnswer2, data.storylineAnswer3]
          .map((a: string | undefined) => (a || "").trim())
          .filter(Boolean);
        if (answers.length > 0) {
          setEndingQuestion({
            question,
            answers,
            emptyProfileSlug: (data.storylineEmptyProfileSlug || "").trim(),
          });
        }
      } catch {}
    }
    loadEndingQuestion();
  }, []);

  const scrollToChapter = useCallback((index: number) => {
    chapterRefs.current[index]?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, []);

  // Star field — generated once, twinkles forever
  const stars = useMemo(() => {
    return Array.from({ length: 140 }, (_, i) => {
      const x = hash(i * 3 + 1) * 100;
      const y = hash(i * 3 + 7) * 100;
      const sz = 0.5 + hash(i * 13) * 1.6;
      const twinkle = i % 3 === 0 ? "twinkle-1" : i % 3 === 1 ? "twinkle-2" : "twinkle-3";
      const dur = 2.5 + hash(i * 5) * 4.5;
      const del = hash(i * 11) * 6;
      const baseOpacity = 0.2 + hash(i * 17) * 0.55;
      return { id: i, x, y, sz, twinkle, dur, del, baseOpacity };
    });
  }, []);

  // Shooting stars — a handful, each on its own long, staggered cycle
  const shootingStars = useMemo(() => {
    return Array.from({ length: 4 }, (_, i) => {
      const x = 10 + hash(i * 91 + 3) * 70;
      const y = 5 + hash(i * 47 + 9) * 40;
      const angle = 200 + hash(i * 29 + 5) * 40;
      const dur = 7 + hash(i * 61 + 2) * 6;
      const del = hash(i * 83 + 4) * 10;
      return { id: i, x, y, angle, dur, del };
    });
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-red-500" />
      </div>
    );
  }

  const activeMood = activeIndex >= 0 && activeIndex < events.length
    ? events[activeIndex].mood
    : null;

  return (
    <div className="relative min-h-screen">
      {/* Scroll progress bar */}
      <div className="fixed left-0 top-14 z-40 h-[2px] w-full bg-white/5">
        <div
          className="h-full bg-gradient-to-r from-red-500 via-rose-400 to-amber-300 transition-[width] duration-150 ease-out"
          style={{ width: `${scrollProgress}%`, boxShadow: "0 0 8px rgba(244,63,94,0.6)" }}
        />
      </div>

      {/* Chapter tracker rail — a bounded-height minimap that scales to any
          chapter count instead of stacking one dot per chapter forever. */}
      {events.length > 1 && (
        <ChapterRail events={events} activeIndex={activeIndex} onSelect={scrollToChapter} />
      )}

      {/* Stars background */}
      <div className="fixed inset-0 overflow-hidden" style={{ background: "radial-gradient(ellipse at center, #0d1117 0%, #010409 70%, #000000 100%)", zIndex: -20 }}>
        {/* Twinkling stars */}
        {stars.map((s) => (
          <div key={s.id}
            className="absolute rounded-full bg-white"
            style={{
              left: `${s.x}%`,
              top: `${s.y}%`,
              width: `${s.sz}px`,
              height: `${s.sz}px`,
              opacity: s.baseOpacity,
              animation: `${s.twinkle} ${s.dur}s ease-in-out ${s.del}s infinite`,
            }}
          />
        ))}

        {/* Shooting stars */}
        {shootingStars.map((s) => (
          <div key={`shoot-${s.id}`}
            className="absolute"
            style={{
              left: `${s.x}%`,
              top: `${s.y}%`,
              width: "2px",
              height: "2px",
              ["--angle" as any]: `${s.angle}deg`,
              animation: `shooting-star ${s.dur}s linear ${s.del}s infinite`,
            }}
          >
            <div
              className="absolute right-0 top-1/2 -translate-y-1/2"
              style={{
                width: "90px",
                height: "1.5px",
                background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.85))",
              }}
            />
            <div
              className="absolute right-0 top-1/2 h-[3px] w-[3px] -translate-y-1/2 rounded-full bg-white"
              style={{ boxShadow: "0 0 6px 1.5px rgba(255,255,255,0.9)" }}
            />
          </div>
        ))}

        {/* Nebula glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[60%] h-[40%] rounded-full blur-3xl opacity-10" style={{ background: "radial-gradient(circle, rgba(229,9,63,0.3), transparent)" }} />
        <div className="absolute bottom-1/4 right-1/4 w-[40%] h-[30%] rounded-full blur-3xl opacity-8" style={{ background: "radial-gradient(circle, rgba(100,50,200,0.2), transparent)" }} />

        {/* Mood gradient overlay */}
        <div className={`absolute inset-0 transition-all duration-[2000ms] ease-in-out bg-gradient-to-b ${getMoodGradient(activeMood)}`} style={{ zIndex: -5 }} />

        {/* Cinematic vignette */}
        <div className="absolute inset-0 pointer-events-none" style={{ boxShadow: "inset 0 0 220px 60px rgba(0,0,0,0.65)" }} />
      </div>

      {/* Chapters */}
      {events.length === 0 ? (
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <p className="text-xl text-gray-500">No chapters.</p>
            <p className="mt-2 text-sm text-gray-600">Random Guy is forever gone...</p>
          </div>
        </div>
      ) : (
        events.map((event, index) => (
          <ChapterSection
            key={event.id}
            event={event}
            index={index}
            total={events.length}
            chapterRef={(el) => { chapterRefs.current[index] = el; }}
            scrollDirectionRef={scrollDirectionRef}
          />
        ))
      )}

      {/* Ending — shows the question card once configured, otherwise a
          simple placeholder so the page doesn't just end abruptly */}
      {events.length > 0 && (
        endingQuestion ? (
          <EndingQuestion
            question={endingQuestion.question}
            answers={endingQuestion.answers}
            emptyProfileSlug={endingQuestion.emptyProfileSlug}
          />
        ) : (
          <div className="flex min-h-[60vh] items-center justify-center px-6">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.5 }}
              transition={{ duration: 1.2, ease: "easeOut" }}
              className="text-center"
            >
              <div className="mb-6 text-2xl text-gray-600">✦</div>
              <p className="text-lg leading-relaxed text-gray-400 italic max-w-lg mx-auto">
                The story is still being written...
              </p>
              <p className="mt-4 text-2xl" style={{ animation: "soft-glow-pulse 2.6s ease-in-out infinite" }}>❤️</p>
              <p className="mt-3 text-sm text-gray-500">
                Every new memory becomes another chapter.
              </p>
            </motion.div>
          </div>
        )
      )}

    </div>
  );
}

// ─── Chapter Rail ───
// A bounded-height "minimap" for jumping between chapters. Instead of
// stacking one dot per chapter (which blows past the viewport once there
// are more than a handful of entries), dots are placed proportionally
// along a fixed-height track, so the rail looks the same whether there
// are 5 chapters or 500.
function ChapterRail({
  events,
  activeIndex,
  onSelect,
}: {
  events: StoryEvent[];
  activeIndex: number;
  onSelect: (index: number) => void;
}) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const total = events.length;
  const clampedActive = Math.max(activeIndex, 0);
  const activePct = total > 1 ? (clampedActive / (total - 1)) * 100 : 0;

  // Spacing grows gently with chapter count but is always capped, so the
  // rail never exceeds a comfortable fraction of the viewport height.
  const railPx = Math.min(560, Math.max(160, 36 + total * 11));

  return (
    <div className="fixed right-5 top-1/2 z-30 hidden -translate-y-1/2 flex-col items-center gap-3 lg:flex">
      {/* Current position badge */}
      <div
        className="select-none whitespace-nowrap rounded-full border border-white/10 bg-black/40 px-3 py-1 text-[10px] font-medium tracking-[0.15em] text-gray-300 backdrop-blur-md transition-shadow duration-500"
        style={{ boxShadow: "0 0 14px rgba(244,63,94,0.12)" }}
      >
        <span className="text-red-400">{toRoman(clampedActive + 1)}</span>
        <span className="mx-1 text-gray-600">/</span>
        <span className="font-serif italic text-gray-400">{toRoman(total)}</span>
      </div>

      <div className="relative" style={{ height: `min(${railPx}px, 58vh)`, width: 22 }}>
        {/* Track + progress fill, faded at both ends */}
        <div
          className="absolute inset-0"
          style={{
            maskImage: "linear-gradient(to bottom, transparent 0%, black 10%, black 90%, transparent 100%)",
            WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, black 10%, black 90%, transparent 100%)",
          }}
        >
          <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-gradient-to-b from-white/0 via-white/10 to-white/0" />
          <div
            className="absolute left-1/2 top-0 w-px -translate-x-1/2 bg-gradient-to-b from-red-500 via-rose-400 to-amber-300 transition-[height] duration-500 ease-out"
            style={{ height: `${activePct}%`, boxShadow: "0 0 8px rgba(244,63,94,0.55)" }}
          />
        </div>

        {/* Chapter dots, positioned proportionally along the track */}
        {events.map((event, i) => {
          const topPct = total > 1 ? (i / (total - 1)) * 100 : 50;
          const isActive = i === activeIndex;
          const isHover = i === hoverIndex;
          return (
            <button
              key={event.id}
              onClick={() => onSelect(i)}
              onMouseEnter={() => setHoverIndex(i)}
              onMouseLeave={() => setHoverIndex((h) => (h === i ? null : h))}
              aria-label={`Go to chapter ${i + 1}: ${event.title}`}
              className="absolute left-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center"
              style={{
                top: `${topPct}%`,
                width: 22,
                height: 16,
                zIndex: isActive || isHover ? 10 : 1,
              }}
            >
              <span
                className="block rounded-full transition-all duration-300 ease-out"
                style={{
                  width: isActive ? 8 : isHover ? 6 : 4,
                  height: isActive ? 8 : isHover ? 6 : 4,
                  backgroundColor: isActive ? "#fb7185" : isHover ? "#e5e7eb" : "rgba(156,163,175,0.55)",
                  boxShadow: isActive ? "0 0 10px 2px rgba(248,113,113,0.85)" : "none",
                }}
              />
              {/* Tooltip with chapter number + title */}
              <span
                className={`pointer-events-none absolute right-full mr-3 flex items-center gap-1.5 whitespace-nowrap rounded-md border border-white/10 bg-gray-950/95 px-2.5 py-1.5 text-[11px] text-gray-200 backdrop-blur-sm transition-all duration-200 ${
                  isHover ? "translate-x-0 opacity-100" : "translate-x-1 opacity-0"
                }`}
              >
                <span className="font-serif italic text-red-400/80">{toRoman(i + 1)}</span>
                <span className="max-w-[160px] truncate">{event.title}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Ending Question ───
// A quiet final beat after the last chapter: an admin-configurable
// question with a button that opens a small dialog of answers. This is
// deliberately built around the 3-answer scenario described by the admin
// panel copy — answer 1 celebrates, answer 2 is bittersweet, answer 3
// asks for confirmation and then "clears" the universe by sending her to
// an empty profile.
function EndingQuestion({
  question,
  answers,
  emptyProfileSlug,
}: {
  question: string;
  answers: string[];
  emptyProfileSlug: string;
}) {
  const [open, setOpen] = useState(false);
  const [celebration, setCelebration] = useState<CelebrationVariant | null>(null);

  return (
    <div className="flex min-h-[50vh] items-center justify-center px-6 pb-32">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.6 }}
        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        className="mx-auto w-full max-w-md rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-transparent px-8 py-10 text-center backdrop-blur-sm"
        style={{ boxShadow: "0 0 60px rgba(244,63,94,0.06)" }}
      >
        <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.3em] text-red-400/80">
          One last thing
        </p>
        <p
          className="font-serif text-xl italic leading-relaxed text-white sm:text-2xl"
          style={{ textShadow: "0 2px 24px rgba(244,63,94,0.15)" }}
        >
          {question}
        </p>
        <button
          onClick={() => setOpen(true)}
          className="mt-8 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-red-500 to-rose-400 px-6 py-3 text-sm font-semibold text-white shadow-[0_0_24px_rgba(244,63,94,0.35)] transition-transform duration-300 hover:scale-105 active:scale-95"
        >
          <HelpCircle className="h-4 w-4" />
          Answer
        </button>
      </motion.div>

      <AnimatePresence>
        {open && (
          <AnswerDialog
            question={question}
            answers={answers}
            emptyProfileSlug={emptyProfileSlug}
            onClose={() => setOpen(false)}
            onCelebrate={(variant) => setCelebration(variant)}
          />
        )}
      </AnimatePresence>

      {celebration && (
        <CelebrationOverlay variant={celebration} onDone={() => setCelebration(null)} />
      )}
    </div>
  );
}

type DialogView = "answers" | "confirmClear" | "clearing";

function AnswerDialog({
  question,
  answers,
  emptyProfileSlug,
  onClose,
  onCelebrate,
}: {
  question: string;
  answers: string[];
  emptyProfileSlug: string;
  onClose: () => void;
  onCelebrate: (variant: CelebrationVariant) => void;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<number | null>(null);
  const [view, setView] = useState<DialogView>("answers");
  const letters = ["A", "B", "C", "D", "E"];

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape" && view !== "clearing") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose, view]);

  function handleAnswer(i: number) {
    setSelected(i);

    // The first two answers are hardcoded celebration beats; the third
    // (the "give up" option) opens a confirmation step instead.
    if (i === 0) {
      onCelebrate("joy");
      setTimeout(onClose, 900);
    } else if (i === 1) {
      onCelebrate("bittersweet");
      setTimeout(onClose, 900);
    } else if (i === 2) {
      setView("confirmClear");
    }
  }

  function handleConfirmClear() {
    setView("clearing");
    setTimeout(() => {
      router.push(`/watch/${emptyProfileSlug || "profiles"}/storyline`);
    }, 1400);
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-6 backdrop-blur-md"
      onClick={view === "clearing" ? undefined : onClose}
    >
      {/* Fade-to-black transition while "clearing" the universe */}
      <AnimatePresence>
        {view === "clearing" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1.2, ease: "easeInOut" }}
            className="fixed inset-0 z-[80] bg-black"
          />
        )}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-sm rounded-2xl border border-white/10 bg-[#0b0e14] p-6 shadow-[0_0_60px_rgba(0,0,0,0.6)] sm:p-7"
      >
        {view !== "clearing" && (
          <button
            onClick={onClose}
            aria-label="Close"
            className="absolute right-4 top-4 rounded-full p-1.5 text-gray-500 transition-colors hover:bg-white/5 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        )}

        <AnimatePresence mode="wait">
          {view === "answers" && (
            <motion.div
              key="answers"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="mb-6 text-center">
                <span className="text-xl" style={{ animation: "soft-glow-pulse 2.6s ease-in-out infinite" }}>✦</span>
                <p className="mt-3 font-serif text-base italic leading-snug text-gray-200">{question}</p>
              </div>

              <div className="space-y-2">
                {answers.map((answer, i) => {
                  const isSelected = selected === i;
                  return (
                    <button
                      key={i}
                      onClick={() => handleAnswer(i)}
                      className={`flex w-full items-start gap-3 rounded-xl border px-3.5 py-3 text-left transition-all duration-300 ${
                        isSelected
                          ? "border-red-400/50 bg-gradient-to-r from-red-500/15 to-rose-400/10"
                          : "border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.06]"
                      }`}
                      style={isSelected ? { boxShadow: "0 0 20px rgba(244,63,94,0.15)" } : undefined}
                    >
                      <span
                        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold transition-colors ${
                          isSelected ? "bg-red-400 text-white" : "bg-white/[0.06] text-gray-400"
                        }`}
                      >
                        {letters[i] || i + 1}
                      </span>
                      <span
                        className={`text-[13px] leading-snug transition-colors ${
                          isSelected ? "text-white" : "text-gray-300"
                        }`}
                      >
                        {answer}
                      </span>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {view === "confirmClear" && (
            <motion.div
              key="confirm"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="text-center"
            >
              <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-amber-500/10 ring-1 ring-amber-500/20">
                <AlertTriangle className="h-5 w-5 text-amber-400" />
              </div>
              <p className="font-serif text-base italic leading-relaxed text-gray-200">
                Are you sure? This means all your memories, including your Random Guy, will be
                deleted from this Universe.
              </p>
              <div className="mt-6 flex flex-col gap-2.5">
                <button
                  onClick={handleConfirmClear}
                  className="w-full rounded-xl border border-red-500/30 bg-gradient-to-r from-red-600/25 to-rose-500/20 px-4 py-3 text-sm font-semibold text-red-200 transition-all duration-300 hover:from-red-600/35 hover:to-rose-500/30"
                >
                  Yes, I&apos;m sure
                </button>
                <button
                  onClick={() => { setView("answers"); setSelected(null); }}
                  className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-gray-300 transition-all duration-300 hover:border-white/20 hover:bg-white/[0.06] hover:text-white"
                >
                  No, take me back
                </button>
              </div>
            </motion.div>
          )}

          {view === "clearing" && (
            <motion.div
              key="clearing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="py-6 text-center"
            >
              <Loader2 className="mx-auto mb-4 h-6 w-6 animate-spin text-gray-500" />
              <p className="text-sm italic text-gray-400">Letting go...</p>
            </motion.div>
          )}
        </AnimatePresence>

        {selected !== null && view === "answers" && (
          <motion.p
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-5 text-center text-xs text-gray-500"
          >
            ❤️ Noted.
          </motion.p>
        )}
      </motion.div>
    </motion.div>
  );
}

// ─── Chapter Section ───
function ChapterSection({
  event,
  index,
  total,
  chapterRef,
  scrollDirectionRef,
}: {
  event: StoryEvent;
  index: number;
  total: number;
  chapterRef: (el: HTMLDivElement | null) => void;
  scrollDirectionRef: { current: "down" | "up" };
}) {
  const innerRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  // When true, the chapter should just appear/stay as-is with no
  // entrance transition — used when it's being revealed by scrolling
  // back UP to it (already "read"), so it doesn't replay the animation.
  const [instant, setInstant] = useState(false);

  useEffect(() => {
    const el = innerRef.current;
    if (!el) return;
    chapterRef(el);
    const observer = new IntersectionObserver(
      ([entry]) => {
        const scrollingDown = scrollDirectionRef.current === "down";
        if (entry.isIntersecting) {
          // Entering view: replay the full staggered animation only when
          // scrolling down (forward, first-time-style reveal). Scrolling
          // up back to an earlier chapter just shows it instantly.
          setInstant(!scrollingDown);
          setVisible(true);
        } else if (scrollingDown) {
          // Leaving view while still moving forward — fade it out so it
          // can replay next time it's scrolled to. If we're scrolling
          // UP when it leaves view, leave it exactly as it is (stays
          // loaded, no fade) per the "going back" behavior.
          setInstant(false);
          setVisible(false);
        }
      },
      { threshold: 0.22, rootMargin: "-8% 0px -8% 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Entrance is a gentle staggered reveal; exit is a quick uniform fade so
  // chapters don't linger on screen once they've been scrolled past going
  // forward. When `instant` is set (revisited by scrolling up), skip the
  // transition entirely and just snap to the final state.
  const t = (delay: number, duration = 0.8) => {
    if (instant) return { duration: 0, delay: 0 };
    return visible
      ? { duration, delay, ease: [0.16, 1, 0.3, 1] as const }
      : { duration: 0.45, delay: 0, ease: "easeIn" as const };
  };

  return (
    <div
      ref={innerRef}
      data-chapter={index}
      className="relative flex min-h-[90vh] items-center justify-center px-6 py-24"
    >
      <div className="relative mx-auto max-w-2xl w-full">
        {/* Ghost chapter number — decorative depth */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-10 -left-4 select-none font-serif text-[9rem] font-bold leading-none text-white/[0.035] sm:text-[12rem]"
        >
          {index + 1}
        </div>

        <div className="relative">
          {/* Chapter number */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={visible ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={t(0)}
            className="mb-4 text-sm font-semibold uppercase tracking-[0.3em] text-red-400"
          >
            Chapter {toRoman(index + 1)}
          </motion.p>

          {/* Chapter title */}
          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            animate={visible ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
            transition={t(0.15, 0.9)}
            className="mb-4 text-4xl sm:text-5xl font-bold text-white leading-tight"
            style={{ textShadow: "0 2px 24px rgba(244,63,94,0.15)" }}
          >
            {event.title}
          </motion.h2>

          {/* Subtitle */}
          {event.subtitle && (
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={visible ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
              transition={t(0.3)}
              className="mb-4 text-lg text-gray-300 italic"
            >
              {event.subtitle}
            </motion.p>
          )}

          {/* Date */}
          {event.eventDate && (
            <motion.p
              initial={{ opacity: 0, y: 15 }}
              animate={visible ? { opacity: 1, y: 0 } : { opacity: 0, y: 15 }}
              transition={t(0.45, 0.7)}
              className="mb-8 text-sm text-gray-500 tracking-wide"
            >
              {event.eventDate}
            </motion.p>
          )}

          {/* Cinematic media — photo or video */}
          {event.asset && (
            <motion.div
              initial={{ opacity: 0, scale: 1.05 }}
              animate={visible ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 1.05 }}
              transition={t(0.35, 1.2)}
              className="relative mb-8 overflow-hidden rounded-xl shadow-[0_0_40px_rgba(0,0,0,0.5)] ring-1 ring-white/10"
            >
              {event.asset.mimeType?.startsWith("video/") ? (
                <VideoChapterMedia
                  src={`/api/media/${event.asset.id}`}
                  title={event.title}
                  cropX={event.imageCropX ?? 50}
                  cropY={event.imageCropY ?? 50}
                  active={visible}
                />
              ) : (
                <div className="overflow-hidden">
                  <img
                    src={`/api/media/${event.asset.id}`}
                    alt={event.title}
                    className="h-64 w-full object-cover sm:h-80"
                    style={{
                      objectPosition: `${event.imageCropX ?? 50}% ${event.imageCropY ?? 50}%`,
                      animation: visible ? "kenburns 9s ease-out forwards" : "none",
                    }}
                  />
                </div>
              )}
              {/* Subtle bottom fade for polish */}
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/40 to-transparent" />
            </motion.div>
          )}

          {/* Decorative divider */}
          <motion.div
            initial={{ opacity: 0, scaleX: 0 }}
            animate={visible ? { opacity: 1, scaleX: 1 } : { opacity: 0, scaleX: 0 }}
            transition={t(0.5)}
            className="mb-8 flex items-center gap-4"
          >
            <div className="h-px flex-1 bg-gradient-to-r from-transparent to-gray-700" />
            <span className="text-red-400/70" style={{ animation: "soft-glow-pulse 3s ease-in-out infinite" }}>✦</span>
            <div className="h-px flex-1 bg-gradient-to-l from-transparent to-gray-700" />
          </motion.div>

          {/* Story text — fades in progressively */}
          {event.body && (
            <motion.p
              initial={{ opacity: 0, y: 25 }}
              animate={visible ? { opacity: 1, y: 0 } : { opacity: 0, y: 25 }}
              transition={t(0.6, 1)}
              className="text-base sm:text-lg leading-relaxed text-gray-300 max-w-xl"
            >
              {event.body}
            </motion.p>
          )}

          {/* Mood badge */}
          {event.mood && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={visible ? { opacity: 1 } : { opacity: 0 }}
              transition={t(0.8, 0.6)}
              className="mt-8"
            >
              <span className="rounded-full bg-white/5 px-4 py-1.5 text-xs font-medium text-gray-400 backdrop-blur-sm border border-white/5">
                {event.mood}
              </span>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Video chapter media ───
// Auto-plays (muted) while its chapter is in view, pauses when scrolled
// away. Custom-styled controls (play/pause, mute, volume, scrub bar) so it
// matches the page instead of using the browser's default video chrome.
function VideoChapterMedia({
  src,
  title,
  cropX,
  cropY,
  active,
}: {
  src: string;
  title: string;
  cropX: number;
  cropY: number;
  active: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [volume, setVolume] = useState(1);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  // Controls are hidden by default and revealed on hover (desktop). On
  // touch devices, where hover doesn't apply, tapping the video toggles
  // them instead.
  const [controlsVisible, setControlsVisible] = useState(false);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-play (muted) whenever the chapter scrolls into view; pause the
  // instant it scrolls out. Playback position is preserved across this, so
  // scrolling back to a chapter resumes rather than restarting.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (active) {
      video.muted = muted;
      const playPromise = video.play();
      if (playPromise) playPromise.catch(() => {});
    } else {
      video.pause();
    }
  }, [active]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.muted = muted;
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  };

  const revealControls = (autoHide: boolean) => {
    setControlsVisible(true);
    if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    if (autoHide) {
      hideTimeoutRef.current = setTimeout(() => setControlsVisible(false), 2800);
    }
  };

  const handleVideoClick = () => {
    togglePlay();
    // On touch devices there's no hover to reveal controls, so a tap both
    // toggles playback and briefly reveals the control bar.
    revealControls(true);
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    const next = !muted;
    video.muted = next;
    if (!next && volume === 0) {
      setVolume(1);
      video.volume = 1;
    }
    setMuted(next);
  };

  const handleVolumeChange = (v: number) => {
    const video = videoRef.current;
    if (!video) return;
    setVolume(v);
    video.volume = v;
    const shouldMute = v === 0;
    video.muted = shouldMute;
    setMuted(shouldMute);
  };

  const handleSeek = (clientX: number, bar: HTMLDivElement) => {
    const video = videoRef.current;
    if (!video || !duration) return;
    const rect = bar.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    video.currentTime = pct * duration;
  };

  const pct = duration ? (progress / duration) * 100 : 0;

  return (
    <div
      className="group relative h-64 w-full overflow-hidden bg-black sm:h-80"
      onMouseEnter={() => revealControls(false)}
      onMouseLeave={() => { if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current); setControlsVisible(false); }}
    >
      <video
        ref={videoRef}
        src={src}
        muted={muted}
        loop
        playsInline
        preload="metadata"
        onClick={handleVideoClick}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onTimeUpdate={(e) => setProgress(e.currentTarget.currentTime)}
        className="h-full w-full cursor-pointer object-cover"
        style={{ objectPosition: `${cropX}% ${cropY}%` }}
      />

      {/* Center play indicator — shows briefly when paused */}
      {!playing && (
        <button
          onClick={togglePlay}
          aria-label="Play video"
          className="absolute inset-0 flex items-center justify-center bg-black/20 transition-opacity"
        >
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-md ring-1 ring-white/20 transition-transform hover:scale-110">
            <Play className="ml-0.5 h-6 w-6" fill="currentColor" />
          </span>
        </button>
      )}

      {/* Custom control bar — hidden until hovered (or tapped on touch) */}
      <div
        className={`absolute inset-x-0 bottom-0 flex flex-col gap-1.5 bg-gradient-to-t from-black/75 via-black/25 to-transparent px-3 pb-2 pt-6 transition-opacity duration-200 ${
          controlsVisible ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onMouseEnter={() => revealControls(false)}
      >
        {/* Scrub bar */}
        <div
          className="h-1 w-full cursor-pointer rounded-full bg-white/20"
          onClick={(e) => handleSeek(e.clientX, e.currentTarget)}
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-red-500 via-rose-400 to-amber-300"
            style={{ width: `${pct}%`, boxShadow: "0 0 6px rgba(244,63,94,0.6)" }}
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={togglePlay}
            aria-label={playing ? "Pause" : "Play"}
            className="flex h-7 w-7 items-center justify-center rounded-full text-white/90 transition-colors hover:text-white"
          >
            {playing ? <Pause className="h-4 w-4" fill="currentColor" /> : <Play className="ml-0.5 h-4 w-4" fill="currentColor" />}
          </button>

          <div
            className="flex items-center gap-1.5"
            onMouseEnter={() => setShowVolumeSlider(true)}
            onMouseLeave={() => setShowVolumeSlider(false)}
          >
            <button
              onClick={toggleMute}
              aria-label={muted ? "Unmute" : "Mute"}
              className="flex h-7 w-7 items-center justify-center rounded-full text-white/90 transition-colors hover:text-white"
            >
              {muted || volume === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={muted ? 0 : volume}
              onChange={(e) => handleVolumeChange(Number(e.target.value))}
              className={`h-1 cursor-pointer accent-red-500 transition-all duration-200 ${
                showVolumeSlider ? "w-16" : "w-10"
              }`}
              aria-label="Volume"
            />
          </div>

          <span className="ml-auto text-[10px] tabular-nums text-white/60">
            {formatTime(progress)} / {formatTime(duration)}
          </span>
        </div>
      </div>
    </div>
  );
}

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// ─── Roman numerals for chapter numbers ───
function toRoman(num: number): string {
  const map: [string, number][] = [
    ["X", 10], ["IX", 9], ["VIII", 8], ["VII", 7], ["VI", 6],
    ["V", 5], ["IV", 4], ["III", 3], ["II", 2], ["I", 1],
  ];
  let result = "";
  let remaining = num;
  for (const [letter, value] of map) {
    while (remaining >= value) {
      result += letter;
      remaining -= value;
    }
  }
  return result;
}
