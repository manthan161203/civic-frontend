import { useState, useEffect } from 'react';

/**
 * Custom hook for debouncing values
 * Delays state updates until the user stops changing the value
 * @param {*} value - Value to debounce
 * @param {number} delay - Debounce delay in milliseconds (default: 500)
 * @returns {*} Debounced value
 */
export const useDebounce = (value, delay = 500) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
};

/**
 * Custom hook for debouncing async functions and API calls
 * Prevents excessive API calls during rapid input changes
 * @param {Function} callback - Async function to debounce
 * @param {number} delay - Debounce delay in milliseconds (default: 500)
 * @returns {Function} Debounced callback
 */
export const useDebouncedCallback = (callback, delay = 500) => {
  const [timeoutId, setTimeoutId] = useState(null);

  useEffect(() => {
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [timeoutId]);

  return (...args) => {
    if (timeoutId) clearTimeout(timeoutId);
    
    const id = setTimeout(() => {
      callback(...args);
    }, delay);
    
    setTimeoutId(id);
  };
};

export default useDebounce;
