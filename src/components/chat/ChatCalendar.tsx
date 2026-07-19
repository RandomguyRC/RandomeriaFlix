"use client";

import { useState, useMemo, useEffect } from "react";
import { motion } from "motion/react";
import { ChevronLeft, ChevronRight } from "lucide-react";

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

// Format Date to DD/MM/YY
function formatDate(d: Date): string {
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = String(d.getFullYear()).slice(-2);
  return `${day}/${month}/${year}`;
}

function getMonthName(m: number): string {
  return ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"][m];
}

export default function ChatCalendar({ activeDates, onSelectDate, onClose }: ChatCalendarProps) {
  // Determine which months to show based on active dates
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

  const [currentMonth, setCurrentMonth] = useState(() => monthYears[0] || new Date());
  const [showYearPicker, setShowYearPicker] = useState(false);

  useEffect(() => {
    if (monthYears.length > 0) setCurrentMonth(monthYears[0]);
  }, [monthYears.length]);

  // Build calendar grid for current month
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const days: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);

  // Check which dates in this month have messages
  function dateKey(day: number) {
    return `${String(day).padStart(2, "0")}/${String(month + 1).padStart(2, "0")}/${String(year).slice(-2)}`;
  }

  function hasMessages(day: number): boolean {
    return activeDates.includes(dateKey(day));
  }

  function goToPrevMonth() {
    setCurrentMonth(new Date(year, month - 1, 1));
  }

  function goToNextMonth() {
    setCurrentMonth(new Date(year, month + 1, 1));
  }

  function canGoPrev(): boolean {
    if (monthYears.length === 0) return false;
    const oldest = monthYears[monthYears.length - 1];
    return currentMonth > oldest;
  }

  function canGoNext(): boolean {
    if (monthYears.length === 0) return false;
    const newest = monthYears[0];
    return currentMonth < newest;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -8, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.95 }}
      transition={{ type: "spring", damping: 20, stiffness: 250 }}
      onClick={(e) => e.stopPropagation()}
      className="absolute right-0 top-full z-30 mt-2 w-[88vw] max-w-72 rounded-2xl border border-gray-800 bg-gray-900 p-4 shadow-2xl sm:p-5"
    >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <button onClick={goToPrevMonth} disabled={!canGoPrev()}
            className="rounded-lg p-2 text-gray-400 hover:text-white disabled:opacity-20">
            <ChevronLeft className="h-5 w-5" />
          </button>
          {showYearPicker ? (
            <div className="flex gap-2">
              <button onClick={() => setCurrentMonth(new Date(year - 1, month, 1))}
                className="rounded-lg bg-gray-800 px-3 py-1 text-sm text-gray-300 hover:bg-gray-700">
                {year - 1}
              </button>
              <span className="flex items-center text-sm font-semibold text-white">{year}</span>
              <button onClick={() => setCurrentMonth(new Date(year + 1, month, 1))}
                className="rounded-lg bg-gray-800 px-3 py-1 text-sm text-gray-300 hover:bg-gray-700">
                {year + 1}
              </button>
            </div>
          ) : (
            <button onClick={() => setShowYearPicker(true)}
              className="text-base font-semibold text-white hover:text-gray-300 transition-colors">
              {getMonthName(month)} {year}
            </button>
          )}
          <button onClick={goToNextMonth} disabled={!canGoNext()}
            className="rounded-lg p-2 text-gray-400 hover:text-white disabled:opacity-20">
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d, i) => (
            <div key={`day-${i}`} className="text-center text-[10px] font-medium text-gray-500">{d}</div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {days.map((day, i) => {
            if (day === null) return <div key={`empty-${i}`} />;
            const hasMsg = hasMessages(day);
            return (
              <button
                key={`day-${day}`}
                onClick={() => {
                  if (hasMsg) {
                    onSelectDate(dateKey(day));
                    onClose();
                  }
                }}
                disabled={!hasMsg}
                className={`relative flex h-8 w-8 items-center justify-center rounded-lg text-xs font-medium transition-colors ${
                  hasMsg
                    ? "bg-red-900/40 text-white hover:bg-red-800/60 cursor-pointer"
                    : "text-gray-600 cursor-default"
                }`}
              >
                {day}
                {hasMsg && (
                  <span className="absolute bottom-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-red-500" />
                )}
              </button>
            );
          })}
        </div>
      </motion.div>
  );
}
