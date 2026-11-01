"use client";

interface Question {
  id: string;
  type: string;
  order: number;
}

interface NavigationBarProps {
  questions: Question[];
  answers: Record<string, { response: unknown }>;
  currentIndex: number;
  allowBackNav: boolean;
  onJump: (index: number) => void;
}

export function NavigationBar({
  questions,
  answers,
  currentIndex,
  allowBackNav,
  onJump,
}: NavigationBarProps) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
          Question Palette
        </h3>
        <span className="text-xs font-mono text-slate-400 font-medium">
          {currentIndex + 1} / {questions.length}
        </span>
      </div>

      <div className="grid grid-cols-5 gap-2">
        {questions.map((q, index) => {
          const answerData = answers[q.id];
          const isAnswered =
            answerData?.response != null &&
            (Array.isArray(answerData.response)
              ? (answerData.response as unknown[]).length > 0
              : answerData.response !== "");
          const isCurrent = index === currentIndex;
          const isAccessible = allowBackNav || index >= currentIndex;

          return (
            <button
              key={q.id}
              onClick={() => isAccessible && onJump(index)}
              disabled={!isAccessible}
              type="button"
              title={`Jump to Question ${index + 1}`}
              className={`w-9 h-9 rounded-lg text-xs font-mono font-medium transition-all ${
                isCurrent
                  ? "bg-blue-600 text-white font-bold ring-2 ring-blue-600 ring-offset-2 ring-offset-white shadow-xs"
                  : isAnswered
                  ? "bg-emerald-50 border border-emerald-300 text-emerald-800 font-semibold hover:bg-emerald-100/80"
                  : isAccessible
                  ? "bg-white border border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                  : "bg-slate-100 border border-slate-200/60 text-slate-400 cursor-not-allowed"
              }`}
            >
              {index + 1}
            </button>
          );
        })}
      </div>

      {/* Institutional Legend */}
      <div className="mt-5 pt-3 border-t border-slate-100 space-y-2 text-[11px] text-slate-600">
        <div className="flex items-center gap-2">
          <div className="w-3.5 h-3.5 rounded bg-blue-600" />
          <span className="font-medium text-slate-800">Current Question</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3.5 h-3.5 rounded bg-emerald-50 border border-emerald-400 text-emerald-800" />
          <span>Attempted</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3.5 h-3.5 rounded bg-white border border-slate-200" />
          <span>Unattempted</span>
        </div>
        {!allowBackNav && (
          <div className="flex items-center gap-2">
            <div className="w-3.5 h-3.5 rounded bg-slate-100 border border-slate-200/60" />
            <span className="text-slate-400">Locked (Forward Only)</span>
          </div>
        )}
      </div>
    </div>
  );
}
