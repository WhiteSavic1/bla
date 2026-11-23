"use client";

import { useCallback, useRef, useState } from "react";

interface TextHistoryOptions {
  coalesceMs?: number;
  maxEntries?: number;
}

export function useTextHistory(
  initialValue = "",
  options: TextHistoryOptions = {}
) {
  const { coalesceMs = 450, maxEntries = 100 } = options;

  const [value, setValueState] = useState(initialValue);
  const historyRef = useRef<string[]>([initialValue]);
  const indexRef = useRef(0);
  const lastPushTimeRef = useRef(0);
  const [, setVersion] = useState(0);

  const bump = () => setVersion((v) => v + 1);

  const setValue = useCallback(
    (next: string, opts?: { immediate?: boolean }) => {
      const current = historyRef.current[indexRef.current];
      if (next === current) return;

      const now = Date.now();
      const isSingleCharEdit = Math.abs(next.length - current.length) <= 1;
      const endedWithWhitespace = next.length > current.length && /\s/.test(next.slice(-1));
      const shouldCoalesce =
        !opts?.immediate &&
        indexRef.current > 0 &&
        now - lastPushTimeRef.current < coalesceMs &&
        isSingleCharEdit &&
        !endedWithWhitespace;

      if (shouldCoalesce) {
        historyRef.current[indexRef.current] = next;
      } else {
        const sliced = historyRef.current.slice(0, indexRef.current + 1);
        sliced.push(next);
        if (sliced.length > maxEntries) {
          sliced.shift();
        }
        historyRef.current = sliced;
        indexRef.current = sliced.length - 1;
      }

      lastPushTimeRef.current = now;
      setValueState(next);
      bump();
    },
    [coalesceMs, maxEntries]
  );

  const undo = useCallback(() => {
    if (indexRef.current <= 0) return false;
    indexRef.current -= 1;
    const prev = historyRef.current[indexRef.current];
    lastPushTimeRef.current = 0;
    setValueState(prev);
    bump();
    return true;
  }, []);

  const redo = useCallback(() => {
    if (indexRef.current >= historyRef.current.length - 1) return false;
    indexRef.current += 1;
    const next = historyRef.current[indexRef.current];
    lastPushTimeRef.current = 0;
    setValueState(next);
    bump();
    return true;
  }, []);

  const reset = useCallback((val = "") => {
    historyRef.current = [val];
    indexRef.current = 0;
    lastPushTimeRef.current = 0;
    setValueState(val);
    bump();
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>) => {
      if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
      const key = e.key.toLowerCase();
      if (key === "z" && !e.shiftKey) {
        if (indexRef.current > 0) {
          e.preventDefault();
          undo();
        }
      } else if (key === "y" || (key === "z" && e.shiftKey)) {
        if (indexRef.current < historyRef.current.length - 1) {
          e.preventDefault();
          redo();
        }
      }
    },
    [undo, redo]
  );

  return {
    value,
    setValue,
    undo,
    redo,
    reset,
    handleKeyDown,
    canUndo: indexRef.current > 0,
    canRedo: indexRef.current < historyRef.current.length - 1,
  };
}
