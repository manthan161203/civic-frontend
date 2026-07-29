/**
 * The mobile app's HTTP transport.
 *
 * One axios instance, one place that knows about tokens, one place that decides
 * what a failure means. Nothing above this layer should import axios or read
 * SecureStore for credentials.
 *
 * Everything this module rejects with is an `ApiError` from `./errors.js`.
 */

import axios from 'axios';
import * as SecureStore from './secureStorage';
import { ApiError, toApiError } from './errors';
import { API_URL, API_TIMEOUT_MS, API_MAX_RETRIES, DEBUG_NETWORK } from '../config/env';
import {
  noteRequestStarted,
  noteRequestFinished,
  noteRetryStarted,
  noteRetryFinished,
  getNetworkState,
} from './networkStatus';

/* ── Configuration ───────────────────────────────────────────────────────── */

/**
 * Base URL and timeouts come from `@/config/env`, which resolves them per
 * environment (development / staging / production) and validates them at
 * startup. Nothing here reads `process.env` directly any more.
 */
export const BASE_URL = API_URL;

const TIMEOUT_MS = API_TIMEOUT_MS;

const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';

/* ── Token storage ───────────────────────────────────────────────────────── */

export const tokens = {
  /** @returns {Promise<string | null>} */
  getAccess: () => SecureStore.getItemAsync(ACCESS_TOKEN_KEY),
  /** @returns {Promise<string | null>} */
  getRefresh: () => SecureStore.getItemAsync(REFRESH_TOKEN_KEY),
  /**
   * @param {string} access
   * @param {string} refresh
   */
  async set(access, refresh) {
    await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, access);
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refresh);
  },
  async clear() {
    // Never let a storage failure prevent the session being cleared — leaving
    // a stale token behind is worse than a redundant delete.
    await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY).catch(() => {});
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY).catch(() => {});
  },
};

/* ── Session-ended notification ──────────────────────────────────────────── */

/** @type {Set<() => void>} */
const sessionEndedHandlers = new Set();

/**
 * Register a callback for "the session is over, send the user to sign-in".
 *
 * The transport does not navigate. It used to reach into the auth store via a
 * dynamic `import()` inside the interceptor, which hid the dependency and made
 * the client impossible to test in isolation.
 *
 * @param {() => void} handler
 * @returns {() => void} unsubscribe
 */
export function onSessionEnded(handler) {
  sessionEndedHandlers.add(handler);
  return () => sessionEndedHandlers.delete(handler);
}

async function endSession() {
  await tokens.clear();
  for (const handler of sessionEndedHandlers) {
    try {
      handler();
    } catch (err) {
      console.error('[api] session-ended handler threw', err);
    }
  }
}

/* ── The instance ────────────────────────────────────────────────────────── */

const api = axios.create({
  baseURL: BASE_URL,
  timeout: TIMEOUT_MS,
  headers: { 'Content-Type': 'application/json' },
});

let requestCounter = 0;

api.interceptors.request.use(async (config) => {
  const token = await tokens.getAccess();
  if (token) config.headers.Authorization = `Bearer ${token}`;

  if (!config.headers['X-Request-ID']) {
    requestCounter += 1;
    config.headers['X-Request-ID'] =
      `mobile-${Date.now().toString(36)}-${requestCounter.toString(36)}`;
  }

  // Feeds the offline / slow-network UI. See ./networkStatus.js — the banner
  // needs to know a request is in flight to decide whether "slow" is a fair
  // thing to tell the user.
  noteRequestStarted();

  if (DEBUG_NETWORK) {
    console.log(`[api] → ${config.method?.toUpperCase()} ${config.url}`);
  }
  return config;
});

/* ── Token refresh ───────────────────────────────────────────────────────── */

/** Refreshing in response to a failed refresh is an infinite loop. */
const NO_REFRESH = [
  '/auth/refresh',
  '/auth/login',
  '/auth/register',
  '/auth/send-otp',
  '/auth/verify-otp',
  '/auth/google',
  '/auth/forgot-password',
  '/auth/reset-password',
];

/** @type {Promise<string> | null} */
let refreshInFlight = null;

/** @returns {Promise<string>} the new access token */
function refreshAccessToken() {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    const refresh = await tokens.getRefresh();
    if (!refresh) throw new Error('no refresh token');

    // A bare axios call, not `api` — going back through this instance would
    // re-enter the interceptor with the old access token.
    const { data } = await axios.post(
      `${BASE_URL}/auth/refresh`,
      { refresh_token: refresh },
      { timeout: TIMEOUT_MS, headers: { 'Content-Type': 'application/json' } },
    );
    if (!data?.access_token || !data?.refresh_token) {
      throw new Error('refresh response missing tokens');
    }
    await tokens.set(data.access_token, data.refresh_token);
    return data.access_token;
  })().finally(() => {
    refreshInFlight = null;
  });

  return refreshInFlight;
}

api.interceptors.response.use(
  (response) => {
    noteRequestFinished({ ok: true });
    if (DEBUG_NETWORK) {
      console.log(`[api] ← ${response.status} ${response.config.url}`);
    }
    return response;
  },
  async (error) => {
    const original = error.config;
    const status = error.response?.status;

    // A response-less failure is a connectivity problem, not a server problem;
    // the distinction is what lets the banner say "offline" rather than
    // "something went wrong".
    noteRequestFinished({ ok: false, isNetworkFailure: !error.response });

    if (DEBUG_NETWORK) {
      console.log(`[api] ✗ ${status ?? 'network'} ${original?.url ?? ''}`);
    }

    /*
     * Order matters, and getting it wrong is what broke the old client.
     *
     * It ran `if (isAuthError(error))` first — where `isAuthError` was
     * `status === 401 || status === 403` — cleared SecureStore and returned.
     * The refresh branch below it was unreachable, so every access-token
     * expiry (60 minutes) signed the user out of the app, despite a complete
     * refresh implementation sitting right there. That lands harder on mobile
     * than on the web: it drops you back to the OTP screen mid-task, and any
     * half-composed report goes with it.
     *
     * And because 403 took the same path, opening something you happen not to
     * own logged you out rather than saying "not allowed".
     */
    if (
      status === 401 &&
      original &&
      !original._retriedAfterRefresh &&
      !NO_REFRESH.some((path) => (original.url ?? '').includes(path))
    ) {
      original._retriedAfterRefresh = true;
      try {
        const accessToken = await refreshAccessToken();
        original.headers = { ...original.headers, Authorization: `Bearer ${accessToken}` };
        return await api(original);
      } catch {
        await endSession();
        return Promise.reject(
          new ApiError({
            kind: 'unauthenticated',
            message: 'Your session has expired. Please sign in again.',
            status: 401,
            cause: error,
          }),
        );
      }
    }

    // A 401 we could not refresh past genuinely ends the session.
    if (status === 401) await endSession();

    return Promise.reject(toApiError(error));
  },
);

/* ── Retry ───────────────────────────────────────────────────────────────── */

const MAX_ATTEMPTS = API_MAX_RETRIES;
const BASE_DELAY_MS = 700;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Retry a request while it keeps failing transiently.
 *
 * Only `ApiError.retryable` failures qualify — network, timeout, 429, 5xx. The
 * previous helper retried anything it did not recognise, so a 422 was sent
 * three times before the user was told their form was invalid.
 *
 * @template T
 * @param {() => Promise<T>} attempt
 * @param {{ retries?: number }} [options]
 * @returns {Promise<T>}
 */
export async function withRetry(attempt, { retries = MAX_ATTEMPTS } = {}) {
  let lastError;
  let announcedRetry = false;

  try {
    for (let n = 0; n < retries; n += 1) {
      try {
        return await attempt();
      } catch (error) {
        lastError = error instanceof ApiError ? error : toApiError(error);
        if (!lastError.retryable || n === retries - 1) throw lastError;

        // Tell the UI once per request, not once per attempt.
        if (!announcedRetry) {
          announcedRetry = true;
          noteRetryStarted();
        }

        /*
         * Do not burn the remaining attempts against a radio that is off.
         * Backing off for 700ms and trying again while the device is in a
         * tunnel just spends the retry budget before connectivity returns;
         * waiting out the offline period is what the user actually wants.
         */
        if (getNetworkState().isOffline) {
          const { waitForConnection } = await import('./networkStatus');
          const reconnected = await waitForConnection(15_000);
          if (!reconnected) throw lastError;
        } else {
          await sleep(BASE_DELAY_MS * 2 ** n + Math.random() * 300);
        }
      }
    }
    throw lastError;
  } finally {
    if (announcedRetry) noteRetryFinished();
  }
}

/* ── Verb helpers ────────────────────────────────────────────────────────── */

/*
 * These return the response body directly. The domain modules in this folder
 * still resolve to `{ data }`, because every screen destructures that; these
 * are what new code should use.
 */

/** @template T @returns {Promise<T>} */
export const get = (url, config) => withRetry(() => api.get(url, config)).then((r) => r.data);

/** @template T @returns {Promise<T>} */
export const post = (url, body, config) =>
  withRetry(() => api.post(url, body, config)).then((r) => r.data);

/** @template T @returns {Promise<T>} */
export const put = (url, body, config) =>
  withRetry(() => api.put(url, body, config)).then((r) => r.data);

/** @template T @returns {Promise<T>} */
export const patch = (url, body, config) =>
  withRetry(() => api.patch(url, body, config)).then((r) => r.data);

/** @template T @returns {Promise<T>} */
export const del = (url, config) => withRetry(() => api.delete(url, config)).then((r) => r.data);

export { getErrorMessage, getFieldErrors, ApiError, toApiError, isQueueable } from './errors';
export { api };
export default api;
