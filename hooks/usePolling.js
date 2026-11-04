"use client";
import { useEffect, useRef } from "react";

/**
 * Poll `fn` every `intervalMs` while the tab is visible.
 * - Hidden tabs do not poll; the data refreshes as soon as the tab is visible again.
 * - ±15% jitter so many open tabs don't hit the API in lockstep.
 * - Exponential backoff (up to 8x) while requests keep failing.
 * `fn` receives `{ silent }`: false for the first load, true for background refreshes.
 */
export function usePolling(fn, intervalMs, { enabled = true, immediate = true } = {}) {
  const fnRef = useRef(fn);
  fnRef.current = fn;

  useEffect(() => {
    if (!enabled || !intervalMs) return undefined;
    let timer = null;
    let failures = 0;
    let stopped = false;
    let lastRun = Date.now();

    const schedule = () => {
      const backoff = Math.min(8, 2 ** failures);
      const jitter = 0.85 + Math.random() * 0.3;
      clearTimeout(timer);
      timer = setTimeout(tick, intervalMs * backoff * jitter);
    };

    const run = async (silent) => {
      lastRun = Date.now();
      try {
        await fnRef.current({ silent });
        failures = 0;
      } catch {
        failures += 1;
      }
    };

    async function tick() {
      if (stopped) return;
      if (typeof document !== "undefined" && document.visibilityState !== "visible") {
        schedule();
        return;
      }
      await run(true);
      if (!stopped) schedule();
    }

    const onVisible = () => {
      if (stopped || document.visibilityState !== "visible") return;
      // Refresh on return only if the data is older than one interval.
      if (Date.now() - lastRun >= intervalMs) {
        clearTimeout(timer);
        tick();
      }
    };

    if (immediate) run(false);
    schedule();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      stopped = true;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [intervalMs, enabled, immediate]);
}
