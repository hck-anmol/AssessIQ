"use client";

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-md mx-4 bg-slate-900 border border-red-500/50 rounded-2xl p-8 shadow-2xl text-white">
        {/* Icon */}
        <div className="w-16 h-16 rounded-full bg-red-500/20 border-2 border-red-500 flex items-center justify-center mx-auto mb-4">
          <span className="text-3xl">⚠️</span>
        </div>

        <h2 className="text-2xl font-bold text-center text-red-400 mb-2">
          {isLastWarning ? "Final Warning!" : "Warning!"}
        </h2>

        <p className="text-slate-300 text-center mb-2">
          A violation was detected. You have left fullscreen, switched tabs, or attempted to copy content.
        </p>

        <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 mb-6 text-center">
          <p className="text-red-300 text-sm font-medium">
            Warning {flagCount} of {maxFlags}
          </p>
          {isLastWarning && (
            <p className="text-red-400 text-sm mt-1 font-semibold">
              ⛔ Any further violations will automatically submit your exam.
            </p>
          )}
        </div>

        <button
          onClick={onDismiss}
          className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-all"
        >
          Return to Exam (Re-enter Fullscreen)
        </button>

        <p className="text-slate-500 text-xs text-center mt-4">
          This incident has been reported to your examiner.
        </p>
      </div>
    </div>
  );
}
