'use client';

import { useEffect, useState } from 'react';

/**
 * A value that settles after the user stops changing it.
 *
 * The search inputs on issues, workers and citizens fire a request on **every
 * keystroke** — typing "pothole" is seven requests, six of which are obsolete
 * before they return, and the last one to arrive wins regardless of which query
 * it answered. On a slow connection that means the results can end up showing
 * matches for "potho".
 *
 * @template T
 * @param {T} value
 * @param {number} [delay=350]
 * @returns {T}
 */
export function useDebouncedValue(value, delay = 350) {
  const [settled, setSettled] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return settled;
}

export default useDebouncedValue;
