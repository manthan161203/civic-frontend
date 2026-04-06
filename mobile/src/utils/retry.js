/**
 * API retry logic with exponential backoff for mobile app
 * Retries transient failures (network errors, 5xx, 429, 408)
 */

/**
 * Exponential backoff calculator
 * @param {number} attempt - Attempt number (0-indexed)
 * @param {number} baseDelay - Base delay in ms (default 1000)
 * @param {number} maxDelay - Maximum delay in ms (default 10000)
 * @returns {number} Delay in milliseconds
 */
const getBackoffDelay = (attempt, baseDelay = 1000, maxDelay = 10000) => {
  const delay = baseDelay * Math.pow(2, attempt);
  const jitter = Math.random() * delay * 0.1; // 10% jitter
  return Math.min(delay + jitter, maxDelay);
};

/**
 * Check if error is retryable
 * @param {Error} error - Axios error
 * @param {number} attempt - Current attempt number
 * @param {number} maxRetries - Maximum retries (default 3)
 * @returns {boolean} True if should retry
 */
const isRetryable = (error, attempt, maxRetries = 3) => {
  if (attempt >= maxRetries) return false;

  // Network errors are always retryable
  if (!error.response) return true;

  const status = error.response.status;

  // Retryable status codes:
  // 408: Request Timeout
  // 429: Too Many Requests (Rate Limited)
  // 5xx: Server errors
  return status === 408 || status === 429 || (status >= 500 && status < 600);
};

/**
 * Retry a failed request with exponential backoff
 * @param {Function} fn - Async function to retry
 * @param {Object} options - Retry options
 * @returns {Promise} Result of the function
 */
export const retryWithBackoff = async (fn, options = {}) => {
  const { maxRetries = 3, baseDelay = 1000, maxDelay = 10000, onRetry = null } = options;

  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (!isRetryable(error, attempt, maxRetries)) {
        throw error; // Not retryable, throw immediately
      }

      const delay = getBackoffDelay(attempt, baseDelay, maxDelay);

      if (onRetry) {
        onRetry({
          attempt: attempt + 1,
          maxRetries: maxRetries + 1,
          delay,
          error,
        });
      }

      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
};

/**
 * Create a retry wrapper for API calls
 * Usage: const getIssues = retry(api.get, '/issues')
 */
export const retry = (fn, ...args) => {
  return retryWithBackoff(() => fn(...args));
};

/**
 * Generic retry for async operations
 * @param {Function} operation - Async operation to retry
 * @param {Object} options - Options (maxRetries, baseDelay, etc)
 * @returns {Promise} Operation result
 */
export const withRetry = async (operation, options = {}) => {
  return retryWithBackoff(operation, options);
};

/**
 * Retry for specific error predicate
 * @param {Function} operation - Async operation
 * @param {Function} shouldRetry - Function that returns true if should retry
 * @param {Object} options - Options
 * @returns {Promise} Operation result
 */
export const retryUntil = async (operation, shouldRetry, options = {}) => {
  const { maxRetries = 3, baseDelay = 1000, maxDelay = 10000 } = options;

  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await operation();
      // Check if result should trigger retry
      if (shouldRetry(result, null)) {
        if (attempt >= maxRetries) {
          throw new Error('Max retries reached');
        }
      } else {
        return result; // Success
      }
    } catch (error) {
      lastError = error;
      if (!shouldRetry(null, error)) {
        throw error; // Not retryable
      }

      if (attempt >= maxRetries) break;
    }

    const delay = getBackoffDelay(attempt, baseDelay, maxDelay);
    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  throw lastError;
};
