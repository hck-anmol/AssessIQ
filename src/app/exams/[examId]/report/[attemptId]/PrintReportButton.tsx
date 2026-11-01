"use client";

import { Printer } from "lucide-react";

export function PrintReportButton() {
  return (
    <button
      onClick={() => window.print()}
      className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs sm:text-sm font-medium transition shadow-xs print:hidden"
    >
      <Printer className="w-4 h-4 text-slate-500" />
      <span>Print / Save as PDF</span>
    </button>
  );
}
