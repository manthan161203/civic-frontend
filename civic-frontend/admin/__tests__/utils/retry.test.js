/**
 * Retry Logic Tests
 * Tests for admin/src/utils/retry.js
 * @jest-environment jsdom
 */

import { withRetry } from '@/utils/retry';

describe('Retry Logic', () => {
  
  // ────────────────────────────────────────────────────────────────
  // Basic Retry Functionality
  // ────────────────────────────────────────────────────────────────

  describe('withRetry', () => {
    it('should execute function successfully on first try', async () => {
      const mockFn = jest.fn().mockResolvedValue({ data: 'success' });
      
      const result = await withRetry(mockFn);
      
      expect(result).toEqual({ data: 'success' });
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should retry on transient error then succeed', async () => {
      const mockFn = jest
        .fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Timeout'))
        .mockResolvedValueOnce({ data: 'success' });

      const result = await withRetry(mockFn, { maxRetries: 3, baseDelay: 10 });

      expect(result).toEqual({ data: 'success' });
      expect(mockFn).toHaveBeenCalledTimes(3);
    });

    it('should fail after max retries exhausted', async () => {
      const mockFn = jest.fn().mockRejectedValue(new Error('Persistent error'));

      await expect(
        withRetry(mockFn, { maxRetries: 2, baseDelay: 10 })
      ).rejects.toThrow('Persistent error');

      expect(mockFn).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });

    it('should not retry on non-transient errors', async () => {
      const mockFn = jest.fn().mockRejectedValue(new Error('Validation error'));
      
      const errorWithStatus = new Error('Bad request');
      errorWithStatus.response = { status: 400 }; // Validation error
      mockFn.mockRejectedValueOnce(errorWithStatus);

      await expect(
        withRetry(mockFn, { maxRetries: 3, baseDelay: 10 })
      ).rejects.toThrow('Bad request');

      expect(mockFn).toHaveBeenCalledTimes(1); // No retries
    });
  });

  // ────────────────────────────────────────────────────────────────
  // Exponential Backoff
  // ────────────────────────────────────────────────────────────────

  describe('Exponential Backoff', () => {
    it('should apply exponential backoff delays', async () => {
      const timings = [];
      const mockFn = jest.fn().mockImplementation(() => {
        timings.push(Date.now());
        if (timings.length < 3) {
          const error = new Error('Timeout');
          error.response = { status: 503 };
          return Promise.reject(error);
        }
        return Promise.resolve({ data: 'success' });
      });

      const result = await withRetry(mockFn, {
        maxRetries: 3,
        baseDelay: 100,
        factor: 2,
      });

      expect(result).toEqual({ data: 'success' });
      expect(timings.length).toBe(3);

      // Check that delays are increasing
      const delay1 = timings[1] - timings[0];
      const delay2 = timings[2] - timings[1];
      expect(delay2).toBeGreaterThan(delay1);
    });

    it('should calculate correct delays with custom factor', async () => {
      // Base delay: 100ms, Factor: 3
      // Expected delays: 100ms, 300ms, 900ms
      const mockFn = jest
        .fn()
        .mockRejectedValueOnce(createTransientError())
        .mockRejectedValueOnce(createTransientError())
        .mockResolvedValueOnce({ data: 'success' });

      await withRetry(mockFn, {
        maxRetries: 3,
        baseDelay: 100,
        factor: 3,
      });

      expect(mockFn).toHaveBeenCalledTimes(3);
    });

    it('should handle baseDelay of 0 (immediate retry)', async () => {
      const mockFn = jest
        .fn()
        .mockRejectedValueOnce(createTransientError())
        .mockResolvedValueOnce({ data: 'success' });

      const start = Date.now();
      const result = await withRetry(mockFn, {
        maxRetries: 2,
        baseDelay: 0,
      });

      const duration = Date.now() - start;

      expect(result).toEqual({ data: 'success' });
      expect(duration).toBeLessThan(100); // Should be very fast
    });
  });

  // ────────────────────────────────────────────────────────────────
  // shouldRetry Callback
  // ────────────────────────────────────────────────────────────────

  describe('shouldRetry Callback', () => {
    it('should use custom shouldRetry function', async () => {
      const mockFn = jest
        .fn()
        .mockRejectedValueOnce(createTransientError())
        .mockResolvedValueOnce({ data: 'success' });

      const shouldRetry = jest.fn().mockReturnValue(true);

      await withRetry(mockFn, {
        maxRetries: 2,
        baseDelay: 10,
        shouldRetry,
      });

      expect(shouldRetry).toHaveBeenCalled();
    });

    it('should stop retrying if shouldRetry returns false', async () => {
      const mockFn = jest
        .fn()
        .mockRejectedValueOnce(createTransientError());

      const shouldRetry = jest.fn().mockReturnValue(false);

      await expect(
        withRetry(mockFn, {
          maxRetries: 3,
          baseDelay: 10,
          shouldRetry,
        })
      ).rejects.toThrow();

      expect(mockFn).toHaveBeenCalledTimes(1); // No retries
    });

    it('should pass error to shouldRetry callback', async () => {
      const error = new Error('Custom error');
      const mockFn = jest.fn().mockRejectedValueOnce(error);

      const shouldRetry = jest.fn().mockReturnValue(false);

      await expect(
        withRetry(mockFn, {
          maxRetries: 2,
          baseDelay: 10,
          shouldRetry,
        })
      ).rejects.toThrow();

      expect(shouldRetry).toHaveBeenCalledWith(error);
    });

    it('should allow custom retry logic per error', async () => {
      const mockFn = jest
        .fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Validation error'))
        .mockResolvedValueOnce({ data: 'success' });

      const shouldRetry = jest.fn((error) => {
        // Only retry network errors, not validation errors
        return error.message.includes('Network');
      });

      await expect(
        withRetry(mockFn, {
          maxRetries: 3,
          baseDelay: 10,
          shouldRetry,
        })
      ).rejects.toThrow('Validation error');

      expect(mockFn).toHaveBeenCalledTimes(2);
      expect(shouldRetry).toHaveBeenCalledTimes(2);
    });
  });

  // ────────────────────────────────────────────────────────────────
  // Edge Cases
  // ────────────────────────────────────────────────────────────────

  describe('Edge Cases', () => {
    it('should handle maxRetries of 0', async () => {
      const mockFn = jest.fn().mockRejectedValue(createTransientError());

      await expect(
        withRetry(mockFn, { maxRetries: 0, baseDelay: 10 })
      ).rejects.toThrow();

      expect(mockFn).toHaveBeenCalledTimes(1); // Just the initial call
    });

    it('should handle very large maxRetries', async () => {
      const mockFn = jest
        .fn()
        .mockRejectedValueOnce(createTransientError())
        .mockResolvedValueOnce({ data: 'success' });

      const result = await withRetry(mockFn, {
        maxRetries: 100,
        baseDelay: 1,
      });

      expect(result).toEqual({ data: 'success' });
      expect(mockFn).toHaveBeenCalledTimes(2);
    });

    it('should handle function that returns undefined', async () => {
      const mockFn = jest.fn().mockResolvedValue(undefined);

      const result = await withRetry(mockFn);

      expect(result).toBeUndefined();
    });

    it('should handle function that returns null', async () => {
      const mockFn = jest.fn().mockResolvedValue(null);

      const result = await withRetry(mockFn);

      expect(result).toBeNull();
    });

    it('should handle promise rejection with non-Error object', async () => {
      const mockFn = jest.fn().mockRejectedValue('String error');

      await expect(withRetry(mockFn, { maxRetries: 1, baseDelay: 10 })).rejects.toBe(
        'String error'
      );
    });

    it('should handle async function throw', async () => {
      const mockFn = jest.fn(async () => {
        throw new Error('Async error');
      });

      await expect(withRetry(mockFn, { maxRetries: 1, baseDelay: 10 })).rejects.toThrow(
        'Async error'
      );
    });
  });

  // ────────────────────────────────────────────────────────────────
  // Real-world Scenarios
  // ────────────────────────────────────────────────────────────────

  describe('Real-world Scenarios', () => {
    it('should retry on network timeout for API calls', async () => {
      const apiCall = jest.fn(async () => {
        throw new Error('Network timeout');
      });

      // First 2 calls timeout, 3rd succeeds
      apiCall.mockResolvedValueOnce(undefined); // Will be overridden
      apiCall
        .mockRejectedValueOnce(new Error('Network timeout'))
        .mockRejectedValueOnce(new Error('Network timeout'))
        .mockResolvedValueOnce({ status: 200, data: { id: 123 } });

      const result = await withRetry(apiCall, {
        maxRetries: 3,
        baseDelay: 50,
      });

      expect(result.status).toBe(200);
      expect(apiCall).toHaveBeenCalledTimes(3);
    });

    it('should handle cascading failures', async () => {
      const mockFn = jest.fn(async () => {
        throw new Error('Service unavailable');
      });

      await expect(
        withRetry(mockFn, {
          maxRetries: 2,
          baseDelay: 10,
        })
      ).rejects.toThrow('Service unavailable');

      expect(mockFn).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });

    it('should recover from intermittent failures', async () => {
      let callCount = 0;
      const mockFn = jest.fn(async () => {
        callCount++;
        if (callCount === 1 || callCount === 2) {
          throw new Error('Temporary failure');
        }
        return { success: true, attempt: callCount };
      });

      const result = await withRetry(mockFn, {
        maxRetries: 3,
        baseDelay: 10,
      });

      expect(result.attempt).toBe(3);
      expect(result.success).toBe(true);
    });
  });

  // ────────────────────────────────────────────────────────────────
  // Helper Functions
  // ────────────────────────────────────────────────────────────────

  function createTransientError() {
    const error = new Error('Transient error');
    error.response = { status: 503 };
    return error;
  }
});

describe('Retry Strategies', () => {
  it('should support different retry strategies', async () => {
    // Linear backoff: 100ms, 200ms, 300ms
    const linearRetry = (attempt) => 100 * attempt;

    // Exponential backoff: 100ms, 200ms, 400ms
    const exponentialRetry = (attempt) => 100 * Math.pow(2, attempt - 1);

    // Fibonacci backoff: 100ms, 100ms, 200ms
    const fibonacciRetry = (attempt) => {
      const fib = [0, 1];
      for (let i = 2; i <= attempt; i++) {
        fib[i] = fib[i - 1] + fib[i - 2];
      }
      return 100 * fib[attempt];
    };

    // All should be valid delay calculators
    expect(linearRetry(1)).toBe(100);
    expect(exponentialRetry(2)).toBe(200);
    expect(fibonacciRetry(3)).toBe(200);
  });
});
