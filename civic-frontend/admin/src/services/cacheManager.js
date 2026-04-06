/**
 * API Caching & Deduplication Layer
 * Stream 5: Cache responses to reduce API calls, deduplicate requests, optimize performance
 */

class ResponseCache {
  constructor(ttl = 5 * 60 * 1000) {
    // TTL: 5 minutes by default
    this.cache = new Map();
    this.pendingRequests = new Map();
    this.ttl = ttl;
  }

  /**
   * Generate cache key from endpoint and params
   */
  _generateKey(endpoint, params) {
    const paramStr = params ? JSON.stringify(params) : '';
    return `${endpoint}:${paramStr}`;
  }

  /**
   * Check if cache entry is still valid
   */
  _isCacheValid(entry) {
    if (!entry) return false;
    const now = Date.now();
    return now - entry.timestamp < this.ttl;
  }

  /**
    * Get from cache if valid
   */
  get(endpoint, params) {
    const key = this._generateKey(endpoint, params);
    const entry = this.cache.get(key);

    if (this._isCacheValid(entry)) {
      console.debug(`[Cache Hit] ${key}`);
      return entry.data;
    }

    // Cache expired, remove it
    if (entry) {
      this.cache.delete(key);
    }
    return null;
  }

  /**
   * Set cache entry
   */
  set(endpoint, params, data) {
    const key = this._generateKey(endpoint, params);
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
    console.debug(`[Cache Set] ${key}`);
  }

  /**
   * Invalidate specific cache entry
   */
  invalidate(endpoint, params) {
    const key = this._generateKey(endpoint, params);
    this.cache.delete(key);
    console.debug(`[Cache Invalidated] ${key}`);
  }

  /**
   * Deduplicate pending requests
   * If same request is already in flight, return existing promise
   */
  async deduplicateRequest(endpoint, params, fetchFn) {
    const key = this._generateKey(endpoint, params);

    // Check cache first
    const cached = this.get(endpoint, params);
    if (cached) {
      return cached;
    }

    // Check if request already in flight
    if (this.pendingRequests.has(key)) {
      console.debug(`[Dedup] Returning pending request for ${key}`);
      return this.pendingRequests.get(key);
    }

    // Execute and cache the request
    const promise = fetchFn()
      .then((data) => {
        this.set(endpoint, params, data);
        return data;
      })
      .finally(() => {
        this.pendingRequests.delete(key);
      });

    this.pendingRequests.set(key, promise);
    return promise;
  }

  /**
   * Clear entire cache
   */
  clear() {
    this.cache.clear();
    console.debug('[Cache] Cleared all entries');
  }

  /**
   * Get cache stats
   */
  getStats() {
    return {
      size: this.cache.size,
      pendingRequests: this.pendingRequests.size,
      ttl: this.ttl,
    };
  }
}

// Global cache instance
export const apiCache = new ResponseCache(5 * 60 * 1000); // 5 minutes TTL

/**
 * Wrapper for cached API calls
 * Usage: cachedApiCall('api/issues', params, () => apiGet('/issues', params))
 */
export const cachedApiCall = async (endpoint, params, fetchFn) => {
  return apiCache.deduplicateRequest(endpoint, params, fetchFn);
};

/**
 * Invalidate cache for mutations (POST, PUT, DELETE)
 */
export const invalidateRelatedCache = (patterns) => {
  // patterns could be like ['api/issues', 'api/workers']
  for (const [key] of apiCache.cache) {
    if (patterns.some((p) => key.includes(p))) {
      apiCache.invalidate(key.split(':')[0], null);
    }
  }
};

export default {
  apiCache,
  cachedApiCall,
  invalidateRelatedCache,
};
