import { useCallback, useEffect, useRef, useState } from 'react';

// Sends `input` to `calculate` after typing pauses; keeps the last result while the next one loads.
export function useCalculation(calculate, input, delay = 250) {
  const [state, setState] = useState({ result: null, loading: false, error: '' });
  const [attempt, setAttempt] = useState(0);
  const latest = useRef(0);

  useEffect(() => {
    if (!input) return undefined;
    const ticket = latest.current + 1;
    latest.current = ticket;
    const timer = setTimeout(async () => {
      setState((current) => ({ ...current, loading: true }));
      try {
        const result = await calculate(input);
        if (latest.current === ticket) setState({ result, loading: false, error: '' });
      } catch (error) {
        if (latest.current === ticket) setState((current) => ({ ...current, loading: false, error: error.message || 'Could not calculate' }));
      }
    }, delay);
    return () => clearTimeout(timer);
  }, [calculate, input, delay, attempt]);

  const retry = useCallback(() => setAttempt((value) => value + 1), []);
  return { ...state, retry };
}
