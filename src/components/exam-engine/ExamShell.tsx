"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { useExamStore } from "@/stores/examStore";
import { useViolationStore } from "@/stores/violationStore";
import { useFullscreen } from "@/hooks/useFullscreen";
import { useVisibilityGuard } from "@/hooks/useVisibilityGuard";
import { useCopyGuard } from "@/hooks/useCopyGuard";
import { useExamTimer } from "@/hooks/useExamTimer";
import { ViolationModal } from "./ViolationModal";
import { ExamTimer } from "./ExamTimer";
import { NavigationBar } from "./NavigationBar";
import { QuestionCard } from "./QuestionCard";
import { formatCountdown } from "@/lib/utils";

interface Question {
  id: string;
  type: string;
  content: string;
  options?: string[];
  order: number;
  marks: number;
}

interface ExamShellProps {
  attemptId: string;
  examId: string;
  examTitle: string;
  questions: Question[];
  endTime: string;
  allowBackNav: boolean;
  maxFlags: number;
  onSubmit: (answers: Record<string, unknown>, violations: unknown[]) => Promise<void>;
}

export function ExamShell({
  attemptId,
  examId,
  examTitle,
  questions,
  endTime,
  allowBackNav,
  maxFlags,
  onSubmit,
}: ExamShellProps) {
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitLock = useRef(false);

  const { initExam, currentQuestionIndex, goToQuestion, answers, enterQuestion, leaveQuestion, markSubmitted } =
    useExamStore();
  const { init: initViolations, addViolation, showWarningModal, autoSubmitTriggered, violations, flagCount } =
    useViolationStore();

  // ── Init on mount ──
  useEffect(() => {
    initExam({ attemptId, examId, endTime, totalQuestions: questions.length, allowBackNav });
    initViolations(maxFlags);
    // Enter first question
    if (questions[0]) enterQuestion(questions[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Submit handler (used by timer, auto-submit, and manual submit) ──
  const handleSubmit = useCallback(
    async (reason: "manual" | "timer" | "auto") => {
      if (submitLock.current) return;
      submitLock.current = true;
      setIsSubmitting(true);
      markSubmitted();

      // Leave current question to record time
      const currentQ = questions[currentQuestionIndex];
      if (currentQ) leaveQuestion(currentQ.id);

      const answerPayload = Object.fromEntries(
        Object.entries(useExamStore.getState().answers).map(([qId, state]) => [
          qId,
          {
            response: state.response,
            timeSpentMs: state.timeSpentMs,
            visitCount: state.visitCount,
            timestamps: state.timestamps,
          },
        ])
      );

      await onSubmit(answerPayload, violations);
    },
    [currentQuestionIndex, leaveQuestion, markSubmitted, onSubmit, questions, violations]
  );

  // ── Auto-submit on second violation ──
  useEffect(() => {
    if (autoSubmitTriggered) {
      handleSubmit("auto");
    }
  }, [autoSubmitTriggered, handleSubmit]);

  // ── Violation handler ──
  const handleViolation = useCallback(
    async (type: "FULLSCREEN_EXIT" | "TAB_SWITCH" | "PRINT_SCREEN" | "COPY_ATTEMPT" | "DEV_TOOLS") => {
      addViolation(type);
      // Report to server
      await fetch(`/api/attempts/${attemptId}/flags`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      }).catch(() => {});
    },
    [addViolation, attemptId]
  );

  // ── Anti-cheat hooks ──
  const { enterFullscreen } = useFullscreen({
    onExit: () => handleViolation("FULLSCREEN_EXIT"),
    enabled: !isSubmitting,
  });

  useVisibilityGuard({
    onViolation: () => handleViolation("TAB_SWITCH"),
    enabled: !isSubmitting,
  });

  useCopyGuard({
    onViolation: (type) => handleViolation(type),
    enabled: !isSubmitting,
  });

  // ── Timer ──
  useExamTimer({
    endTime,
    onTick: setRemainingSeconds,
    onExpire: () => handleSubmit("timer"),
    enabled: !isSubmitting,
  });

  // ── Question navigation ──
  const handleNextQuestion = useCallback(() => {
    const currentQ = questions[currentQuestionIndex];
    const nextQ = questions[currentQuestionIndex + 1];
    if (currentQ) leaveQuestion(currentQ.id);
    if (nextQ) {
      enterQuestion(nextQ.id);
      goToQuestion(currentQuestionIndex + 1);
    }
  }, [currentQuestionIndex, enterQuestion, goToQuestion, leaveQuestion, questions]);

  const handlePrevQuestion = useCallback(() => {
    if (!allowBackNav) return;
    const currentQ = questions[currentQuestionIndex];
    const prevQ = questions[currentQuestionIndex - 1];
    if (currentQ) leaveQuestion(currentQ.id);
    if (prevQ) {
      enterQuestion(prevQ.id);
      goToQuestion(currentQuestionIndex - 1);
    }
  }, [allowBackNav, currentQuestionIndex, enterQuestion, goToQuestion, leaveQuestion, questions]);

  const handleJumpToQuestion = useCallback(
    (index: number) => {
      if (!allowBackNav && index < currentQuestionIndex) return;
      const currentQ = questions[currentQuestionIndex];
      const targetQ = questions[index];
      if (currentQ) leaveQuestion(currentQ.id);
      if (targetQ) {
        enterQuestion(targetQ.id);
        goToQuestion(index);
      }
    },
    [allowBackNav, currentQuestionIndex, enterQuestion, goToQuestion, leaveQuestion, questions]
  );

  const currentQuestion = questions[currentQuestionIndex];

  if (isSubmitting) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Submitting your exam...</h2>
          <p className="text-slate-400">Please wait, do not close this window.</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-slate-950 text-white flex flex-col select-none"
      // CSS-level screenshot/copy prevention
      style={{
        WebkitUserSelect: "none",
        MozUserSelect: "none",
        userSelect: "none",
      }}
    >
      {/* Watermark overlay */}
      <div
        className="fixed inset-0 pointer-events-none z-0 opacity-5"
        aria-hidden="true"
        style={{
          backgroundImage: `repeating-linear-gradient(
            45deg,
            transparent,
            transparent 100px,
            rgba(255,255,255,0.03) 100px,
            rgba(255,255,255,0.03) 200px
          )`,
        }}
      />

      {/* Top bar */}
      <header className="flex items-center justify-between px-6 py-3 bg-slate-900 border-b border-slate-800 z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center font-bold text-sm">
            A
          </div>
          <div>
            <h1 className="font-semibold text-sm">{examTitle}</h1>
            <p className="text-xs text-slate-400">
              Question {currentQuestionIndex + 1} of {questions.length}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {flagCount > 0 && (
            <span className="px-2 py-1 rounded-full bg-red-500/20 border border-red-500/40 text-red-400 text-xs font-medium">
              ⚠️ {flagCount} warning{flagCount > 1 ? "s" : ""}
            </span>
          )}
          <ExamTimer remainingSeconds={remainingSeconds} />
        </div>
      </header>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Question area */}
        <main className="flex-1 overflow-y-auto p-6 md:p-10">
          {currentQuestion && (
            <QuestionCard
              key={currentQuestion.id}
              question={currentQuestion}
              answer={answers[currentQuestion.id]?.response ?? null}
              questionNumber={currentQuestionIndex + 1}
              totalQuestions={questions.length}
              onAnswer={(response) => {
                useExamStore.getState().setResponse(currentQuestion.id, response);
              }}
            />
          )}

          {/* Navigation buttons */}
          <div className="flex items-center justify-between mt-8 max-w-3xl mx-auto">
            <button
              onClick={handlePrevQuestion}
              disabled={!allowBackNav || currentQuestionIndex === 0}
              className="px-5 py-2.5 rounded-lg border border-slate-700 text-slate-300 hover:border-slate-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              ← Previous
            </button>

            {currentQuestionIndex === questions.length - 1 ? (
              <button
                onClick={() => handleSubmit("manual")}
                className="px-6 py-2.5 rounded-lg bg-green-600 hover:bg-green-500 text-white font-semibold transition-all"
              >
                Submit Exam ✓
              </button>
            ) : (
              <button
                onClick={handleNextQuestion}
                className="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-all"
              >
                Next →
              </button>
            )}
          </div>
        </main>

        {/* Question navigator sidebar */}
        <aside className="hidden lg:block w-64 bg-slate-900 border-l border-slate-800 p-4 overflow-y-auto">
          <NavigationBar
            questions={questions}
            answers={answers}
            currentIndex={currentQuestionIndex}
            allowBackNav={allowBackNav}
            onJump={handleJumpToQuestion}
          />
        </aside>
      </div>

      {/* Violation modal */}
      <ViolationModal
        open={showWarningModal}
        flagCount={flagCount}
        maxFlags={maxFlags}
        onDismiss={async () => {
          useViolationStore.getState().dismissWarning();
          await enterFullscreen();
        }}
      />
    </div>
  );
}
