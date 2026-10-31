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
    <div>
      <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
        Questions
      </h3>
      <div className="grid grid-cols-5 gap-1.5">
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
              title={`Question ${index + 1}`}
              className={`w-9 h-9 rounded-lg text-xs font-medium transition-all ${
                isCurrent
                  ? "bg-blue-500 text-white ring-2 ring-blue-400"
                  : isAnswered
                  ? "bg-green-600/60 text-green-200 hover:bg-green-600"
                  : isAccessible
                  ? "bg-slate-700 text-slate-300 hover:bg-slate-600"
                  : "bg-slate-800 text-slate-600 cursor-not-allowed"
              }`}
            >
              {index + 1}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-4 space-y-1.5 text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-blue-500" /> Current
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-green-600/60" /> Answered
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-slate-700" /> Not answered
        </div>
        {!allowBackNav && (
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-slate-800" /> Locked
          </div>
        )}
      </div>
    </div>
  );
}
