import { useCallback, useRef, useState } from 'react';

// Wraps an async action so a second call while the first is still running is
// ignored (double clicks, Enter pressed twice). `pending` drives a disabled state.
export function useSingleFlight() {
  const running = useRef(false);
  const [pending, setPending] = useState(false);

  const guard = useCallback(
    (action) =>
      async (...args) => {
        if (running.current) return undefined;
        running.current = true;
        setPending(true);
        try {
          return await action(...args);
        } finally {
          running.current = false;
          setPending(false);
        }
      },
    []
  );

  return { guard, pending };
}
