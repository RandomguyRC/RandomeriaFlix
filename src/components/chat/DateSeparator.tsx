"use client";

export default function DateSeparator({ date }: { date: string }) {
  return (
    <div className="flex items-center gap-4 py-4">
      <div className="h-px flex-1 bg-white/[0.06]" />
      <span className="rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-1 text-[11px] font-medium text-gray-400 backdrop-blur-sm shadow-sm">
        {date}
      </span>
      <div className="h-px flex-1 bg-white/[0.06]" />
    </div>
  );
}
