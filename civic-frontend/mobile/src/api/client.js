import axios from 'axios';
import * as SecureStore from '../utils/secureStoreShim';
import { getErrorMessage, isAuthError } from '@/utils/errorHandler';
import { withRetry } from '@/utils/retry';
import { useUiStore } from '@/store/uiStore';

export const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Track refresh in progress to prevent race conditions
let refreshPromise = null;

// Attach access token to every request
api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
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
      try {
        await SecureStore.deleteItemAsync('access_token');
        await SecureStore.deleteItemAsync('refresh_token');
      } catch (err) {
        console.error('Error clearing tokens:', err);
      }

      // Close all modals and bottom sheets
      uiStore.closeAllModals?.();
      uiStore.closeAllBottomSheets?.();

      // Signal to auth store to redirect to login
      const { useAuthStore } = await import('@/store/authStore');
      useAuthStore.getState().clearSession();

      return Promise.reject(error);
    }
    
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const refresh = await SecureStore.getItemAsync('refresh_token');
        if (!refresh) throw new Error('No refresh token');
        
        // If refresh is already in progress, wait for it
        if (refreshPromise) {
          const { access_token } = await refreshPromise;
          original.headers.Authorization = `Bearer ${access_token}`;
          return api(original);
        }
        
        // Create new refresh promise
        refreshPromise = axios.post(`${BASE_URL}/auth/refresh`, {
          refresh_token: refresh,
        });
        
        const { data } = await refreshPromise;
        await SecureStore.setItemAsync('access_token', data.access_token);
        await SecureStore.setItemAsync('refresh_token', data.refresh_token);
        original.headers.Authorization = `Bearer ${data.access_token}`;
        
        // Clear refresh promise
        refreshPromise = null;
        
        return api(original);
      } catch (refreshError) {
        // Clear refresh promise on error
        refreshPromise = null;
        
        // Only clear session if refresh actually failed
        await SecureStore.deleteItemAsync('access_token');
        await SecureStore.deleteItemAsync('refresh_token');
        
        // Signal to auth store to clear session and redirect to login
        const { useAuthStore } = await import('@/store/authStore');
        useAuthStore.getState().clearSession();
        
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);

/**
 * API wrapper functions with automatic retry
 * These wrappers automatically handle retries for transient failures
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
 */
export const apiGet = (url, params, options) => {
  return apiCallWithRetry(
    () => api.get(url, params ? { params } : {}),
    options
  );
};

/**
 * POST request with automatic retry
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
 */
export const apiDelete = (url, options) => {
  return apiCallWithRetry(
    () => api.delete(url),
    options
  );
};

export { getErrorMessage };

export default api;
