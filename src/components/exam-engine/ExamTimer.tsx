"use client";

import { formatCountdown } from "@/lib/utils";

interface ExamTimerProps {
  remainingSeconds: number;
}

export function ExamTimer({ remainingSeconds }: ExamTimerProps) {
  const isWarning = remainingSeconds <= 300; // last 5 min
  const isDanger = remainingSeconds <= 60; // last 1 min

  return (
    <div
      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-mono font-semibold text-sm transition-all ${
        isDanger
          ? "bg-red-500/20 border border-red-500/60 text-red-300 animate-pulse"
          : isWarning
          ? "bg-amber-500/20 border border-amber-500/40 text-amber-300"
          : "bg-slate-800 border border-slate-700 text-slate-200"
      }`}
    >
      <span>{isDanger ? "🔴" : isWarning ? "🟡" : "⏱"}</span>
      <span>{formatCountdown(remainingSeconds)}</span>
    </div>
  );
}
