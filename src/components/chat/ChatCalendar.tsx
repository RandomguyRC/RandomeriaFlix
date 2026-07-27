"use client";

import { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import { ChevronLeft, ChevronRight, X, CalendarDays } from "lucide-react";

interface ChatCalendarProps {
  activeDates: string[];
  onSelectDate: (date: string) => void;
  onClose: () => void;
}

// Parse DD/MM/YY to Date
function parseDate(dateStr: string): Date | null {
  const parts = dateStr.split("/");
  if (parts.length !== 3) return null;
  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  let year = parseInt(parts[2], 10);
  if (year < 100) year += 2000;
  return new Date(year, month, day);
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default function ChatCalendar({ activeDates, onSelectDate, onClose }: ChatCalendarProps) {
  // Every month that actually has messages, newest first.
  const monthYears = useMemo(() => {
    const my = new Map<string, Date>();
    for (const d of activeDates) {
      const parsed = parseDate(d);
      if (parsed) {
        const key = `${parsed.getFullYear()}-${parsed.getMonth()}`;
        if (!my.has(key)) my.set(key, parsed);
      }
    }
    return Array.from(my.values()).sort((a, b) => b.getTime() - a.getTime());
  }, [activeDates]);

  const oldestMonth = monthYears[monthYears.length - 1] ?? null;
  const newestMonth = monthYears[0] ?? null;
  const yearsWithMessages = useMemo(() => {
    const years = new Set<number>();
    monthYears.forEach((d) => years.add(d.getFullYear()));
    return Array.from(years).sort((a, b) => b - a);
  }, [monthYears]);

  const [currentMonth, setCurrentMonth] = useState(() => newestMonth || new Date());

  useEffect(() => {
    if (newestMonth) setCurrentMonth(newestMonth);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthYears.length]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const days: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);

  function dateKey(day: number) {
    return `${String(day).padStart(2, "0")}/${String(month + 1).padStart(2, "0")}/${String(year).slice(-2)}`;
  }

  function hasMessages(day: number): boolean {
    return activeDates.includes(dateKey(day));
  }

  const today = new Date();
  const isCurrentMonthReal = today.getFullYear() === year && today.getMonth() === month;

  function goToPrevMonth() {
    setCurrentMonth(new Date(year, month - 1, 1));
  }
  function goToNextMonth() {
    setCurrentMonth(new Date(year, month + 1, 1));
  }
  function goToMonth(m: number) {
    setCurrentMonth(new Date(year, m, 1));
  }
  function goToYear(y: number) {
    setCurrentMonth(new Date(y, month, 1));
  }

  function canGoPrev(): boolean {
    if (!oldestMonth) return false;
    return year > oldestMonth.getFullYear() || (year === oldestMonth.getFullYear() && month > oldestMonth.getMonth());
  }
  function canGoNext(): boolean {
    if (!newestMonth) return false;
    return year < newestMonth.getFullYear() || (year === newestMonth.getFullYear() && month < newestMonth.getMonth());
  }

  return createPortal(
    <AnimatePresence>
      <motion.div
        key="calendar-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <motion.div
          key="calendar-panel"
          initial={{ opacity: 0, y: 12, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.96 }}
          transition={{ type: "spring", damping: 24, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-[360px] overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-[#1a2329] to-[#101619] shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-emerald-400" />
              <span className="text-sm font-semibold text-white">Jump to date</span>
            </div>
            <button
              onClick={onClose}
              className="rounded-full p-1.5 text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
              aria-label="Close calendar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="p-5">
            {monthYears.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-400">No dated messages found yet.</p>
            ) : (
              <>
                {/* Month / year controls */}
                <div className="mb-4 flex items-center justify-between gap-2">
                  <button
                    onClick={goToPrevMonth}
                    disabled={!canGoPrev()}
                    className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-20 disabled:hover:bg-transparent"
                    aria-label="Previous month"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>

                  <div className="flex flex-1 items-center justify-center gap-1.5">
                    <select
                      value={month}
                      onChange={(e) => goToMonth(Number(e.target.value))}
                      className="rounded-lg border-none bg-white/[0.06] px-2 py-1.5 text-sm font-medium text-white focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                    >
                      {MONTH_NAMES.map((name, i) => (
                        <option key={name} value={i} className="bg-[#1a2329] text-white">
                          {name}
                        </option>
                      ))}
                    </select>
                    <select
                      value={year}
                      onChange={(e) => goToYear(Number(e.target.value))}
                      className="rounded-lg border-none bg-white/[0.06] px-2 py-1.5 text-sm font-medium text-white focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                    >
                      {yearsWithMessages.map((y) => (
                        <option key={y} value={y} className="bg-[#1a2329] text-white">
                          {y}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    onClick={goToNextMonth}
                    disabled={!canGoNext()}
                    className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-20 disabled:hover:bg-transparent"
                    aria-label="Next month"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>

                {/* Day-of-week headers */}
                <div className="mb-1.5 grid grid-cols-7">
                  {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                    <div key={`day-${i}`} className="text-center text-[11px] font-medium uppercase tracking-wide text-gray-500">
                      {d}
                    </div>
                  ))}
                </div>

                {/* Calendar grid */}
                <div className="grid grid-cols-7 gap-y-1">
                  {days.map((day, i) => {
                    if (day === null) return <div key={`empty-${i}`} />;
                    const hasMsg = hasMessages(day);
                    const isToday = isCurrentMonthReal && today.getDate() === day;
                    return (
                      <div key={`day-${day}`} className="flex items-center justify-center py-0.5">
                        <button
                          onClick={() => {
                            if (hasMsg) {
                              onSelectDate(dateKey(day));
                              onClose();
                            }
                          }}
                          disabled={!hasMsg}
                          className={`relative flex h-9 w-9 items-center justify-center rounded-full text-[13px] font-medium transition-all ${
                            hasMsg
                              ? "cursor-pointer bg-emerald-600/20 text-white hover:scale-105 hover:bg-emerald-500/40 active:scale-95"
                              : "cursor-default text-gray-600"
                          } ${isToday ? "ring-1 ring-emerald-400/70" : ""}`}
                        >
                          {day}
                        </button>
                      </div>
                    );
                  })}
                </div>

                <p className="mt-4 text-center text-[11px] text-gray-500">
                  Highlighted days have messages — tap one to jump there
                </p>
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}
