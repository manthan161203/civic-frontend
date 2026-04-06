/**
 * API Client Integration with Error Handlers and Retry Logic
 * 
 * This file shows how to integrate error handlers and retry logic
 * into your existing API client
 * 
 * Location: admin/src/api/client.js
 */

import axios from 'axios';
import { useUiStore } from '@/store/uiStore';
import { getErrorMessage, isAuthError } from '@/utils/errorHandler';
import { withRetry } from '@/utils/retry';

/**
 * Create axios instance
 */
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:8000',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Request Interceptor
 * Attach auth token to all requests
 */
api.interceptors.request.use(
  (config) => {
    // Add token if available
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

/**
 * Response Interceptor with Error Handling
 * Handles auth errors, converts to user-friendly messages
 */
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const uiStore = useUiStore.getState();

    // Handle auth errors (401, 403)
    if (isAuthError(error)) {
      // Clear auth state
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      
      // Close all modals
      uiStore.closeAllModals();
      
      // Redirect to login (implement based on your router)
      window.location.href = '/login';
      
      return Promise.reject(error);
    }

    // Log error to console for debugging
    console.error('API Error:', error);

    return Promise.reject(error);
  }
);

/**
 * Wrapper function for API calls with automatic retry
 * 
 * @param {Function} apiCall - The api call to make
 * @param {Object} options - Retry options
 * @returns {Promise} API response
 * 
 * @example
 * const issues = await apiCallWithRetry(
 *   () => api.get('/issues'),
 *   { maxRetries: 3 }
 * );
 */
export const apiCallWithRetry = (apiCall, options = {}) => {
  return withRetry(apiCall, {
    maxRetries: 3,
    baseDelay: 1000,
    ...options,
  });
};

/**
 * Wrapper for GET requests with retry
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
 * Wrapper for POST requests with retry
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
 * Wrapper for PUT requests with retry
 * @example
 * const updated = await apiPut(`/issues/${id}`, { status: 'resolved' });
 */
export const apiPut = (url, data, options) => {
  return apiCallWithRetry(
    () => api.put(url, data),
    options
  );
};

/**
 * Wrapper for PATCH requests with retry
 */
export const apiPatch = (url, data, options) => {
  return apiCallWithRetry(
    () => api.patch(url, data),
    options
  );
};

/**
 * Wrapper for DELETE requests with retry
 * @example
 * await apiDelete(`/issues/${id}`);
 */
export const apiDelete = (url, options) => {
  return apiCallWithRetry(
    () => api.delete(url),
    options
  );
};

/**
 * Error Handler Helper - Use in react components
 * 
 * @example
 * try {
 *   const data = await apiGet('/issues');
 * } catch (error) {
 *   const message = getErrorMessage(error);
 *   useErrorNotification()(message);
 * }
 */
export { getErrorMessage };

export default api;
