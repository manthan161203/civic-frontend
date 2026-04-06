/**
 * Error Handling Utilities for Civic Frontend
 * ===========================================
 *
 * Provides centralized error handling, logging, and user-friendly error messages
 * across all frontend applications (admin, mobile).
 *
 * Usage:
 *   import { ApiError, handleError, logError, getErrorMessage } from '@/lib/errorHandler';
 *
 *   try {
 *     await api.getIssues();
 *   } catch (error) {
 *     const message = getErrorMessage(error);
 *     logError('issues_fetch', error);
 *     showAlert(message, 'error');
 *   }
 */

/**
 * Custom error class for API-related errors
 * @class ApiError
 * @extends Error
 */
export class ApiError extends Error {
  /**
   * @param {string} message - User-friendly error message
   * @param {number} [statusCode=500] - HTTP status code
   * @param {Object} [details={}] - Additional error details for debugging
   * @param {boolean} [isTransient=false] - Whether error is temporary/retryable
   */
  constructor(message, statusCode = 500, details = {}, isTransient = false) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.details = details;
    this.isTransient = isTransient;
    this.timestamp = new Date().toISOString();
  }

  /**
   * Convert error to structured object for logging/reporting
   * @returns {Object} Serialized error object
   */
  toJSON() {
    return {
      error: this.name,
      message: this.message,
      statusCode: this.statusCode,
      details: this.details,
      isTransient: this.isTransient,
      timestamp: this.timestamp,
    };
  }
}

/**
 * Custom error class for validation errors
 * @class ValidationError
 * @extends ApiError
 */
export class ValidationError extends ApiError {
  /**
   * @param {string} field - Name of field that failed validation
   * @param {string} message - Description of validation failure
   * @param {Object} [details={}] - Additional context
   */
  constructor(field, message, details = {}) {
    const fullMessage = `Invalid ${field}: ${message}`;
    super(fullMessage, 422, { field, ...details }, false);
    this.name = 'ValidationError';
    this.field = field;
  }
}

/**
 * Custom error class for authentication errors
 * @class AuthenticationError
 * @extends ApiError
 */
export class AuthenticationError extends ApiError {
  /**
   * @param {string} [message='Authentication required'] - Error message
   * @param {Object} [details={}] - Additional context
   */
  constructor(message = 'Authentication required', details = {}) {
    super(message, 401, details, false);
    this.name = 'AuthenticationError';
  }
}

/**
 * Custom error class for authorization errors
 * @class AuthorizationError
 * @extends ApiError
 */
export class AuthorizationError extends ApiError {
  /**
   * @param {string} action - Action attempted (e.g., 'delete', 'edit')
   * @param {string} resource - Resource being accessed (e.g., 'issue', 'user')
   * @param {Object} [details={}] - Additional context
   */
  constructor(action, resource, details = {}) {
    const message = `Not authorized to ${action} ${resource}`;
    super(message, 403, { action, resource, ...details }, false);
    this.name = 'AuthorizationError';
  }
}

/**
 * Custom error class for not found errors
 * @class NotFoundError
 * @extends ApiError
 */
export class NotFoundError extends ApiError {
  /**
   * @param {string} resource - Type of resource not found
   * @param {string|number} id - ID of missing resource
   * @param {Object} [details={}] - Additional context
   */
  constructor(resource, id, details = {}) {
    const message = `${resource} not found: ${id}`;
    super(message, 404, { resource, id: String(id), ...details }, false);
    this.name = 'NotFoundError';
  }
}

/**
 * Custom error class for external service failures
 * @class ExternalServiceError
 * @extends ApiError
 */
export class ExternalServiceError extends ApiError {
  /**
   * @param {string} serviceName - Name of external service (e.g., 'SMS', 'Google Maps')
   * @param {string} errorMessage - Original error message from service
   * @param {boolean} [isTransient=false] - Whether error is temporary
   * @param {Object} [details={}] - Additional context
   */
  constructor(serviceName, errorMessage, isTransient = false, details = {}) {
    const message = `${serviceName} service error: ${errorMessage}`;
    const statusCode = isTransient ? 503 : 500;
    super(message, statusCode, { service: serviceName, ...details }, isTransient);
    this.name = 'ExternalServiceError';
  }
}

/**
 * Parse error and extract user-friendly message
 *
 * @param {Error|AxiosError|Response|Object} error - Error object from various sources
 * @param {string} [defaultMessage='An unexpected error occurred'] - Fallback message
 * @returns {string} User-friendly error message
 *
 * @example
 *   try {
 *     await api.getIssues();
 *   } catch (error) {
 *     const message = getErrorMessage(error, 'Failed to load issues');
 *     showAlert(message);
 *   }
 */
export function getErrorMessage(error, defaultMessage = 'An unexpected error occurred') {
  // Handle null/undefined
  if (!error) {
    return defaultMessage;
  }

  // Custom error classes
  if (error instanceof ApiError) {
    return error.message;
  }

  // Axios error (from backend API)
  if (error.response) {
    const { data, status } = error.response;

    // Structured error response from backend
    if (data?.message) {
      return data.message;
    }
    if (data?.detail) {
      return data.detail;
    }

    // Common HTTP error messages
    switch (status) {
      case 400:
        return 'Invalid request. Please check your input.';
      case 401:
        return 'Your session has expired. Please log in again.';
      case 403:
        return 'You do not have permission to perform this action.';
      case 404:
        return 'The requested resource was not found.';
      case 409:
        return 'This operation conflicts with the current state. Please refresh and try again.';
      case 422:
        return 'Invalid data provided. Please check your input.';
      case 429:
        return 'Too many requests. Please wait a moment and try again.';
      case 500:
      case 502:
      case 503:
      case 504:
        return 'Server error. Please try again later.';
      default:
        return defaultMessage;
    }
  }

  // Network error (no response)
  if (error.request && !error.response) {
    return 'Network error. Please check your connection.';
  }

  // Generic Error object
  if (error.message) {
    return error.message;
  }

  // String error
  if (typeof error === 'string') {
    return error;
  }

  return defaultMessage;
}

/**
 * Log error with context for debugging and monitoring
 *
 * @param {string} context - Where the error occurred (e.g., 'api_call', 'component_render')
 * @param {Error} error - The error object
 * @param {Object} [additionalData={}] - Extra context (user ID, issue ID, etc.)
 *
 * @example
 *   try {
 *     await updateIssue(issueId, data);
 *   } catch (error) {
 *     logError('issue_update', error, { issueId, userId });
 *   }
 */
export function logError(context, error, additionalData = {}) {
  const errorLog = {
    context,
    timestamp: new Date().toISOString(),
    error: error instanceof ApiError ? error.toJSON() : {
      name: error?.name || 'Unknown',
      message: error?.message || String(error),
    },
    ...additionalData,
  };

  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.error(`[${context}]`, errorLog);
  }

  // In production, send to error tracking service (e.g., Sentry)
  // if (process.env.NODE_ENV === 'production') {
  //   sendToErrorTracking(errorLog);
  // }

  return errorLog;
}

/**
 * Safely execute async function with error handling
 *
 * @param {Function} asyncFn - Async function to execute
 * @param {string} context - Error context description
 * @param {Object} [options={}] - Configuration options
 * @param {string} [options.defaultError] - Default error message
 * @param {Function} [options.onError] - Custom error handler callback
 * @param {*} [options.fallbackValue] - Value to return on error
 * @returns {Promise} Result of async function or error value
 *
 * @example
 *   const issues = await safeAsync(
 *     () => api.getIssues(),
 *     'fetch_issues',
 *     { fallbackValue: [], onError: (err) => showAlert(getErrorMessage(err)) }
 *   );
 */
export async function safeAsync(
  asyncFn,
  context,
  options = {}
) {
  const { defaultError, onError, fallbackValue = null } = options;

  try {
    return await asyncFn();
  } catch (error) {
    const errorInfo = logError(context, error);

    if (onError) {
      try {
        onError(error, errorInfo);
      } catch (handlerError) {
        console.error('Error in error handler:', handlerError);
      }
    }

    if (defaultError) {
      console.warn(`[${context}] ${defaultError}`);
    }

    return fallbackValue;
  }
}

/**
 * Safely execute sync function with error handling
 *
 * @param {Function} fn - Sync function to execute
 * @param {string} context - Error context description
 * @param {Object} [options={}] - Configuration options (same as safeAsync)
 * @returns {*} Result of function or fallback value
 *
 * @example
 *   const parsed = safeSync(
 *     () => JSON.parse(jsonString),
 *     'parse_json',
 *     { fallbackValue: {}, defaultError: 'Invalid JSON' }
 *   );
 */
export function safeSync(fn, context, options = {}) {
  const { defaultError, onError, fallbackValue = null } = options;

  try {
    return fn();
  } catch (error) {
    const errorInfo = logError(context, error);

    if (onError) {
      try {
        onError(error, errorInfo);
      } catch (handlerError) {
        console.error('Error in error handler:', handlerError);
      }
    }

    if (defaultError) {
      console.warn(`[${context}] ${defaultError}`);
    }

    return fallbackValue;
  }
}

/**
 * Check if error is retryable
 *
 * @param {Error} error - Error to check
 * @returns {boolean} True if error is temporary/retryable
 *
 * @example
 *   if (isRetryable(error)) {
 *     setTimeout(() => retryApiCall(), 1000);
 *   }
 */
export function isRetryable(error) {
  if (error instanceof ApiError) {
    return error.isTransient;
  }

  // Network errors are retryable
  if (error.request && !error.response) {
    return true;
  }

  // Server errors (5xx) are retryable
  if (error.response?.status >= 500) {
    return true;
  }

  // Timeout errors are retryable
  if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
    return true;
  }

  return false;
}

/**
 * Retry async function with exponential backoff
 *
 * @param {Function} asyncFn - Async function to retry
 * @param {string} context - Error context
 * @param {Object} [options={}] - Retry configuration
 * @param {number} [options.maxRetries=3] - Maximum retry attempts
 * @param {number} [options.initialDelay=1000] - Initial retry delay in ms
 * @param {number} [options.maxDelay=30000] - Maximum retry delay in ms
 * @param {number} [options.backoffMultiplier=2] - Exponential backoff multiplier
 * @returns {Promise} Result of function or throws last error
 *
 * @example
 *   const data = await retryAsync(
 *     () => api.fetchData(),
 *     'fetch_data',
 *     { maxRetries: 5, initialDelay: 500 }
 *   );
 */
export async function retryAsync(asyncFn, context, options = {}) {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 30000,
    backoffMultiplier = 2,
  } = options;

  let lastError;
  let delay = initialDelay;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await asyncFn();
    } catch (error) {
      lastError = error;

      if (attempt === maxRetries || !isRetryable(error)) {
        logError(`${context}_final_failure`, error, { attempts: attempt + 1 });
        throw error;
      }

      console.warn(`[${context}] Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));

      delay = Math.min(delay * backoffMultiplier, maxDelay);
    }
  }

  throw lastError;
}

/**
 * Create structured error response for API calls
 *
 * @param {number} statusCode - HTTP status code
 * @param {string} message - Error message
 * @param {Object} [details={}] - Additional details
 * @returns {Object} Structured error response
 *
 * @example
 *   return createErrorResponse(400, 'Invalid issue ID', { issueId: 'abc123' });
 */
export function createErrorResponse(statusCode, message, details = {}) {
  return {
    error: {
      statusCode,
      message,
      details,
      timestamp: new Date().toISOString(),
    },
  };
}
