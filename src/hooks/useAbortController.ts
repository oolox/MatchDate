import { useCallback, useEffect, useRef, type MutableRefObject } from 'react';

export function useAbortController(resetKey?: unknown): {
  abortRef: MutableRefObject<AbortController | null>;
  begin: () => AbortController;
  abort: () => void;
} {
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      abortRef.current = null;
    };
  }, [resetKey]);

  const abort = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
  }, []);

  const begin = useCallback(() => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    return controller;
  }, []);

  return { abortRef, begin, abort };
}
