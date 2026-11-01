"use client";

import { Check, X, HelpCircle } from "lucide-react";

interface Question {
  id: string;
  type: string;
  content: string;
  options?: string[];
  marks: number;
  isRevised?: boolean;
  revisionNotice?: string | null;
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
    <div className="max-w-3xl mx-auto bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xs">
      {/* Question Meta Header */}
      <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold uppercase tracking-wider bg-blue-50 border border-blue-200 text-blue-700 font-mono">
            Question {questionNumber} / {totalQuestions}
          </span>
          <span className="text-xs font-medium text-slate-600 capitalize px-2 py-0.5 rounded bg-slate-100 border border-slate-200">
            {question.type.replace(/_/g, " ").toLowerCase()}
          </span>
        </div>

        <div className="text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 px-3 py-1 rounded-md">
          {question.marks} mark{question.marks !== 1 ? "s" : ""}
        </div>
      </div>

      {/* Revision Notice Banner */}
      {question.isRevised && (
        <div className="mb-5 p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs flex items-start gap-2.5">
          <HelpCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
          <div>
            <span className="font-bold">Revised by Examiner:</span>{" "}
            <span>{question.revisionNotice || "This item was updated for clarity during the exam session."}</span>
          </div>
        </div>
      )}

      {/* Question Prompt */}
      <div
        className="text-base sm:text-lg text-slate-900 font-medium mb-8 leading-relaxed select-none"
        onCopy={(e) => e.preventDefault()}
        onCut={(e) => e.preventDefault()}
        style={{ userSelect: "none", WebkitUserSelect: "none" }}
      >
        {question.content}
      </div>

      {/* Answer Region by Type */}
      <div className="space-y-4">
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
    <div className="space-y-2.5">
      {options.map((opt, i) => {
        const isSelected = answer === i;
        const letter = String.fromCharCode(65 + i);

        return (
          <button
            key={i}
            onClick={() => onAnswer(i)}
            type="button"
            className={`w-full text-left px-4 py-3.5 rounded-xl border transition-all flex items-center gap-3.5 group ${
              isSelected
                ? "bg-blue-50/70 border-blue-600 text-blue-950 font-medium shadow-2xs ring-1 ring-blue-500/20"
                : "bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50/60"
            }`}
          >
            <div
              className={`w-7 h-7 rounded-lg text-xs font-bold font-mono flex items-center justify-center flex-shrink-0 transition-all ${
                isSelected
                  ? "bg-blue-600 text-white"
                  : "bg-slate-100 border border-slate-200 text-slate-600 group-hover:border-slate-300"
              }`}
            >
              {letter}
            </div>
            <span className="text-sm leading-normal flex-1">{opt}</span>
          </button>
        );
      })}
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
    <div className="space-y-2.5">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
        Select all options that apply
      </p>
      {options.map((opt, i) => {
        const isSelected = selected.includes(i);
        const letter = String.fromCharCode(65 + i);

        return (
          <button
            key={i}
            onClick={() => toggle(i)}
            type="button"
            className={`w-full text-left px-4 py-3.5 rounded-xl border transition-all flex items-center gap-3.5 group ${
              isSelected
                ? "bg-blue-50/70 border-blue-600 text-blue-950 font-medium shadow-2xs ring-1 ring-blue-500/20"
                : "bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50/60"
            }`}
          >
            <div
              className={`w-5 h-5 rounded text-xs flex items-center justify-center flex-shrink-0 border transition-all ${
                isSelected
                  ? "bg-blue-600 border-blue-600 text-white"
                  : "bg-white border-slate-300 text-transparent"
              }`}
            >
              <Check className="w-3.5 h-3.5 stroke-[3]" />
            </div>
            <span className="font-mono text-xs font-bold text-slate-500">{letter}.</span>
            <span className="text-sm leading-normal flex-1">{opt}</span>
          </button>
        );
      })}
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
    <div className="grid grid-cols-2 gap-4">
      <button
        type="button"
        onClick={() => onAnswer(true)}
        className={`py-4 px-6 rounded-xl border font-semibold text-sm transition-all flex items-center justify-center gap-2.5 ${
          answer === true
            ? "bg-emerald-50 border-emerald-500 text-emerald-800 ring-1 ring-emerald-500/20 shadow-2xs"
            : "bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50"
        }`}
      >
        <div
          className={`w-6 h-6 rounded-full flex items-center justify-center ${
            answer === true ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-500"
          }`}
        >
          <Check className="w-3.5 h-3.5 stroke-[3]" />
        </div>
        <span>True</span>
      </button>

      <button
        type="button"
        onClick={() => onAnswer(false)}
        className={`py-4 px-6 rounded-xl border font-semibold text-sm transition-all flex items-center justify-center gap-2.5 ${
          answer === false
            ? "bg-rose-50 border-rose-500 text-rose-800 ring-1 ring-rose-500/20 shadow-2xs"
            : "bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50"
        }`}
      >
        <div
          className={`w-6 h-6 rounded-full flex items-center justify-center ${
            answer === false ? "bg-rose-600 text-white" : "bg-slate-100 text-slate-500"
          }`}
        >
          <X className="w-3.5 h-3.5 stroke-[3]" />
        </div>
        <span>False</span>
      </button>
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
    <div>
      <input
        type="text"
        value={answer ?? ""}
        onChange={(e) => onAnswer(e.target.value)}
        onPaste={(e) => e.preventDefault()}
        onCopy={(e) => e.preventDefault()}
        placeholder="Type candidate response here..."
        autoComplete="off"
        spellCheck={false}
        className="w-full px-4 py-3.5 rounded-xl bg-white border border-slate-300 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition text-sm font-medium"
      />
      <p className="text-[11px] text-slate-600 mt-2">
        Clipboard operations are restricted. Type your direct answer into the field.
      </p>
    </div>
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
        onPaste={(e) => e.preventDefault()}
        onCopy={(e) => e.preventDefault()}
        placeholder="Compose complete response..."
        rows={8}
        autoComplete="off"
        spellCheck={false}
        className="w-full px-4 py-3.5 rounded-xl bg-white border border-slate-300 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition resize-none leading-relaxed text-sm"
      />
      <div className="flex items-center justify-between text-[11px] text-slate-600 mt-2">
        <span>Clipboard operations are restricted.</span>
        <span className="font-mono">{(answer ?? "").length} characters logged</span>
      </div>
    </div>
  );
}
