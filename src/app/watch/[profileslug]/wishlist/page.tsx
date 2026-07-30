"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { motion } from "motion/react";
import { Fraunces, Caveat } from "next/font/google";
import { Flame, Pin } from "lucide-react";

const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["500", "600"],
  style: ["normal", "italic"],
  variable: "--font-fraunces",
});

const caveat = Caveat({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-caveat",
});

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

const NOTE_PALETTE = [
  { bg: "#f2c9ce", text: "#4a2229", tape: "#e8b6bd" },
  { bg: "#f3e2a0", text: "#463c14", tape: "#e6d183" },
  { bg: "#bcd9ea", text: "#1c2f3a", tape: "#a3c6db" },
  { bg: "#cfe0be", text: "#263420", tape: "#b6cfa0" },
  { bg: "#dcc9ec", text: "#2c2038", tape: "#c8aee0" },
  { bg: "#f0cba4", text: "#402a10", tape: "#e3b287" },
];

// Deterministic hash so notes don't reshuffle position/rotation/color on re-render
function hash(n: number) {
  let h = (n + 1) * 2654435761;
  h = ((h >>> 16) ^ h) * 0x45d9f3b;
  h = ((h >>> 16) ^ h) * 0x45d9f3b;
  h = (h >>> 16) ^ h;
  return (h & 0x7fffffff) / 0x7fffffff;
}

// Subtle fractal-noise grain, reused for the page backdrop and the wood board
const GRAIN_SVG = `data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' width='300' height='300'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix type='matrix' values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.5 0'/></filter><rect width='100%' height='100%' filter='url(#n)'/></svg>`
)}`;

// Long, irregular vertical wood-grain streaks (feTurbulence stretched on one axis)
const WOOD_GRAIN_SVG = `data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' width='400' height='400'><filter id='w'><feTurbulence type='fractalNoise' baseFrequency='0.008 0.09' numOctaves='4' seed='7' stitchTiles='stitch'/><feColorMatrix type='matrix' values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.6 0'/></filter><rect width='100%' height='100%' filter='url(#w)'/></svg>`
)}`;

function useCountUp(target: number, durationMs = 1200) {
  const [value, setValue] = useState(0);
  const startRef = useRef<number | null>(null);
  useEffect(() => {
    startRef.current = null;
    let raf: number;
    const step = (t: number) => {
      if (startRef.current === null) startRef.current = t;
      const progress = Math.min(1, (t - startRef.current) / durationMs);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));
      if (progress < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs]);
  return value;
}

export default function WishlistPage() {
  const [data, setData] = useState<WishlistData | null>(null);

  useEffect(() => {
    fetch("/api/wishlist")
      .then((r) => (r.ok ? r.json() : null))
      .then(setData)
      .catch(() => setData(null));
  }, []);

  const wantedCount = data?.wanted.length ?? 0;
  const actualCount = data?.actual.length ?? 0;
  const wantedCountUp = useCountUp(wantedCount);
  const actualCountUp = useCountUp(actualCount);

  const notes = useMemo(() => {
    if (!data) return [];
    return data.wanted.map((item, i) => {
      const r1 = hash(i * 3 + 1);
      const r2 = hash(i * 3 + 2);
      const r3 = hash(i * 3 + 3);
      return {
        ...item,
        rotate: (r1 - 0.5) * 12, // -6deg .. 6deg
        palette: NOTE_PALETTE[Math.floor(r2 * NOTE_PALETTE.length)],
        useTape: r3 > 0.5,
      };
    });
  }, [data]);

  // Fixed, deterministic knot placements for the wood board (purely decorative)
  const knots = useMemo(
    () =>
      Array.from({ length: 5 }, (_, i) => {
        const kx = hash(i * 7 + 11) * 90 + 5;
        const ky = hash(i * 11 + 5) * 80 + 10;
        const kr = hash(i * 13 + 3) * 10 + 8;
        return { x: kx, y: ky, r: kr };
      }),
    []
  );

  return (
    <div
      className={`${fraunces.variable} ${caveat.variable} min-h-screen pb-24`}
      style={{
        background:
          "radial-gradient(ellipse 70% 45% at 50% -8%, rgba(229,9,63,0.10), transparent 60%), radial-gradient(ellipse 55% 35% at 12% 20%, rgba(232,178,58,0.045), transparent 60%), radial-gradient(ellipse 60% 40% at 90% 60%, rgba(120,90,50,0.05), transparent 65%), linear-gradient(180deg, #15100d 0%, #100c0a 45%, #0b0908 100%)",
      }}
    >
      {/* Faint room grain so the backdrop doesn't read as flat black */}
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.05] mix-blend-overlay"
        style={{ backgroundImage: `url("${GRAIN_SVG}")`, backgroundSize: "300px 300px" }}
      />
      {/* Hero */}
      <section className="relative overflow-hidden px-6 pb-14 pt-16 text-center sm:pt-24">
        <div
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{
            background:
              "radial-gradient(circle at 50% 0%, rgba(229,9,63,0.12), transparent 55%)",
          }}
        />
        <motion.p
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative text-xs font-semibold uppercase tracking-[0.35em] text-[#e8b23a]"
        >
          my little archive of hope
        </motion.p>
        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          style={{ fontFamily: "var(--font-fraunces)" }}
          className="relative mt-3 text-4xl italic text-white sm:text-6xl"
        >
          The Bucket List
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="relative mx-auto mt-5 max-w-md text-sm text-gray-400 sm:text-base"
        >
          <span className="font-semibold text-white">{wantedCountUp}</span> things I
          keep dreaming about, and{" "}
          <span className="font-semibold text-[#e5093f]">{actualCountUp}</span>{" "}
          thats actually turning into my reality...
        </motion.p>
      </section>

      {/* The corkboard — everything dreamt of */}
      <section className="mx-auto max-w-5xl px-4 sm:px-6">
        <p
          style={{ fontFamily: "var(--font-fraunces)" }}
          className="mb-6 text-center text-lg italic text-white/90 sm:text-xl"
        >
          {data?.wantedTitle}
        </p>

        {/* Outer frame — sits proud of the wall with its own cast shadow */}
        <div
          className="relative rounded-xl p-2 sm:p-3"
          style={{
            background: "linear-gradient(155deg, #5a3d24 0%, #3c2716 45%, #2a1a0e 100%)",
            boxShadow:
              "0 22px 45px -18px rgba(0,0,0,0.75), 0 2px 0 rgba(255,255,255,0.06) inset, 0 -3px 6px rgba(0,0,0,0.5) inset",
          }}
        >
          <div
            className="relative overflow-hidden rounded-md p-6 sm:p-10"
            style={{
              backgroundColor: "#4a3320",
              backgroundImage: [
                // warm top-lit gradient so the board reads as lit from above, not flat
                "linear-gradient(180deg, rgba(255,214,150,0.10) 0%, rgba(0,0,0,0) 30%, rgba(0,0,0,0.12) 75%, rgba(0,0,0,0.35) 100%)",
                // vertical plank seams
                "repeating-linear-gradient(90deg, rgba(0,0,0,0.32) 0px, rgba(0,0,0,0.32) 2px, rgba(255,255,255,0.05) 2px, rgba(255,255,255,0.05) 3px, transparent 3px, transparent 152px)",
                // organic vertical wood-grain streaks
                `url("${WOOD_GRAIN_SVG}")`,
                // fine surface grain
                `url("${GRAIN_SVG}")`,
                // soft corner vignette
                "radial-gradient(ellipse 90% 70% at 50% 50%, transparent 55%, rgba(0,0,0,0.45) 100%)",
              ].join(", "),
              backgroundSize: "auto, auto, 400px 400px, 300px 300px, auto",
              backgroundBlendMode: "normal, multiply, overlay, overlay, normal",
              boxShadow:
                "inset 0 0 90px rgba(0,0,0,0.6), inset 0 2px 3px rgba(0,0,0,0.5)",
            }}
          >
            {/* Knots — a few irregular dark rings scattered across the boards */}
            {knots.map((k, i) => (
              <span
                key={i}
                className="pointer-events-none absolute rounded-full opacity-70"
                style={{
                  left: `${k.x}%`,
                  top: `${k.y}%`,
                  width: k.r,
                  height: k.r * 1.4,
                  background:
                    "radial-gradient(ellipse at center, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.25) 55%, transparent 75%)",
                  transform: "translate(-50%, -50%)",
                }}
              />
            ))}

            {wantedCount === 0 ? (
              <p className="relative py-12 text-center text-sm text-white/50">
                The board is empty — plenty of room for new dreams.
              </p>
            ) : (
              <div className="relative flex flex-wrap justify-center gap-x-3 gap-y-6">
              {notes.map((note, i) => (
                <motion.div
                  key={note.id}
                  initial={{ opacity: 0, scale: 0.85 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true, margin: "0px 0px -40px 0px" }}
                  transition={{ duration: 0.35, delay: (i % 12) * 0.03 }}
                  whileHover={{ rotate: 0, scale: 1.05, zIndex: 20 }}
                  style={{ rotate: note.rotate }}
                  className="relative w-36 select-none sm:w-40"
                >
                  <div
                    className="relative px-3 pb-4 pt-5 shadow-[0_6px_14px_rgba(0,0,0,0.45)]"
                    style={{ backgroundColor: note.palette.bg }}
                  >
                    {note.useTape ? (
                      <span
                        className="absolute -top-2.5 left-1/2 h-5 w-14 -translate-x-1/2 -rotate-2 opacity-80"
                        style={{
                          backgroundColor: note.palette.tape,
                          boxShadow: "0 1px 2px rgba(0,0,0,0.25)",
                        }}
                      />
                    ) : (
                      <span className="absolute -top-2 left-1/2 -translate-x-1/2">
                        <Pin
                          className="h-4 w-4 drop-shadow-[0_2px_2px_rgba(0,0,0,0.5)]"
                          style={{ color: "#e8b23a", fill: "#e8b23a" }}
                        />
                      </span>
                    )}
                    <p
                      style={{ fontFamily: "var(--font-caveat)", color: note.palette.text }}
                      className="text-xl font-semibold leading-tight sm:text-2xl"
                    >
                      {note.text}
                    </p>
                  </div>
                </motion.div>
              ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Actually happening — trophy cards */}
      {actualCount > 0 && (
        <section className="mx-auto mt-16 max-w-4xl px-6">
          <p
            style={{ fontFamily: "var(--font-fraunces)" }}
            className="mb-6 text-center text-lg italic text-white/90 sm:text-xl"
          >
            {data?.actualTitle}
          </p>
          <div className="flex flex-wrap justify-center gap-6">
            {data?.actual.map((item, i) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20, rotate: (i % 2 === 0 ? -1 : 1) * 3 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                whileHover={{ y: -4, rotate: 0 }}
                className="relative w-full max-w-xs rounded-lg border border-[#e5093f]/40 bg-gradient-to-b from-[#2a0a10] to-[#160608] p-6 text-center shadow-[0_0_35px_-8px_rgba(229,9,63,0.55)]"
                style={{ rotate: (i % 2 === 0 ? -2 : 2) }}
              >
                <motion.div
                  animate={{ opacity: [0.6, 1, 0.6], scale: [1, 1.08, 1] }}
                  transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
                  className="mx-auto mb-3 flex h-9 w-9 items-center justify-center rounded-full bg-[#e5093f]/15"
                >
                  <Flame className="h-4 w-4 text-[#e5093f]" />
                </motion.div>
                <p
                  style={{ fontFamily: "var(--font-caveat)" }}
                  className="text-2xl font-semibold leading-snug text-white sm:text-3xl"
                >
                  {item.text}
                </p>
              </motion.div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
