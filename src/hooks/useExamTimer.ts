"use client";

import { useEffect, useRef, useCallback } from "react";

interface UseExamTimerOptions {
  endTime: string; // ISO string
  onTick?: (remainingSeconds: number) => void;
  onExpire: () => void;
  enabled?: boolean;
}

export function useExamTimer({ endTime, onTick, onExpire, enabled = true }: UseExamTimerOptions) {
  const onExpireRef = useRef(onExpire);
  const onTickRef = useRef(onTick);
  onExpireRef.current = onExpire;
  onTickRef.current = onTick;

  const getRemainingSeconds = useCallback(() => {
    const end = new Date(endTime).getTime();
    const now = Date.now();
    return Math.max(0, Math.floor((end - now) / 1000));
  }, [endTime]);

  useEffect(() => {
    if (!enabled) return;

    const remaining = getRemainingSeconds();
    if (remaining <= 0) {
      onExpireRef.current();
      return;
    }

    onTickRef.current?.(remaining);

    const interval = setInterval(() => {
      const r = getRemainingSeconds();
      onTickRef.current?.(r);
      if (r <= 0) {
        clearInterval(interval);
        onExpireRef.current();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [enabled, getRemainingSeconds]);
}
