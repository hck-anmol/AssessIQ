"use client";

import { useEffect, useRef } from "react";

interface UseVisibilityGuardOptions {
  onViolation: (type: "TAB_SWITCH") => void;
  enabled?: boolean;
}

export function useVisibilityGuard({ onViolation, enabled = true }: UseVisibilityGuardOptions) {
  const onViolationRef = useRef(onViolation);
  onViolationRef.current = onViolation;

  useEffect(() => {
    if (!enabled) return;

    function handleVisibilityChange() {
      if (document.hidden) {
        onViolationRef.current("TAB_SWITCH");
      }
    }

    function handleWindowBlur() {
      // Debounce to avoid false positives from alt-tab dialogs
      setTimeout(() => {
        if (document.hidden) {
          onViolationRef.current("TAB_SWITCH");
        }
      }, 100);
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleWindowBlur);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleWindowBlur);
    };
  }, [enabled]);
}
