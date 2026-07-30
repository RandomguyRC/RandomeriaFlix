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

  return (
    <div
      className={`${fraunces.variable} ${caveat.variable} min-h-screen bg-[#0a0a0a] pb-24`}
    >
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
          our little archive of hope
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
          we're actually making real.
        </motion.p>
      </section>

      {/* Actually happening — trophy cards */}
      {actualCount > 0 && (
        <section className="mx-auto max-w-4xl px-6">
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

      {/* The corkboard */}
      <section className="mx-auto mt-16 max-w-5xl px-4 sm:px-6">
        <p
          style={{ fontFamily: "var(--font-fraunces)" }}
          className="mb-6 text-center text-lg italic text-white/90 sm:text-xl"
        >
          {data?.wantedTitle}
        </p>

        <div
          className="relative rounded-2xl border border-black/40 p-6 sm:p-10"
          style={{
            backgroundColor: "#2b1e14",
            backgroundImage:
              "radial-gradient(circle at 15% 20%, rgba(0,0,0,0.25) 0, transparent 35%), radial-gradient(circle at 85% 15%, rgba(0,0,0,0.2) 0, transparent 35%), radial-gradient(circle at 50% 90%, rgba(0,0,0,0.25) 0, transparent 40%), repeating-linear-gradient(45deg, rgba(255,255,255,0.025) 0px, rgba(255,255,255,0.025) 1px, transparent 1px, transparent 4px)",
            boxShadow:
              "inset 0 0 70px rgba(0,0,0,0.65), inset 0 0 2px rgba(255,255,255,0.05)",
          }}
        >
          {wantedCount === 0 ? (
            <p className="py-12 text-center text-sm text-white/40">
              The board is empty — plenty of room for new dreams.
            </p>
          ) : (
            <div className="flex flex-wrap justify-center gap-x-3 gap-y-6">
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
      </section>
    </div>
  );
}
