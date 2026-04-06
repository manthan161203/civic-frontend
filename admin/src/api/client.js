import axios from 'axios';
import { getErrorMessage, isAuthError } from '@/utils/errorHandler';
import { withRetry } from '@/utils/retry';
import { useUiStore } from '@/store/uiStore';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Track refresh in progress to prevent multiple refresh calls
let refreshPromise = null;

// Attach token on every request
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('access_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auto-refresh on 401 with race condition prevention
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    const uiStore = useUiStore.getState();
    
    // Handle auth errors (401, 403)
    if (isAuthError(error)) {
      // Clear auth state
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      
      // Close all modals
      uiStore.closeAllModals?.();
      
      // Redirect to login
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
      
      return Promise.reject(error);
    }
    
    // Check if this is a 401 and we haven't already retried (for token refresh)
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      
      try {
        const refresh = localStorage.getItem('refresh_token');
        if (!refresh) throw new Error('No refresh token');
        
        // If refresh is already in progress, wait for it
        if (refreshPromise) {
          const { access_token } = await refreshPromise;
          original.headers.Authorization = `Bearer ${access_token}`;
          return api(original);
        }
        
        // Create new refresh promise
        refreshPromise = axios.post(`${BASE_URL}/auth/refresh`, { refresh_token: refresh });
        
        const { data } = await refreshPromise;
        localStorage.setItem('access_token', data.access_token);
        localStorage.setItem('refresh_token', data.refresh_token);
        original.headers.Authorization = `Bearer ${data.access_token}`;
        
        // Clear refresh promise
        refreshPromise = null;
        
        return api(original);
      } catch (refreshError) {
        // Clear refresh promise on error
        refreshPromise = null;
        
        // Only redirect to login if refresh actually failed
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        
        // Redirect to login only in browser context
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
        
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);

/**
 * API wrapper functions with automatic retry
 * These wrappers automatically handle retries for transient failures
 * (network errors, 408, 429, 5xx errors)
 */

export const apiCallWithRetry = (apiCall, options = {}) => {
  return withRetry(apiCall, {
    maxRetries: 3,
    baseDelay: 1000,
    ...options,
  });
};

/**
 * GET request with automatic retry
 * @param {string} url - Endpoint URL
 * @param {object} params - Query parameters
 * @param {object} options - Retry options
 * @example
 * const issues = await apiGet('/issues', { page: 1, size: 10 });
 */
export const apiGet = (url, params, options) => {
  return apiCallWithRetry(
    () => api.get(url, params ? { params } : {}),
    options
  );
};

/**
 * POST request with automatic retry
 * @param {string} url - Endpoint URL
 * @param {object} data - Request body
 * @param {object} options - Retry options
 * @example
 * const newIssue = await apiPost('/issues', { type: 'roads', description: '...' });
 */
export const apiPost = (url, data, options) => {
  return apiCallWithRetry(
    () => api.post(url, data),
    options
  );
};

/**
 * PUT request with automatic retry
 */
export const apiPut = (url, data, options) => {
  return apiCallWithRetry(
    () => api.put(url, data),
    options
  );
};

/**
 * PATCH request with automatic retry
 */
export const apiPatch = (url, data, options) => {
  return apiCallWithRetry(
    () => api.patch(url, data),
    options
  );
};

/**
 * DELETE request with automatic retry
 * @example
 * await apiDelete(`/issues/${id}`);
 */
export const apiDelete = (url, options) => {
  return apiCallWithRetry(
    () => api.delete(url),
    options
  );
};

// Export error handler for use in components
export { getErrorMessage };

export default api;
