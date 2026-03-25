import { useEffect, useRef } from "react";

export function useThrottle(callback, delay) {
  const latestCallbackRef = useRef(callback);
  const timeoutRef = useRef(null);
  const pendingArgsRef = useRef(null);
  const lastCallRef = useRef(0);

  useEffect(() => {
    latestCallbackRef.current = callback;
  }, [callback]);

  useEffect(
    () => () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
    },
    [],
  );

  return (...args) => {
    const now = Date.now();
    const elapsed = now - lastCallRef.current;

    if (elapsed >= delay) {
      lastCallRef.current = now;
      latestCallbackRef.current(...args);
      return;
    }

    pendingArgsRef.current = args;

    if (timeoutRef.current) {
      return;
    }

    timeoutRef.current = window.setTimeout(() => {
      timeoutRef.current = null;
      lastCallRef.current = Date.now();

      if (pendingArgsRef.current) {
        latestCallbackRef.current(...pendingArgsRef.current);
      }
    }, delay - elapsed);
  };
}

