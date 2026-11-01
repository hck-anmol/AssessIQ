"use client";

import { formatCountdown } from "@/lib/utils";
import { Clock, AlertTriangle } from "lucide-react";

interface ExamTimerProps {
  remainingSeconds: number;
}

export function ExamTimer({ remainingSeconds }: ExamTimerProps) {
  const isWarning = remainingSeconds <= 300; // last 5 min
  const isDanger = remainingSeconds <= 60; // last 1 min

  return (
    <div
      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-mono font-semibold text-xs sm:text-sm border transition-all ${
        isDanger
          ? "bg-rose-50 border-rose-300 text-rose-700 shadow-xs animate-pulse"
          : isWarning
          ? "bg-amber-50 border-amber-300 text-amber-800 shadow-xs"
          : "bg-white border-slate-200 text-slate-800 shadow-2xs"
      }`}
    >
      {isDanger || isWarning ? (
        <AlertTriangle className={`w-3.5 h-3.5 ${isDanger ? "text-rose-600" : "text-amber-600"}`} />
      ) : (
        <Clock className="w-3.5 h-3.5 text-slate-500" />
      )}
      <span className="tracking-wider">{formatCountdown(remainingSeconds)}</span>
    </div>
  );
}
