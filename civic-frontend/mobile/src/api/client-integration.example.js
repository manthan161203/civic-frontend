/**
 * API Client Integration for React Native (Mobile)
 * 
 * Location: mobile/src/api/client-integration.example.js
 */

import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { useUiStore } from '@/store/uiStore';
import { getErrorMessage, isAuthError } from '@/utils/errorHandler';
import { withRetry } from '@/utils/retry';

/**
 * Create axios instance for React Native
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
 * Attach auth token from secure storage
 */
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await SecureStore.getItemAsync('access_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Failed to retrieve token:', error);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

/**
 * Response Interceptor with Error Handling
 */
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const uiStore = useUiStore.getState();

    // Handle auth errors
    if (isAuthError(error)) {
      try {
        await SecureStore.deleteItemAsync('access_token');
        await SecureStore.deleteItemAsync('refresh_token');
      } catch (storageError) {
        console.error('Failed to clear tokens:', storageError);
      }

      // Close all bottom sheets and modals
      uiStore.closeAllModals();
      uiStore.closeAllBottomSheets();

      // Redirect to login (implement based on your navigation)
      // rootNavigate('Login');

      return Promise.reject(error);
    }

    console.error('API Error:', error);

    return Promise.reject(error);
  }
);

/**
 * Wrapper with automatic retry
 */
export const apiCallWithRetry = (apiCall, options = {}) => {
  return withRetry(apiCall, {
    maxRetries: 3,
    baseDelay: 1000,
    ...options,
  });
};

/**
 * GET wrapper
 */
export const apiGet = (url, params, options) => {
  return apiCallWithRetry(
    () => api.get(url, params ? { params } : {}),
    options
  );
};

/**
 * POST wrapper
 */
export const apiPost = (url, data, options) => {
  return apiCallWithRetry(
    () => api.post(url, data),
    options
  );
};

/**
 * PUT wrapper
 */
export const apiPut = (url, data, options) => {
  return apiCallWithRetry(
    () => api.put(url, data),
    options
  );
};

/**
 * PATCH wrapper
 */
export const apiPatch = (url, data, options) => {
  return apiCallWithRetry(
    () => api.patch(url, data),
    options
  );
};

/**
 * DELETE wrapper
 */
export const apiDelete = (url, options) => {
  return apiCallWithRetry(
    () => api.delete(url),
    options
  );
};

export { getErrorMessage };

export default api;
