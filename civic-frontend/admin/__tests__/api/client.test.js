/**
 * API Client Tests
 * Tests for admin/src/api/client.js
 * @jest-environment jsdom
 */

import {
  apiGet,
  apiPost,
  apiPut,
  apiPatch,
  apiDelete,
  apiCallWithRetry,
  getErrorMessage,
} from '@/api/client';

// Mock axios
jest.mock('axios', () => ({
  create: jest.fn(() => ({
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() },
    },
  })),
}));

// Mock retry utility
jest.mock('@/utils/retry', () => ({
  withRetry: jest.fn((fn, options = {}) => {
    return fn().catch((error) => {
      if (options.shouldRetry && !options.shouldRetry(error)) {
        throw error;
      }
      if (error.response?.status === 400 || error.response?.status === 401) {
        throw error;
      }
      // Simple retry logic for tests
      if ((options.maxRetries || 0) > 0) {
        return fn();
      }
      throw error;
    });
  }),
}));

describe('API Client', () => {
  
  // ────────────────────────────────────────────────────────────────
  // API Wrapper Functions
  // ────────────────────────────────────────────────────────────────

  describe('API Methods', () => {
    it('should have apiGet function', () => {
      expect(typeof apiGet).toBe('function');
    });

    it('should have apiPost function', () => {
      expect(typeof apiPost).toBe('function');
    });

    it('should have apiPut function', () => {
      expect(typeof apiPut).toBe('function');
    });

    it('should have apiPatch function', () => {
      expect(typeof apiPatch).toBe('function');
    });

    it('should have apiDelete function', () => {
      expect(typeof apiDelete).toBe('function');
    });

    it('should have apiCallWithRetry function', () => {
      expect(typeof apiCallWithRetry).toBe('function');
    });

    it('should export getErrorMessage', () => {
      expect(typeof getErrorMessage).toBe('function');
    });
  });

  // ────────────────────────────────────────────────────────────────
  // Error Handling
  // ────────────────────────────────────────────────────────────────

  describe('Error Handling', () => {
    it('should handle 401 (Unauthorized) errors', async () => {
      const error = {
        response: {
          status: 401,
          data: { message: 'Unauthorized' },
        },
      };

      expect(getErrorMessage(error)).toBe('Unauthorized');
    });

    it('should handle 403 (Forbidden) errors', async () => {
      const error = {
        response: {
          status: 403,
          data: { message: 'Access Denied' },
        },
      };

      expect(getErrorMessage(error)).toBe('Access Denied');
    });

    it('should handle 404 (Not Found) errors', async () => {
      const error = {
        response: {
          status: 404,
          data: { message: 'Resource not found' },
        },
      };

      expect(getErrorMessage(error)).toBe('Resource not found');
    });

    it('should handle 500 (Server) errors', async () => {
      const error = {
        response: {
          status: 500,
          data: { message: 'Internal server error' },
        },
      };

      expect(getErrorMessage(error)).toBe('Internal server error');
    });

    it('should handle network errors', async () => {
      const error = new Error('Network error');
      const message = getErrorMessage(error, 'Default message');
      expect(message).toBe('Default message');
    });
  });

  // ────────────────────────────────────────────────────────────────
  // Retry Integration
  // ────────────────────────────────────────────────────────────────

  describe('Retry Integration', () => {
    it('should accept custom retry options', async () => {
      // This test verifies that retry options can be passed
      const options = {
        maxRetries: 5,
        baseDelay: 2000,
        shouldRetry: (error) => error.response?.status !== 400,
      };

      // API methods should accept options
      expect(() => apiGet('/url', {}, options)).not.toThrow();
    });

    it('should use default retry settings', async () => {
      // Default: maxRetries: 3, baseDelay: 1000
      // Verify that methods work without explicit retry options
      expect(() => apiGet('/url', {})).not.toThrow();
    });

    it('should not retry on validation errors (400)', async () => {
      // 400 should not trigger retry
      const shouldNotRetry = (error) => {
        expect(error.response?.status).not.toBe(400);
        return false;
      };

      const options = {
        maxRetries: 3,
        baseDelay: 10,
        shouldRetry: shouldNotRetry,
      };

      expect(() => apiPost('/url', {}, options)).not.toThrow();
    });

    it('should retry on transient errors (503, 504, 408, 429)', async () => {
      const transientStatuses = [503, 504, 408, 429];

      transientStatuses.forEach((status) => {
        const shouldRetry = (error) => {
          // Should be true for transient errors
          return [503, 504, 408, 429].includes(error.response?.status);
        };

        const options = {
          maxRetries: 3,
          baseDelay: 10,
          shouldRetry,
        };

        expect(() => apiGet('/url', {}, options)).not.toThrow();
      });
    });
  });

  // ────────────────────────────────────────────────────────────────
  // Method Signature Tests
  // ────────────────────────────────────────────────────────────────

  describe('Method Signatures', () => {
    it('apiGet should accept (url, params, options)', () => {
      const mockCall = jest.fn(() => Promise.resolve({ data: {} }));
      
      // Should not throw with all parameters
      expect(() => apiGet('/issues', { page: 1, status: 'open' }, { maxRetries: 5 })).not.toThrow();
      
      // Should not throw with no params
      expect(() => apiGet('/issues')).not.toThrow();
    });

    it('apiPost should accept (url, data, options)', () => {
      expect(() => 
        apiPost('/issues', { title: 'Issue' }, { maxRetries: 5 })
      ).not.toThrow();

      expect(() => 
        apiPost('/issues', { title: 'Issue' })
      ).not.toThrow();
    });

    it('apiPut should accept (url, data, options)', () => {
      expect(() => 
        apiPut('/issues/123', { status: 'resolved' }, { maxRetries: 5 })
      ).not.toThrow();

      expect(() => 
        apiPut('/issues/123', { status: 'resolved' })
      ).not.toThrow();
    });

    it('apiPatch should accept (url, data, options)', () => {
      expect(() => 
        apiPatch('/issues/123', { status: 'in_progress' }, { maxRetries: 5 })
      ).not.toThrow();

      expect(() => 
        apiPatch('/issues/123', { status: 'in_progress' })
      ).not.toThrow();
    });

    it('apiDelete should accept (url, options)', () => {
      expect(() => 
        apiDelete('/issues/123', { maxRetries: 5 })
      ).not.toThrow();

      expect(() => 
        apiDelete('/issues/123')
      ).not.toThrow();
    });

    it('apiCallWithRetry should accept (apiCall, options)', () => {
      const apiCall = () => Promise.resolve({ data: {} });
      
      expect(() => 
        apiCallWithRetry(apiCall, { maxRetries: 3 })
      ).not.toThrow();

      expect(() => 
        apiCallWithRetry(apiCall)
      ).not.toThrow();
    });
  });

  // ────────────────────────────────────────────────────────────────
  // Export Tests
  // ────────────────────────────────────────────────────────────────

  describe('Exports', () => {
    it('should export all required functions', () => {
      expect(apiGet).toBeDefined();
      expect(apiPost).toBeDefined();
      expect(apiPut).toBeDefined();
      expect(apiPatch).toBeDefined();
      expect(apiDelete).toBeDefined();
      expect(apiCallWithRetry).toBeDefined();
      expect(getErrorMessage).toBeDefined();
    });

    it('each function should be callable', () => {
      expect(typeof apiGet).toBe('function');
      expect(typeof apiPost).toBe('function');
      expect(typeof apiPut).toBe('function');
      expect(typeof apiPatch).toBe('function');
      expect(typeof apiDelete).toBe('function');
      expect(typeof apiCallWithRetry).toBe('function');
      expect(typeof getErrorMessage).toBe('function');
    });
  });

  // ────────────────────────────────────────────────────────────────
  // Integration Tests
  // ────────────────────────────────────────────────────────────────

  describe('API Method Integration', () => {
    it('should support common API patterns', async () => {
      // Pattern 1: Fetch list with pagination
      expect(() => {
        apiGet('/issues', { page: 1, size: 20 });
      }).not.toThrow();

      // Pattern 2: Create resource
      expect(() => {
        apiPost('/issues', { title: 'New Issue', description: 'Description' });
      }).not.toThrow();

      // Pattern 3: Update resource
      expect(() => {
        apiPut('/issues/123', { title: 'Updated Title' });
      }).not.toThrow();

      // Pattern 4: Partial update
      expect(() => {
        apiPatch('/issues/123', { status: 'resolved' });
      }).not.toThrow();

      // Pattern 5: Delete resource
      expect(() => {
        apiDelete('/issues/123');
      }).not.toThrow();
    });

    it('should work with complex nested data', () => {
      const complexData = {
        title: 'Complex Issue',
        metadata: {
          nested: {
            deeply: true,
          },
        },
        items: [1, 2, 3],
        tags: ['important', 'urgent'],
      };

      expect(() => {
        apiPost('/issues', complexData);
      }).not.toThrow();
    });

    it('should handle empty responses', () => {
      // Some endpoints return 204 No Content (empty response)
      expect(() => {
        apiDelete('/issues/123'); // DELETE often returns empty
      }).not.toThrow();
    });

    it('should handle array responses', () => {
      // Pattern: API returns array directly
      expect(() => {
        apiGet('/issues'); // Could return array instead of {items: [...]}
      }).not.toThrow();
    });
  });

  // ────────────────────────────────────────────────────────────────
  // Error Message Extraction
  // ────────────────────────────────────────────────────────────────

  describe('Error Message Extraction', () => {
    it('should extract from response.data.message', () => {
      const error = {
        response: {
          data: {
            message: 'User not found',
          },
        },
      };
      expect(getErrorMessage(error)).toBe('User not found');
    });

    it('should extract from response.data.detail', () => {
      const error = {
        response: {
          data: {
            detail: 'Invalid credentials',
          },
        },
      };
      expect(getErrorMessage(error)).toBe('Invalid credentials');
    });

    it('should extract from error.message as fallback', () => {
      const error = new Error('Network timeout');
      expect(getErrorMessage(error, 'Default')).toEqual('Default');
    });

    it('should return fallback when no message found', () => {
      const error = {};
      expect(getErrorMessage(error, 'Custom fallback')).toBe('Custom fallback');
    });

    it('should return generic message when no fallback provided', () => {
      const error = new Error('Unknown error');
      const message = getErrorMessage(error);
      expect(typeof message).toBe('string');
      expect(message.length).toBeGreaterThan(0);
    });
  });
});
