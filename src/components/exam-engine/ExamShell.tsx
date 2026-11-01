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
import {
  ShieldCheck,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Loader2,
  Lock,
  Bell,
  X,
  Info,
} from "lucide-react";

interface Question {
  id: string;
  type: string;
  content: string;
  options?: string[];
  order: number;
  marks: number;
  isRevised?: boolean;
  revisionNotice?: string | null;
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
  questions: initialQuestions,
  endTime,
  allowBackNav,
  maxFlags,
  onSubmit,
}: ExamShellProps) {
  const [activeQuestions, setActiveQuestions] = useState<Question[]>(initialQuestions);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitLock = useRef(false);

  // Live examiner announcements / notifications
  const [liveAlert, setLiveAlert] = useState<{
    id?: string;
    title: string;
    message: string;
    type?: string;
  } | null>(null);

  const seenNoticeIds = useRef(new Set<string>());
  const lastSyncTime = useRef(new Date().toISOString());

  const {
    initExam,
    currentQuestionIndex,
    goToQuestion,
    answers,
    enterQuestion,
    leaveQuestion,
    markSubmitted,
  } = useExamStore();

  const {
    init: initViolations,
    addViolation,
    showWarningModal,
    autoSubmitTriggered,
    violations,
    flagCount,
  } = useViolationStore();

  // ── Init on mount ──
  useEffect(() => {
    initExam({ attemptId, examId, endTime, totalQuestions: initialQuestions.length, allowBackNav });
    initViolations(maxFlags);
    if (initialQuestions[0]) enterQuestion(initialQuestions[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Submit handler ──
  const handleSubmit = useCallback(
    async (reason: "manual" | "timer" | "auto") => {
      if (submitLock.current) return;
      submitLock.current = true;
      setIsSubmitting(true);
      markSubmitted();

      const currentQ = activeQuestions[currentQuestionIndex];
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
    [activeQuestions, currentQuestionIndex, leaveQuestion, markSubmitted, onSubmit, violations]
  );

  // ── Auto-submit on maximum violations ──
  useEffect(() => {
    if (autoSubmitTriggered) {
      handleSubmit("auto");
    }
  }, [autoSubmitTriggered, handleSubmit]);

  // ── Live Examiner Sync (Question updates, clarifications, relocations) ──
  useEffect(() => {
    if (isSubmitting) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(
          `/api/exams/${examId}/sync?attemptId=${attemptId}&since=${encodeURIComponent(
            lastSyncTime.current
          )}`
        );
        if (!res.ok) return;

        const data = await res.json();
        lastSyncTime.current = data.timestamp || new Date().toISOString();

        // 1. Process new notifications
        if (data.notifications && Array.isArray(data.notifications)) {
          for (const notice of data.notifications) {
            if (!seenNoticeIds.current.has(notice.id)) {
              seenNoticeIds.current.add(notice.id);
              setLiveAlert({
                id: notice.id,
                title: notice.title || "Examiner Announcement",
                message: notice.message,
                type: notice.type,
              });
            }
          }
        }

        // 2. Check for updated questions
        if (data.questions && Array.isArray(data.questions)) {
          const currentStoreAnswers = useExamStore.getState().answers;

          for (const serverQ of data.questions) {
            if (serverQ.isRevised) {
              const currentQIdx = activeQuestions.findIndex((q) => q.id === serverQ.id);

              if (currentQIdx !== -1) {
                // If back nav is disabled and the candidate already attempted/passed it
                const hasAttempted =
                  currentStoreAnswers[serverQ.id]?.response != null ||
                  currentQuestionIndex > currentQIdx;

                if (!allowBackNav && hasAttempted) {
                  // Relocate this question to the very end of the roster
                  setActiveQuestions((prev) => {
                    const idx = prev.findIndex((q) => q.id === serverQ.id);
                    if (idx === -1) return prev;

                    // If it is already at the end, just update content
                    if (idx === prev.length - 1) {
                      return prev.map((q, i) =>
                        i === idx
                          ? {
                              ...q,
                              content: serverQ.content,
                              options: serverQ.options as string[] | undefined,
                              marks: serverQ.marks,
                              isRevised: true,
                              revisionNotice: serverQ.revisionNotice,
                            }
                          : q
                      );
                    }

                    const list = [...prev];
                    const [removed] = list.splice(idx, 1);
                    const movedItem: Question = {
                      ...removed,
                      content: serverQ.content,
                      options: serverQ.options as string[] | undefined,
                      marks: serverQ.marks,
                      isRevised: true,
                      revisionNotice: serverQ.revisionNotice,
                    };
                    list.push(movedItem);
                    return list;
                  });

                  // Clear previous response in store so candidate re-attempts afresh
                  useExamStore.getState().setResponse(serverQ.id, null);

                  setLiveAlert({
                    title: `Question #${serverQ.order} Revised & Relocated`,
                    message: `Question #${serverQ.order} was updated by the examiner. Because backward navigation is restricted, this item has been moved to the final position of your exam so you can re-attempt it.`,
                    type: "RELOCATION",
                  });
                } else {
                  // In-place update
                  setActiveQuestions((prev) =>
                    prev.map((q) =>
                      q.id === serverQ.id
                        ? {
                            ...q,
                            content: serverQ.content,
                            options: serverQ.options as string[] | undefined,
                            marks: serverQ.marks,
                            isRevised: true,
                            revisionNotice: serverQ.revisionNotice,
                          }
                        : q
                    )
                  );
                }
              }
            }
          }
        }
      } catch {
        // Polling failure non-fatal
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [activeQuestions, allowBackNav, attemptId, currentQuestionIndex, examId, isSubmitting]);

  // ── Anti-cheat violation handler ──
  const handleViolation = useCallback(
    async (type: "FULLSCREEN_EXIT" | "TAB_SWITCH" | "PRINT_SCREEN" | "COPY_ATTEMPT" | "DEV_TOOLS") => {
      addViolation(type);
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
    const currentQ = activeQuestions[currentQuestionIndex];
    const nextQ = activeQuestions[currentQuestionIndex + 1];
    if (currentQ) leaveQuestion(currentQ.id);
    if (nextQ) {
      enterQuestion(nextQ.id);
      goToQuestion(currentQuestionIndex + 1);
    }
  }, [activeQuestions, currentQuestionIndex, enterQuestion, goToQuestion, leaveQuestion]);

  const handlePrevQuestion = useCallback(() => {
    if (!allowBackNav) return;
    const currentQ = activeQuestions[currentQuestionIndex];
    const prevQ = activeQuestions[currentQuestionIndex - 1];
    if (currentQ) leaveQuestion(currentQ.id);
    if (prevQ) {
      enterQuestion(prevQ.id);
      goToQuestion(currentQuestionIndex - 1);
    }
  }, [activeQuestions, allowBackNav, currentQuestionIndex, enterQuestion, goToQuestion, leaveQuestion]);

  const handleJumpToQuestion = useCallback(
    (index: number) => {
      if (!allowBackNav && index < currentQuestionIndex) return;
      const currentQ = activeQuestions[currentQuestionIndex];
      const targetQ = activeQuestions[index];
      if (currentQ) leaveQuestion(currentQ.id);
      if (targetQ) {
        enterQuestion(targetQ.id);
        goToQuestion(index);
      }
    },
    [activeQuestions, allowBackNav, currentQuestionIndex, enterQuestion, goToQuestion, leaveQuestion]
  );

  const currentQuestion = activeQuestions[currentQuestionIndex];

  if (isSubmitting) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center text-slate-900 p-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-8 max-w-md w-full text-center shadow-lg">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 mb-2">Transmitting Assessment Data</h2>
          <p className="text-slate-500 text-sm leading-relaxed">
            Please remain on this screen while your cryptographic integrity logs and responses are securely saved.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-slate-50 text-slate-900 flex flex-col select-none"
      style={{
        WebkitUserSelect: "none",
        MozUserSelect: "none",
        userSelect: "none",
      }}
    >
      {/* Cryptographic Security Watermark Overlay */}
      <div
        className="fixed inset-0 pointer-events-none z-50 select-none overflow-hidden flex flex-wrap gap-16 p-8 items-center justify-around opacity-[0.03]"
        aria-hidden="true"
      >
        {Array.from({ length: 24 }).map((_, i) => (
          <div
            key={i}
            className="transform -rotate-45 text-xs md:text-sm font-mono tracking-widest text-slate-900 whitespace-nowrap"
          >
            AssessIQ • CANDIDATE #{attemptId.slice(0, 8)} • SECURE SESSION
          </div>
        ))}
      </div>

      {/* Top Header */}
      <header className="sticky top-0 z-20 flex items-center justify-between px-6 py-3.5 bg-white border-b border-slate-200 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold shadow-xs">
            <ShieldCheck className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="font-semibold text-slate-900 text-sm leading-tight">{examTitle}</h1>
            <p className="text-xs text-slate-500">
              Active Item {currentQuestionIndex + 1} of {activeQuestions.length}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 sm:gap-4">
          {flagCount > 0 && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold shadow-2xs">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
              <span>
                {flagCount} Warning{flagCount > 1 ? "s" : ""}
              </span>
            </span>
          )}

          <ExamTimer remainingSeconds={remainingSeconds} />
        </div>
      </header>

      {/* Live Proctoring / Question Update Notification Banner */}
      {liveAlert && (
        <div className="bg-blue-600 text-white px-6 py-3 shadow-md transition-all flex items-center justify-between gap-4 z-30">
          <div className="flex items-center gap-3 max-w-4xl mx-auto flex-1">
            <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
              <Bell className="w-4 h-4 text-white animate-bounce" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider">{liveAlert.title}</p>
              <p className="text-xs text-blue-50 leading-relaxed">{liveAlert.message}</p>
            </div>
          </div>
          <button
            onClick={() => setLiveAlert(null)}
            type="button"
            className="p-1 rounded-lg hover:bg-white/20 text-white transition flex-shrink-0"
            title="Dismiss announcement"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Examination Viewport */}
      <div className="flex flex-1 overflow-hidden">
        {/* Question Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-8 md:p-10">
          {currentQuestion && (
            <QuestionCard
              key={currentQuestion.id}
              question={currentQuestion}
              answer={answers[currentQuestion.id]?.response ?? null}
              questionNumber={currentQuestionIndex + 1}
              totalQuestions={activeQuestions.length}
              onAnswer={(response) => {
                useExamStore.getState().setResponse(currentQuestion.id, response);
              }}
            />
          )}

          {/* Navigation Controls Bar */}
          <div className="flex items-center justify-between mt-8 max-w-3xl mx-auto">
            <button
              onClick={handlePrevQuestion}
              disabled={!allowBackNav || currentQuestionIndex === 0}
              type="button"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 font-medium text-sm hover:bg-slate-50 hover:border-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition shadow-2xs"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Previous Question</span>
            </button>

            {currentQuestionIndex === activeQuestions.length - 1 ? (
              <button
                onClick={() => handleSubmit("manual")}
                type="button"
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm transition shadow-sm"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Complete & Submit Exam</span>
              </button>
            ) : (
              <button
                onClick={handleNextQuestion}
                type="button"
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition shadow-sm"
              >
                <span>Next Question</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </main>

        {/* Question Navigator Side Panel */}
        <aside className="hidden lg:block w-72 bg-white border-l border-slate-200 p-5 overflow-y-auto">
          <NavigationBar
            questions={activeQuestions}
            answers={answers}
            currentIndex={currentQuestionIndex}
            allowBackNav={allowBackNav}
            onJump={handleJumpToQuestion}
          />

          <div className="mt-6 p-3 rounded-lg bg-slate-50 border border-slate-200/80 text-[11px] text-slate-500 flex items-start gap-2">
            <Lock className="w-3.5 h-3.5 text-slate-400 mt-0.5 flex-shrink-0" />
            <span>Anti-cheat telemetry active. All actions and timestamps are monitored in real time.</span>
          </div>
        </aside>
      </div>

      {/* Violation Alert Modal */}
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
