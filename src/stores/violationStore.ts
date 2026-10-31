import { create } from "zustand";

export type ViolationType =
  | "FULLSCREEN_EXIT"
  | "TAB_SWITCH"
  | "PRINT_SCREEN"
  | "COPY_ATTEMPT"
  | "DEV_TOOLS";

export interface Violation {
  type: ViolationType;
  timestamp: string;
}

interface ViolationStore {
  flagCount: number;
  violations: Violation[];
  showWarningModal: boolean;
  autoSubmitTriggered: boolean;
  maxFlags: number;

  init: (maxFlags: number) => void;
  addViolation: (type: ViolationType) => void;
  dismissWarning: () => void;
  reset: () => void;
}

export const useViolationStore = create<ViolationStore>()((set, get) => ({
  flagCount: 0,
  violations: [],
  showWarningModal: false,
  autoSubmitTriggered: false,
  maxFlags: 1,

  init: (maxFlags) => set({ maxFlags, flagCount: 0, violations: [], autoSubmitTriggered: false }),

  addViolation: (type) => {
    const { flagCount, maxFlags } = get();
    const newFlagCount = flagCount + 1;
    const violation: Violation = { type, timestamp: new Date().toISOString() };

    if (newFlagCount > maxFlags) {
      // Already auto-submitted
      set((state) => ({ violations: [...state.violations, violation] }));
      return;
    }

    set((state) => ({
      flagCount: newFlagCount,
      violations: [...state.violations, violation],
      showWarningModal: newFlagCount <= maxFlags,
      autoSubmitTriggered: newFlagCount > maxFlags,
    }));
  },

  dismissWarning: () => set({ showWarningModal: false }),

  reset: () =>
    set({
      flagCount: 0,
      violations: [],
      showWarningModal: false,
      autoSubmitTriggered: false,
    }),
}));
