"use client";

import { useEffect, useCallback, useRef } from "react";

interface UseFullscreenOptions {
  onExit: () => void;
  enabled?: boolean;
}

export function useFullscreen({ onExit, enabled = true }: UseFullscreenOptions) {
  const onExitRef = useRef(onExit);
  onExitRef.current = onExit;

  const enterFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen({ navigationUI: "hide" });
      }
    } catch {
      // Browser may block — treat as violation
      onExitRef.current();
    }
  }, []);

  const exitFullscreen = useCallback(async () => {
    if (document.fullscreenElement) {
      await document.exitFullscreen().catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;

    function handleFullscreenChange() {
      if (!document.fullscreenElement) {
        onExitRef.current();
      }
    }

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, [enabled]);

  return { enterFullscreen, exitFullscreen };
}
