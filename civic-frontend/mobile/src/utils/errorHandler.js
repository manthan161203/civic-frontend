/**
 * Centralized error handling utilities for API and application errors
 * Converts error responses to user-friendly messages
 * Integrates with error tracking and UI state
 */

/**
 * Get user-friendly error message from API error
 * @param {Error} error - Axios error object
 * @returns {string} User-friendly error message
 */
export const getErrorMessage = (error) => {
  if (!error) return 'An unexpected error occurred';

  // Network error
  if (error.code === 'ECONNABORTED') {
    return 'Request timed out. Please try again.';
  }

  if (error.message === 'Network Error') {
    return 'Network error. Please check your connection.';
  }

  // API response error
  const status = error.response?.status;
  const data = error.response?.data;
  const message = data?.message || data?.detail || data?.error;

  switch (status) {
    case 400:
      return message || 'Invalid input. Please check your data.';
    case 401:
      return 'Session expired. Please login again.';
    case 403:
      return 'You do not have permission to perform this action.';
    case 404:
      return message || 'Resource not found.';
    case 409:
      return message || 'Conflict. The resource already exists.';
    case 429:
      return 'Too many requests. Please try again later.';
    case 500:
      return 'Server error. Please try again later.';
    case 502:
      return 'Bad gateway. Please try again later.';
    case 503:
      return 'Service unavailable. Please try again later.';
    default:
      return message || 'An unexpected error occurred. Please try again.';
  }
};

/**
 * Get error code for logging/tracking
 * @param {Error} error - Axios error object
 * @returns {string} Error code
 */
export const getErrorCode = (error) => {
  if (!error) return 'UNKNOWN_ERROR';

  if (error.code === 'ECONNABORTED') return 'TIMEOUT';
  if (error.message === 'Network Error') return 'NETWORK_ERROR';

  const status = error.response?.status;
  const code = error.response?.data?.error_code;

  if (code) return code;

  return `HTTP_${status || 'UNKNOWN'}`;
};

/**
 * Check if error is transient (can be retried)
 * @param {Error} error - Axios error object
 * @returns {boolean} True if error is transient
 */
export const isTransientError = (error) => {
  if (!error.response) return true; // Network errors are transient

  const status = error.response.status;
  // Retry on 408 (timeout), 429 (rate limit), 5xx (server errors)
  return status === 408 || status === 429 || (status >= 500 && status < 600);
};

/**
 * Check if error is authentication error
 * @param {Error} error - Axios error object
 * @returns {boolean} True if 401/403
 */
export const isAuthError = (error) => {
  const status = error.response?.status;
  return status === 401 || status === 403;
};

/**
 * Check if error is validation error
 * @param {Error} error - Axios error object
 * @returns {boolean} True if 400
 */
export const isValidationError = (error) => {
  return error.response?.status === 400;
};

/**
 * Get validation errors from 400 response
 * @param {Error} error - Axios error object
 * @returns {Object} Map of field names to error messages
 */
export const getValidationErrors = (error) => {
  if (error.response?.status !== 400) return {};

  const data = error.response.data;

  // Handle different error formats
  if (data.errors && typeof data.errors === 'object') {
    return data.errors; // {field: "error message"}
  }

  if (data.detail && Array.isArray(data.detail)) {
    // Pydantic validation error format
    const errors = {};
    data.detail.forEach((err) => {
      const field = err.loc?.[1] || 'general';
      errors[field] = err.msg;
    });
    return errors;
  }

  return {};
};

/**
 * Format error for logging (don't log sensitive data)
 * @param {Error} error - Axios error object
 * @returns {Object} Safe error object for logging
 */
export const formatErrorForLogging = (error) => {
  return {
    code: getErrorCode(error),
    message: error.message,
    status: error.response?.status,
    url: error.config?.url,
    method: error.config?.method,
    timestamp: new Date().toISOString(),
  };
};

/**
 * Handle API error and dispatch actions
 * @param {Error} error - Axios error object
 * @param {Object} options - Options for error handling
 * @returns {Object} Error info for UI
 */
export const handleApiError = (error, options = {}) => {
  const {
    onAuthError = null,
    onValidationError = null,
    shouldLog = true,
    onLog = null,
  } = options;

  const code = getErrorCode(error);
  const message = getErrorMessage(error);
  const isTransient = isTransientError(error);

  // Log error if callback provided
  if (shouldLog && onLog) {
    onLog(formatErrorForLogging(error));
  }

  // Handle auth errors
  if (isAuthError(error) && onAuthError) {
    onAuthError();
  }

  // Handle validation errors
  if (isValidationError(error) && onValidationError) {
    const validationErrors = getValidationErrors(error);
    onValidationError(validationErrors);
  }

  return {
    code,
    message,
    isTransient,
    status: error.response?.status,
    details: getValidationErrors(error),
  };
};
