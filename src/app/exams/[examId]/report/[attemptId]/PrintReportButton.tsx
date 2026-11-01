"use client";

export function PrintReportButton() {
  return (
    <button
      onClick={() => window.print()}
      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs sm:text-sm font-medium transition flex items-center gap-1.5 print:hidden"
    >
      🖨️ Print / Save as PDF
    </button>
  );
}

