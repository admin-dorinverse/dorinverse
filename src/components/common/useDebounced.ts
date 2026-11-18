// Waits for a short pause before passing on a changing value, so work like searching runs once per pause in
// typing instead of once per letter.

import { useEffect, useState } from 'react';

/** The value, updated only after it has stopped changing for `wait` milliseconds. */
export function useDebounced<T>(value: T, wait: number): T {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), wait);
    return () => clearTimeout(timer);
  }, [value, wait]);
  return settled;
}
