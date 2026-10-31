import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface QuestionState {
  questionId: string;
  response: unknown;
  timeSpentMs: number;
  visitCount: number;
  timestamps: { enteredAt: string; leftAt: string | null }[];
  currentEnterTime: string | null;
}

interface ExamStore {
  // Exam context
  attemptId: string | null;
  examId: string | null;
  endTime: string | null; // ISO string

  // Navigation
  currentQuestionIndex: number;
  totalQuestions: number;
  allowBackNav: boolean;

  // Per-question state
  answers: Record<string, QuestionState>;

  // Status
  isSubmitted: boolean;

  // Actions
  initExam: (params: {
    attemptId: string;
    examId: string;
    endTime: string;
    totalQuestions: number;
    allowBackNav: boolean;
  }) => void;
  goToQuestion: (index: number) => void;
  setResponse: (questionId: string, response: unknown) => void;
  enterQuestion: (questionId: string) => void;
  leaveQuestion: (questionId: string) => void;
  markSubmitted: () => void;
  reset: () => void;
}

export const useExamStore = create<ExamStore>()(
  persist(
    (set, get) => ({
      attemptId: null,
      examId: null,
      endTime: null,
      currentQuestionIndex: 0,
      totalQuestions: 0,
      allowBackNav: false,
      answers: {},
      isSubmitted: false,

      initExam: ({ attemptId, examId, endTime, totalQuestions, allowBackNav }) =>
        set({ attemptId, examId, endTime, totalQuestions, allowBackNav, currentQuestionIndex: 0, isSubmitted: false }),

      goToQuestion: (index) => {
        const { totalQuestions, allowBackNav, currentQuestionIndex } = get();
        if (index < 0 || index >= totalQuestions) return;
        if (!allowBackNav && index < currentQuestionIndex) return;
        set({ currentQuestionIndex: index });
      },

      setResponse: (questionId, response) =>
        set((state) => ({
          answers: {
            ...state.answers,
            [questionId]: {
              ...(state.answers[questionId] ?? {
                questionId,
                timeSpentMs: 0,
                visitCount: 0,
                timestamps: [],
                currentEnterTime: null,
              }),
              response,
            },
          },
        })),

      enterQuestion: (questionId) => {
        const now = new Date().toISOString();
        set((state) => {
          const existing = state.answers[questionId] ?? {
            questionId,
            response: null,
            timeSpentMs: 0,
            visitCount: 0,
            timestamps: [],
            currentEnterTime: null,
          };
          return {
            answers: {
              ...state.answers,
              [questionId]: {
                ...existing,
                visitCount: existing.visitCount + 1,
                currentEnterTime: now,
                timestamps: [...existing.timestamps, { enteredAt: now, leftAt: null }],
              },
            },
          };
        });
      },

      leaveQuestion: (questionId) => {
        const now = new Date().toISOString();
        set((state) => {
          const existing = state.answers[questionId];
          if (!existing || !existing.currentEnterTime) return state;

          const enterTime = new Date(existing.currentEnterTime).getTime();
          const leaveTime = new Date(now).getTime();
          const delta = leaveTime - enterTime;

          const timestamps = [...existing.timestamps];
          // Update the last open visit
          if (timestamps.length > 0) {
            timestamps[timestamps.length - 1] = {
              ...timestamps[timestamps.length - 1],
              leftAt: now,
            };
          }

          return {
            answers: {
              ...state.answers,
              [questionId]: {
                ...existing,
                timeSpentMs: existing.timeSpentMs + delta,
                currentEnterTime: null,
                timestamps,
              },
            },
          };
        });
      },

      markSubmitted: () => set({ isSubmitted: true }),
      reset: () =>
        set({
          attemptId: null,
          examId: null,
          endTime: null,
          currentQuestionIndex: 0,
          totalQuestions: 0,
          allowBackNav: false,
          answers: {},
          isSubmitted: false,
        }),
    }),
    {
      name: "assessiq-exam-state",
      // Only persist if exam is in progress
      partialize: (state) => (state.isSubmitted ? {} : state),
    }
  )
);
