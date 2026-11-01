"use client";

import { AlertTriangle, ShieldAlert, Maximize2 } from "lucide-react";

interface ViolationModalProps {
  open: boolean;
  flagCount: number;
  maxFlags: number;
  onDismiss: () => void;
}

export function ViolationModal({ open, flagCount, maxFlags, onDismiss }: ViolationModalProps) {
  if (!open) return null;

  const isLastWarning = flagCount >= maxFlags;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-white border border-rose-300 rounded-2xl p-6 sm:p-8 shadow-2xl text-slate-900 animate-in fade-in-50 zoom-in-95 duration-200">
        {/* Warning Icon Badge */}
        <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center mx-auto mb-4 text-rose-600 shadow-2xs">
          <AlertTriangle className="w-7 h-7" />
        </div>

        <h2 className="text-xl font-bold text-center text-slate-900 mb-1">
          {isLastWarning ? "Final Warning: Disqualification Notice" : "Integrity Breach Detected"}
        </h2>

        <p className="text-slate-600 text-center text-sm mb-4 leading-relaxed">
          The proctoring system detected an unauthorized action (exiting fullscreen, tab switching, or clipboard interaction).
        </p>

        {/* Warning Status Counter */}
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 mb-6 text-center">
          <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-rose-700 mb-1">
            <ShieldAlert className="w-4 h-4" />
            <span>Infraction Level</span>
          </div>
          <p className="text-rose-900 text-base font-bold">
            Flag {flagCount} of {maxFlags} Permitted
          </p>
          {isLastWarning && (
            <p className="text-rose-700 text-xs mt-1.5 font-semibold leading-normal">
              Any subsequent infraction will immediately disqualify and auto-submit this assessment.
            </p>
          )}
        </div>

        <button
          onClick={onDismiss}
          className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition shadow-sm flex items-center justify-center gap-2"
        >
          <Maximize2 className="w-4 h-4" />
          <span>Acknowledge & Resume Assessment</span>
        </button>

        <p className="text-slate-600 text-[11px] text-center mt-4">
          This security event timestamp has been appended to the proctoring audit log.
        </p>
      </div>
    </div>
  );
}
