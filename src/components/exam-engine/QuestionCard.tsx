"use client";

interface Question {
  id: string;
  type: string;
  content: string;
  options?: string[];
  marks: number;
}

interface QuestionCardProps {
  question: Question;
  answer: unknown;
  questionNumber: number;
  totalQuestions: number;
  onAnswer: (response: unknown) => void;
}

export function QuestionCard({
  question,
  answer,
  questionNumber,
  totalQuestions,
  onAnswer,
}: QuestionCardProps) {
  return (
    <div className="max-w-3xl mx-auto">
      {/* Question header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex-1">
          <span className="text-xs font-medium text-blue-400 uppercase tracking-wider">
            Question {questionNumber} / {totalQuestions}
          </span>
          <div className="mt-2 text-sm text-slate-400">
            <span>{question.marks} mark{question.marks !== 1 ? "s" : ""}</span>
            <span className="mx-2">·</span>
            <span className="capitalize">{question.type.replace(/_/g, " ").toLowerCase()}</span>
          </div>
        </div>
      </div>

      {/* Question content */}
      <div
        className="text-lg text-white font-medium mb-8 leading-relaxed"
        // Additional per-element protection
        onCopy={(e) => e.preventDefault()}
        onCut={(e) => e.preventDefault()}
        style={{ userSelect: "none", WebkitUserSelect: "none" }}
      >
        {question.content}
      </div>

      {/* Answer area by type */}
      {question.type === "MCQ_SINGLE" && question.options && (
        <MCQSingle options={question.options} answer={answer as number | null} onAnswer={onAnswer} />
      )}
      {question.type === "MCQ_MULTI" && question.options && (
        <MCQMulti options={question.options} answer={answer as number[] | null} onAnswer={onAnswer} />
      )}
      {question.type === "TRUE_FALSE" && (
        <TrueFalse answer={answer as boolean | null} onAnswer={onAnswer} />
      )}
      {question.type === "FILL_BLANK" && (
        <FillBlank answer={answer as string | null} onAnswer={onAnswer} />
      )}
      {question.type === "DESCRIPTIVE" && (
        <Descriptive answer={answer as string | null} onAnswer={onAnswer} />
      )}
    </div>
  );
}

// ── Sub-components ──

function MCQSingle({
  options,
  answer,
  onAnswer,
}: {
  options: string[];
  answer: number | null;
  onAnswer: (r: number) => void;
}) {
  return (
    <div className="space-y-3">
      {options.map((opt, i) => (
        <button
          key={i}
          onClick={() => onAnswer(i)}
          className={`w-full text-left px-5 py-3.5 rounded-xl border transition-all ${
            answer === i
              ? "bg-blue-500/20 border-blue-500 text-blue-200"
              : "bg-white/5 border-white/10 text-slate-300 hover:border-white/30 hover:bg-white/10"
          }`}
        >
          <span className="font-medium mr-3">{String.fromCharCode(65 + i)}.</span>
          {opt}
        </button>
      ))}
    </div>
  );
}

function MCQMulti({
  options,
  answer,
  onAnswer,
}: {
  options: string[];
  answer: number[] | null;
  onAnswer: (r: number[]) => void;
}) {
  const selected = answer ?? [];
  const toggle = (i: number) => {
    const next = selected.includes(i) ? selected.filter((x) => x !== i) : [...selected, i];
    onAnswer(next);
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-500 mb-2">Select all that apply</p>
      {options.map((opt, i) => (
        <button
          key={i}
          onClick={() => toggle(i)}
          className={`w-full text-left px-5 py-3.5 rounded-xl border transition-all ${
            selected.includes(i)
              ? "bg-blue-500/20 border-blue-500 text-blue-200"
              : "bg-white/5 border-white/10 text-slate-300 hover:border-white/30 hover:bg-white/10"
          }`}
        >
          <span
            className={`inline-flex items-center justify-center w-5 h-5 rounded mr-3 border text-xs font-bold ${
              selected.includes(i)
                ? "bg-blue-500 border-blue-500 text-white"
                : "border-slate-500"
            }`}
          >
            {selected.includes(i) ? "✓" : ""}
          </span>
          {opt}
        </button>
      ))}
    </div>
  );
}

function TrueFalse({
  answer,
  onAnswer,
}: {
  answer: boolean | null;
  onAnswer: (r: boolean) => void;
}) {
  return (
    <div className="flex gap-4">
      {([true, false] as const).map((val) => (
        <button
          key={String(val)}
          onClick={() => onAnswer(val)}
          className={`flex-1 py-4 rounded-xl border font-semibold transition-all ${
            answer === val
              ? val
                ? "bg-green-500/20 border-green-500 text-green-300"
                : "bg-red-500/20 border-red-500 text-red-300"
              : "bg-white/5 border-white/10 text-slate-300 hover:border-white/30"
          }`}
        >
          {val ? "✅ True" : "❌ False"}
        </button>
      ))}
    </div>
  );
}

function FillBlank({
  answer,
  onAnswer,
}: {
  answer: string | null;
  onAnswer: (r: string) => void;
}) {
  return (
    <input
      type="text"
      value={answer ?? ""}
      onChange={(e) => onAnswer(e.target.value)}
      onPaste={(e) => e.preventDefault()} // Block paste
      onCopy={(e) => e.preventDefault()}
      placeholder="Type your answer here..."
      autoComplete="off"
      spellCheck={false}
      className="w-full px-5 py-3.5 rounded-xl bg-white/5 border border-white/20 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-all text-lg"
    />
  );
}

function Descriptive({
  answer,
  onAnswer,
}: {
  answer: string | null;
  onAnswer: (r: string) => void;
}) {
  return (
    <div>
      <textarea
        value={answer ?? ""}
        onChange={(e) => onAnswer(e.target.value)}
        onPaste={(e) => e.preventDefault()} // Block paste
        onCopy={(e) => e.preventDefault()}
        placeholder="Write your answer here..."
        rows={8}
        autoComplete="off"
        spellCheck={false}
        className="w-full px-5 py-4 rounded-xl bg-white/5 border border-white/20 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-all resize-none leading-relaxed"
      />
      <p className="text-xs text-slate-500 mt-2 text-right">
        {(answer ?? "").length} characters
      </p>
    </div>
  );
}
