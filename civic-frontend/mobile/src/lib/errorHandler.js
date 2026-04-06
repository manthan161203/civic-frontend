/**
 * Error Handling Utilities for Civic Mobile App
 * ===========================================
 *
 * React Native compatible error handling for mobile application.
 * Mirrors desktop implementation with mobile-specific considerations.
 */

/**
 * Custom error class for API-related errors
 * @class ApiError
 */
export class ApiError extends Error {
  constructor(message, statusCode = 500, details = {}, isTransient = false) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.details = details;
    this.isTransient = isTransient;
    this.timestamp = new Date().toISOString();
  }

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

export class ValidationError extends ApiError {
  constructor(field, message, details = {}) {
    const fullMessage = `Invalid ${field}: ${message}`;
    super(fullMessage, 422, { field, ...details }, false);
    this.name = 'ValidationError';
    this.field = field;
  }
}

export class AuthenticationError extends ApiError {
  constructor(message = 'Authentication required', details = {}) {
    super(message, 401, details, false);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends ApiError {
  constructor(action, resource, details = {}) {
    const message = `Not authorized to ${action} ${resource}`;
    super(message, 403, { action, resource, ...details }, false);
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends ApiError {
  constructor(resource, id, details = {}) {
    const message = `${resource} not found: ${id}`;
    super(message, 404, { resource, id: String(id), ...details }, false);
    this.name = 'NotFoundError';
  }
}

export class ExternalServiceError extends ApiError {
  constructor(serviceName, errorMessage, isTransient = false, details = {}) {
    const message = `${serviceName} service error: ${errorMessage}`;
    const statusCode = isTransient ? 503 : 500;
    super(message, statusCode, { service: serviceName, ...details }, isTransient);
    this.name = 'ExternalServiceError';
  }
}

/**
 * Parse error and extract user-friendly message (mobile version)
 */
export function getErrorMessage(error, defaultMessage = 'An unexpected error occurred') {
  if (!error) {
    return defaultMessage;
  }

  if (error instanceof ApiError) {
    return error.message;
  }

  // Axios error or fetch error
  if (error.response) {
    const { data, status } = error.response;

    if (data?.message) return data.message;
    if (data?.detail) return data.detail;

    switch (status) {
      case 400:
        return 'Invalid request. Please check your input.';
      case 401:
        return 'Your session has expired. Please log in again.';
      case 403:
        return 'You do not have permission.';
      case 404:
        return 'Resource not found.';
      case 500:
      case 502:
      case 503:
      case 504:
        return 'Server error. Please try again later.';
      default:
        return defaultMessage;
    }
  }

  if (error.request && !error.response) {
    return 'Network error. Check your connection.';
  }

  if (error.message) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  return defaultMessage;
}

/**
 * Log error with context
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

  console.error(`[${context}]`, errorLog);
  return errorLog;
}

/**
 * Safely execute async function
 */
export async function safeAsync(asyncFn, context, options = {}) {
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

    return fallbackValue;
  }
}

/**
 * Safely execute sync function
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

    return fallbackValue;
  }
}

/**
 * Check if error is retryable
 */
export function isRetryable(error) {
  if (error instanceof ApiError) {
    return error.isTransient;
  }

  if (error.request && !error.response) {
    return true;
  }

  if (error.response?.status >= 500) {
    return true;
  }

  if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
    return true;
  }

  return false;
}

/**
 * Retry async function with exponential backoff
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

      console.warn(`[${context}] Retry ${attempt + 1}/${maxRetries} after ${delay}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));

      delay = Math.min(delay * backoffMultiplier, maxDelay);
    }
  }

  throw lastError;
}

/**
 * Create structured error response for API calls
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
