"use client";

import { useEffect, useRef } from "react";

interface UseCopyGuardOptions {
  onViolation: (type: "COPY_ATTEMPT" | "PRINT_SCREEN") => void;
  enabled?: boolean;
}

export function useCopyGuard({ onViolation, enabled = true }: UseCopyGuardOptions) {
  const onViolationRef = useRef(onViolation);
  onViolationRef.current = onViolation;

  useEffect(() => {
    if (!enabled) return;

    // Block right-click
    const blockContextMenu = (e: MouseEvent) => e.preventDefault();

    // Block copy / cut
    const blockCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      onViolationRef.current("COPY_ATTEMPT");
    };

    // Block keyboard shortcuts
    const blockKeys = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey;

      // Ctrl+C, Ctrl+X, Ctrl+A, Ctrl+V (on question areas)
      if (ctrl && ["c", "x", "a", "u", "s", "p"].includes(e.key.toLowerCase())) {
        e.preventDefault();
        if (["c", "x"].includes(e.key.toLowerCase())) {
          onViolationRef.current("COPY_ATTEMPT");
        }
      }

      // PrintScreen / Snipping Tool shortcuts
      if (e.key === "PrintScreen" || e.key === "F12" || ((ctrl || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "s")) {
        e.preventDefault();
        onViolationRef.current("PRINT_SCREEN");
        // Clear clipboard immediately
        navigator.clipboard.writeText("").catch(() => {});
      }

      // Ctrl+Shift+I (DevTools), Ctrl+Shift+J, Ctrl+Shift+C
      if (ctrl && e.shiftKey && ["i", "j", "c"].includes(e.key.toLowerCase())) {
        e.preventDefault();
        onViolationRef.current("PRINT_SCREEN");
      }

      // F12
      if (e.key === "F12") {
        e.preventDefault();
        onViolationRef.current("PRINT_SCREEN");
      }
    };

    document.addEventListener("contextmenu", blockContextMenu);
    document.addEventListener("copy", blockCopy);
    document.addEventListener("cut", blockCopy);
    document.addEventListener("keydown", blockKeys);

    return () => {
      document.removeEventListener("contextmenu", blockContextMenu);
      document.removeEventListener("copy", blockCopy);
      document.removeEventListener("cut", blockCopy);
      document.removeEventListener("keydown", blockKeys);
    };
  }, [enabled]);
}
