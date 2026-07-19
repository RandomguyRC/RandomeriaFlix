"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import { Clock, Flame } from "lucide-react";

export interface HoursEntry {
  id: string;
  date: string; // YYYY-MM-DD
  from: string; // HH:mm
  to: string; // HH:mm
  label?: string;
}

interface DayTotal {
  date: string;
  hours: number;
}

function toMinutes(t: string): number {
  const [h, m] = t.split(":").map((n) => parseInt(n, 10));
  if (Number.isNaN(h) || Number.isNaN(m)) return 0;
  return h * 60 + m;
}

function entryHours(e: HoursEntry): number {
  const from = toMinutes(e.from);
  let to = toMinutes(e.to);
  if (to <= from) to += 24 * 60; // overnight session
  return (to - from) / 60;
}

function formatDay(dateStr: string): { weekday: string; md: string } {
  const d = new Date(dateStr + "T00:00:00");
  if (Number.isNaN(d.getTime())) return { weekday: "", md: dateStr };
  return {
    weekday: d.toLocaleDateString(undefined, { weekday: "short" }),
    md: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
  };
}

function fmtHours(h: number): string {
  const whole = Math.floor(h);
  const mins = Math.round((h - whole) * 60);
  if (mins === 0) return `${whole}h`;
  return `${whole}h ${mins}m`;
}

// Animated count-up, eases toward the target value on mount.
function useCountUp(target: number, durationMs = 1400) {
  const [value, setValue] = useState(0);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    let raf: number;
    function tick(ts: number) {
      if (startRef.current === null) startRef.current = ts;
      const elapsed = ts - startRef.current;
      const t = Math.min(1, elapsed / durationMs);
      const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
      setValue(target * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs]);

  return value;
}

export default function HoursImpactPanel({ entries }: { entries: HoursEntry[] }) {
  const days: DayTotal[] = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of entries) {
      const h = entryHours(e);
      if (!h || h <= 0) continue;
      map.set(e.date, (map.get(e.date) || 0) + h);
    }
    return Array.from(map.entries())
      .map(([date, hours]) => ({ date, hours }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [entries]);

  const totalHours = useMemo(() => days.reduce((s, d) => s + d.hours, 0), [days]);
  const maxDay = useMemo(() => Math.max(1, ...days.map((d) => d.hours)), [days]);
  const animatedTotal = useCountUp(totalHours);

  if (days.length === 0) return null;

  const wholeHrs = Math.floor(animatedTotal);
  const mins = Math.round((animatedTotal - wholeHrs) * 60);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.15 }}
      className="mt-5 overflow-hidden rounded-2xl border border-red-500/15 bg-gradient-to-b from-red-500/[0.06] via-white/[0.02] to-transparent p-4"
    >
      <div className="mb-3 flex items-center gap-2">
        <Flame className="h-3.5 w-3.5 text-amber-400" />
        <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-amber-300/80">
          Before you decide
        </p>
      </div>

      {/* Big animated total */}
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <div
            className="flex items-baseline gap-1.5 font-serif text-3xl font-medium text-white tabular-nums sm:text-4xl"
            style={{ textShadow: "0 2px 20px rgba(244,63,94,0.25)" }}
          >
            <span>{wholeHrs}</span>
            <span className="text-lg text-gray-400">h</span>
            <span>{mins}</span>
            <span className="text-lg text-gray-400">m</span>
          </div>
          <p className="mt-1 text-[11px] leading-snug text-gray-400">
            spent building this, across{" "}
            <span className="text-gray-300">
              {days.length} day{days.length === 1 ? "" : "s"}
            </span>
          </p>
        </div>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-500/10 ring-1 ring-red-500/20">
          <Clock className="h-4 w-4 text-red-300" />
        </div>
      </div>

      {/* Per-day bars — scrolls internally once there are more than a
          handful of days, so the dialog itself never overflows the screen */}
      <div className="relative">
        <div
          className="space-y-1.5 overflow-y-auto pr-1"
          style={{
            maxHeight: days.length > 6 ? "168px" : "none",
            scrollbarWidth: "thin",
            scrollbarColor: "rgba(244,63,94,0.35) transparent",
          }}
        >
          {days.map((d, i) => {
            const pct = Math.max(6, (d.hours / maxDay) * 100);
            const { weekday, md } = formatDay(d.date);
            return (
              <div key={d.date} className="flex items-center gap-2.5">
                <div className="w-11 shrink-0 text-right">
                  <div className="text-[10px] leading-tight text-gray-500">{weekday}</div>
                  <div className="text-[10px] leading-tight text-gray-400">{md}</div>
                </div>
                <div className="relative h-4 flex-1 overflow-hidden rounded-full bg-white/[0.04]">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.9, delay: 0.25 + Math.min(i, 10) * 0.06, ease: [0.16, 1, 0.3, 1] }}
                    className="h-full rounded-full bg-gradient-to-r from-red-500/80 to-rose-400/80"
                    style={{ boxShadow: "0 0 12px rgba(244,63,94,0.35)" }}
                  />
                </div>
                <div className="w-12 shrink-0 text-[10px] text-gray-400 tabular-nums">
                  {fmtHours(d.hours)}
                </div>
              </div>
            );
          })}
        </div>
        {/* fade hint at the bottom edge when the list is scrollable */}
        {days.length > 6 && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-5 bg-gradient-to-t from-[#0b0e14] to-transparent" />
        )}
      </div>

      {days.length > 6 && (
        <p className="mt-1.5 text-center text-[9px] uppercase tracking-wider text-gray-600">
          scroll for more · {days.length} days total
        </p>
      )}

      <p className="mt-3.5 text-center font-serif text-[12px] italic leading-relaxed text-gray-400">
        Every one of those hours was a choice to keep showing up for you.
      </p>
    </motion.div>
  );
}
