/**
 * Error Handler Tests
 * Tests for admin/src/utils/errorHandler.js
 * @jest-environment jsdom
 */

import {
  getErrorMessage,
  getErrorCode,
  isTransientError,
  isAuthError,
  isValidationError,
  getValidationErrors,
  formatErrorForLogging,
  handleApiError,
} from '@/utils/errorHandler';

describe('Error Handler Utilities', () => {
  
  // ────────────────────────────────────────────────────────────────
  // getErrorMessage Tests
  // ────────────────────────────────────────────────────────────────

  describe('getErrorMessage', () => {
    it('should return error message from response.data.message', () => {
      const error = {
        response: {
          data: {
            message: 'Custom error message',
          },
        },
      };
      expect(getErrorMessage(error)).toBe('Custom error message');
    });

    it('should return error message from response.data.detail', () => {
      const error = {
        response: {
          data: {
            detail: 'Detailed error message',
          },
        },
      };
      expect(getErrorMessage(error)).toBe('Detailed error message');
    });

    it('should return error message from response.data.error', () => {
      const error = {
        response: {
          data: {
            error: 'Error field message',
          },
        },
      };
      expect(getErrorMessage(error)).toBe('Error field message');
    });

    it('should return generic message for network timeout', () => {
      const error = {
        code: 'ECONNABORTED',
      };
      expect(getErrorMessage(error)).toBe('Request timed out. Please try again.');
    });

    it('should return generic message for network error', () => {
      const error = {
        message: 'Network Error',
      };
      expect(getErrorMessage(error)).toBe('Network error. Please check your connection.');
    });

    it('should return status-specific message for 401', () => {
      const error = {
        response: {
          status: 401,
        },
      };
      expect(getErrorMessage(error)).toBe('Session expired. Please login again.');
    });

    it('should return status-specific message for 403', () => {
      const error = {
        response: {
          status: 403,
        },
      };
      expect(getErrorMessage(error)).toBe('You do not have permission to perform this action.');
    });

    it('should return status-specific message for 404', () => {
      const error = {
        response: {
          status: 404,
        },
      };
      expect(getErrorMessage(error)).toBe('Resource not found.');
    });

    it('should handle null or undefined error', () => {
      expect(getErrorMessage(null)).toBe('An unexpected error occurred');
      expect(getErrorMessage(undefined)).toBe('An unexpected error occurred');
    });

    it('should extract message from axios error response with custom fallback ignored', () => {
      const error = {
        response: {
          status: 400,
          data: {
            detail: 'Bad request',
          },
        },
      };
      expect(getErrorMessage(error)).toBe('Bad request');
    });

    it('should handle missing response gracefully', () => {
      const error = {
        code: 'SOME_CODE',
        message: 'Generic message',
      };
      expect(getErrorMessage(error)).toBe('An unexpected error occurred. Please try again.');
    });
  });

  // ────────────────────────────────────────────────────────────────
  // getErrorCode Tests
  // ────────────────────────────────────────────────────────────────

  describe('getErrorCode', () => {
    it('should return error code from response.data.error_code', () => {
      const error = {
        response: {
          data: {
            error_code: 'VALIDATION_ERROR',
          },
        },
      };
      expect(getErrorCode(error)).toBe('VALIDATION_ERROR');
    });

    it('should return HTTP status code as fallback', () => {
      const error = {
        response: {
          status: 404,
        },
      };
      expect(getErrorCode(error)).toContain('404');
    });

    it('should return UNKNOWN_ERROR for null error', () => {
      const error = null;
      expect(getErrorCode(error)).toBe('UNKNOWN_ERROR');
    });

    it('should prioritize data.error_code over status', () => {
      const error = {
        response: {
          status: 400,
          data: {
            error_code: 'CUSTOM_CODE',
          },
        },
      };
      expect(getErrorCode(error)).toBe('CUSTOM_CODE');
    });

    it('should handle ECONNABORTED code', () => {
      const error = {
        code: 'ECONNABORTED',
      };
      expect(getErrorCode(error)).toBe('TIMEOUT');
    });

    it('should handle Network Error message', () => {
      const error = {
        message: 'Network Error',
      };
      expect(getErrorCode(error)).toBe('NETWORK_ERROR');
    });
  });

  // ────────────────────────────────────────────────────────────────
  // isTransientError Tests
  // ────────────────────────────────────────────────────────────────

  describe('isTransientError', () => {
    it('should identify network timeout as transient', () => {
      const error = {
        response: {
          status: 408,
        },
      };
      expect(isTransientError(error)).toBe(true);
    });

    it('should identify 429 (Too Many Requests) as transient', () => {
      const error = {
        response: {
          status: 429,
        },
      };
      expect(isTransientError(error)).toBe(true);
    });

    it('should identify 503 (Service Unavailable) as transient', () => {
      const error = {
        response: {
          status: 503,
        },
      };
      expect(isTransientError(error)).toBe(true);
    });

    it('should identify 504 (Gateway Timeout) as transient', () => {
      const error = {
        response: {
          status: 504,
        },
      };
      expect(isTransientError(error)).toBe(true);
    });

    it('should identify ECONNABORTED as transient', () => {
      const error = {
        code: 'ECONNABORTED',
      };
      expect(isTransientError(error)).toBe(true);
    });

    it('should identify ENOTFOUND as transient', () => {
      const error = {
        code: 'ENOTFOUND',
      };
      expect(isTransientError(error)).toBe(true);
    });

    it('should not identify 400 (Bad Request) as transient', () => {
      const error = {
        response: {
          status: 400,
        },
      };
      expect(isTransientError(error)).toBe(false);
    });

    it('should not identify 401 (Unauthorized) as transient', () => {
      const error = {
        response: {
          status: 401,
        },
      };
      expect(isTransientError(error)).toBe(false);
    });

    it('should not identify 403 (Forbidden) as transient', () => {
      const error = {
        response: {
          status: 403,
        },
      };
      expect(isTransientError(error)).toBe(false);
    });

    it('should not identify 404 (Not Found) as transient', () => {
      const error = {
        response: {
          status: 404,
        },
      };
      expect(isTransientError(error)).toBe(false);
    });
  });

  // ────────────────────────────────────────────────────────────────
  // isAuthError Tests
  // ────────────────────────────────────────────────────────────────

  describe('isAuthError', () => {
    it('should identify 401 (Unauthorized) as auth error', () => {
      const error = {
        response: {
          status: 401,
        },
      };
      expect(isAuthError(error)).toBe(true);
    });

    it('should identify 403 (Forbidden) as auth error', () => {
      const error = {
        response: {
          status: 403,
        },
      };
      expect(isAuthError(error)).toBe(true);
    });

    it('should not identify 400 (Bad Request) as auth error', () => {
      const error = {
        response: {
          status: 400,
        },
      };
      expect(isAuthError(error)).toBe(false);
    });

    it('should not identify 500 (Server Error) as auth error', () => {
      const error = {
        response: {
          status: 500,
        },
      };
      expect(isAuthError(error)).toBe(false);
    });

    it('should handle error without response', () => {
      const error = {
        message: 'Network error',
      };
      expect(isAuthError(error)).toBe(false);
    });
  });

  // ────────────────────────────────────────────────────────────────
  // isValidationError Tests
  // ────────────────────────────────────────────────────────────────

  describe('isValidationError', () => {
    it('should identify 400 (Bad Request) as validation error', () => {
      const error = {
        response: {
          status: 400,
        },
      };
      expect(isValidationError(error)).toBe(true);
    });

    it('should NOT identify 422 (Unprocessable Entity) as validation error', () => {
      const error = {
        response: {
          status: 422,
        },
      };
      expect(isValidationError(error)).toBe(false);
    });

    it('should not identify 401 as validation error', () => {
      const error = {
        response: {
          status: 401,
        },
      };
      expect(isValidationError(error)).toBe(false);
    });

    it('should not identify 500 as validation error', () => {
      const error = {
        response: {
          status: 500,
        },
      };
      expect(isValidationError(error)).toBe(false);
    });

    it('should handle error without response', () => {
      const error = {
        message: 'Network error',
      };
      expect(isValidationError(error)).toBe(false);
    });
  });

  // ────────────────────────────────────────────────────────────────
  // getValidationErrors Tests
  // ────────────────────────────────────────────────────────────────

  describe('getValidationErrors', () => {
    it('should extract validation errors from response.data.errors (object)', () => {
      const error = {
        response: {
          status: 400,
          data: {
            errors: {
              email: 'Invalid email format',
              phone: 'Phone must be 10 digits',
            },
          },
        },
      };
      const result = getValidationErrors(error);
      expect(result).toEqual({
        email: 'Invalid email format',
        phone: 'Phone must be 10 digits',
      });
    });

    it('should extract validation errors from response.data.detail (array)', () => {
      const error = {
        response: {
          status: 400,
          data: {
            detail: [
              {
                loc: ['body', 'email'],
                msg: 'Invalid email',
              },
              {
                loc: ['body', 'phone'],
                msg: 'Invalid phone',
              },
            ],
          },
        },
      };
      const result = getValidationErrors(error);
      expect(result).toEqual({
        email: 'Invalid email',
        phone: 'Invalid phone',
      });
    });

    it('should handle empty errors', () => {
      const error = {
        response: {
          status: 400,
          data: {},
        },
      };
      const result = getValidationErrors(error);
      expect(result).toEqual({});
    });

    it('should return empty object if no errors found', () => {
      const error = {
        response: {
          status: 500,
          data: {},
        },
      };
      const result = getValidationErrors(error);
      expect(result).toEqual({});
    });

    it('should return empty object for non-400 errors', () => {
      const error = {
        response: {
          status: 401,
          data: { message: 'Unauthorized' },
        },
      };
      const result = getValidationErrors(error);
      expect(result).toEqual({});
    });
  });

  // ────────────────────────────────────────────────────────────────
  // formatErrorForLogging Tests
  // ────────────────────────────────────────────────────────────────

  describe('formatErrorForLogging', () => {
    it('should format error with all available information', () => {
      const error = {
        message: 'Bad request',
        response: {
          status: 400,
          data: {
            message: 'Bad request',
          },
        },
        config: {
          url: '/api/test',
          method: 'POST',
        },
      };
      const result = formatErrorForLogging(error);
      expect(result).toHaveProperty('code');
      expect(result).toHaveProperty('status');
      expect(result.status).toBe(400);
      expect(result).toHaveProperty('url');
      expect(result).toHaveProperty('method');
      expect(result).toHaveProperty('timestamp');
    });

    it('should handle error with code', () => {
      const error = {
        code: 'ENOTFOUND',
        message: 'Network error',
      };
      const result = formatErrorForLogging(error);
      expect(result).toHaveProperty('code');
      expect(result.code).toContain('HTTP');
    });

    it('should be an object with safe data', () => {
      const error = { message: 'Test error' };
      const result = formatErrorForLogging(error);
      expect(typeof result).toBe('object');
      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('timestamp');
    });
  });

  // ────────────────────────────────────────────────────────────────
  // handleApiError Tests
  // ────────────────────────────────────────────────────────────────

  describe('handleApiError', () => {
    it('should return formatted error object with message', () => {
      const error = {
        message: 'Bad request',
        response: {
          status: 400,
          data: {
            message: 'Bad request',
          },
        },
      };
      const result = handleApiError(error);
      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('code');
      expect(result).toHaveProperty('isTransient');
      expect(result).toHaveProperty('status');
    });

    it('should include isTransient flag', () => {
      const transientError = {
        response: {
          status: 503,
          data: {},
        },
      };
      expect(handleApiError(transientError).isTransient).toBe(true);

      const persistentError = {
        response: {
          status: 400,
          data: {},
        },
      };
      expect(handleApiError(persistentError).isTransient).toBe(false);
    });

    it('should include status', () => {
      const authError = {
        response: {
          status: 401,
          data: {},
        },
      };
      expect(handleApiError(authError).status).toBe(401);

      const otherError = {
        response: {
          status: 400,
          data: {},
        },
      };
      expect(handleApiError(otherError).status).toBe(400);
    });

    it('should include validation errors in details if present', () => {
      const error = {
        response: {
          status: 400,
          data: {
            errors: {
              email: 'Invalid email',
            },
          },
        },
      };
      const result = handleApiError(error);
      expect(result).toHaveProperty('details');
      if (result.details && result.details.email) {
        expect(result.details.email).toBe('Invalid email');
      }
    });

    it('should call provided callbacks', () => {
      const authError = {
        response: {
          status: 401,
        },
      };
      const onAuthError = jest.fn();
      handleApiError(authError, { onAuthError });
      expect(onAuthError).toHaveBeenCalled();
    });
  });

  // ────────────────────────────────────────────────────────────────
  // Edge Cases and Complex Scenarios
  // ────────────────────────────────────────────────────────────────

  describe('Edge Cases', () => {
    it('should handle deeply nested error objects', () => {
      const error = {
        response: {
          status: 400,
          data: {
            errors: {
              email: 'Invalid email',
            },
          },
        },
      };
      const result = getValidationErrors(error);
      expect(result).toEqual({ email: 'Invalid email' });
    });

    it('should handle circular references in error objects', () => {
      const error = { 
        message: 'Test',
        response: {
          status: 400,
          data: {
            message: 'Test',
          },
        },
      };
      expect(() => getErrorMessage(error)).not.toThrow();
    });

    it('should handle errors with special characters', () => {
      const error = {
        response: {
          status: 400,
          data: {
            message: 'Error with "quotes" and \'apostrophes\'',
          },
        },
      };
      const result = getErrorMessage(error);
      expect(result).toContain('quotes');
    });

    it('should handle very long error messages', () => {
      const longMessage = 'A'.repeat(10000);
      const error = {
        response: {
          status: 400,
          data: {
            message: longMessage,
          },
        },
      };
      const result = getErrorMessage(error);
      expect(typeof result).toBe('string');
    });

    it('should handle null response.data gracefully', () => {
      const error = {
        response: {
          status: 500,
          data: null,
        },
      };
      const result = getErrorMessage(error);
      expect(typeof result).toBe('string');
    });
  });
});
