/**
 * The admin app's HTTP transport.
 *
 * One axios instance, one place that knows about tokens, one place that decides
 * what a failure means. Nothing above this layer should import axios or read
 * `localStorage` for credentials.
 *
 * Everything this module rejects with is an `ApiError` from `./errors.js`.
 */

import axios from 'axios';
import { ApiError, toApiError } from './errors';

/* ── Configuration ───────────────────────────────────────────────────────── */

/**
 * Base URL, from the environment.
 *
 * `NEXT_PUBLIC_` is required for this to reach the browser bundle. The
 * localhost fallback exists so `npm run dev` works with no `.env.local`; in a
 * production build a missing value is a deployment mistake, so we say so
 * loudly rather than silently pointing the console at localhost.
 */
export const BASE_URL = (() => {
  const configured = process.env.NEXT_PUBLIC_API_URL;
  if (configured) return configured.replace(/\/+$/, '');
  if (process.env.NODE_ENV === 'production' && typeof window !== 'undefined') {
    console.error(
      '[api] NEXT_PUBLIC_API_URL is not set. The admin app will try localhost:8000 ' +
        'and every request will fail. Set it at build time.',
    );
  }
  return 'http://localhost:8000';
})();

/** Long enough for the slower admin reports; short enough to surface a hang. */
const TIMEOUT_MS = 20_000;

const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';

/* ── Token storage ───────────────────────────────────────────────────────── */

const isBrowser = () => typeof window !== 'undefined';

export const tokens = {
  /** @returns {string | null} */
  getAccess: () => (isBrowser() ? localStorage.getItem(ACCESS_TOKEN_KEY) : null),
  /** @returns {string | null} */
  getRefresh: () => (isBrowser() ? localStorage.getItem(REFRESH_TOKEN_KEY) : null),
  /**
   * @param {string} access
   * @param {string} refresh
   */
  set(access, refresh) {
    if (!isBrowser()) return;
    localStorage.setItem(ACCESS_TOKEN_KEY, access);
    localStorage.setItem(REFRESH_TOKEN_KEY, refresh);
  },
  clear() {
    if (!isBrowser()) return;
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  },
};

/* ── Session-ended notification ──────────────────────────────────────────── */

/** @type {Set<() => void>} */
const sessionEndedHandlers = new Set();

/**
 * Register a callback for "the session is over, send the user to login".
 *
 * The transport does not navigate. It used to set `window.location.href`
 * directly, which meant a full page reload on every expiry and made the client
 * impossible to test. The auth store subscribes instead.
 *
 * @param {() => void} handler
 * @returns {() => void} unsubscribe
 */
export function onSessionEnded(handler) {
  sessionEndedHandlers.add(handler);
  return () => sessionEndedHandlers.delete(handler);
}

function endSession() {
  tokens.clear();
  for (const handler of sessionEndedHandlers) {
    try {
      handler();
    } catch (err) {
      console.error('[api] session-ended handler threw', err);
    }
  }
}

/* ── The instance ────────────────────────────────────────────────────────── */

const http = axios.create({
  baseURL: BASE_URL,
  timeout: TIMEOUT_MS,
  headers: { 'Content-Type': 'application/json' },
});

let requestCounter = 0;

http.interceptors.request.use((config) => {
  const token = tokens.getAccess();
  if (token) config.headers.Authorization = `Bearer ${token}`;

  // The backend propagates X-Request-ID into its logs and into ApiError, so a
  // support report can be traced to the exact server-side request.
  if (!config.headers['X-Request-ID']) {
    requestCounter += 1;
    config.headers['X-Request-ID'] =
      `admin-${Date.now().toString(36)}-${requestCounter.toString(36)}`;
  }
  return config;
});

/* ── Token refresh ───────────────────────────────────────────────────────── */

/**
 * Endpoints that must never trigger a refresh attempt.
 *
 * Refreshing in response to a failed refresh is an infinite loop, and a failed
 * login is a wrong password, not an expired session.
 */
const NO_REFRESH = ['/auth/refresh', '/auth/login', '/auth/send-otp', '/auth/verify-otp'];

/** In-flight refresh, so N concurrent 401s produce one refresh call. */
/** @type {Promise<string> | null} */
let refreshInFlight = null;

/**
 * Exchange the refresh token for a new pair.
 * @returns {Promise<string>} the new access token
 */
function refreshAccessToken() {
  if (refreshInFlight) return refreshInFlight;

  const refresh = tokens.getRefresh();
  if (!refresh) return Promise.reject(new Error('no refresh token'));

  // A bare axios call, not `http` — going back through this instance would
  // re-enter the interceptor with the old access token.
  refreshInFlight = axios
    .post(
      `${BASE_URL}/auth/refresh`,
      { refresh_token: refresh },
      { timeout: TIMEOUT_MS, headers: { 'Content-Type': 'application/json' } },
    )
    .then(({ data }) => {
      if (!data?.access_token || !data?.refresh_token) {
        throw new Error('refresh response missing tokens');
      }
      tokens.set(data.access_token, data.refresh_token);
      return data.access_token;
    })
    .finally(() => {
      refreshInFlight = null;
    });

  return refreshInFlight;
}

http.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    const status = error.response?.status;

    /*
     * Order matters here, and getting it wrong is what broke the old client.
     *
     * It ran `if (isAuthError(error))` first — where `isAuthError` was
     * `status === 401 || status === 403` — cleared the tokens and returned.
     * The refresh branch below it was unreachable, so *every* access-token
     * expiry was a hard logout, roughly hourly, despite a complete and correct
     * refresh implementation sitting right there. And because 403 took the
     * same path, a scoped admin browsing outside their jurisdiction was logged
     * out instead of being told "not allowed".
     *
     * So: 401 tries refresh first and only ends the session if that fails.
     * 403 never ends the session.
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
        return await http(original);
      } catch {
        endSession();
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

    // A 401 we could not refresh past (no refresh token, or the retry 401'd
    // again) genuinely ends the session.
    if (status === 401) endSession();

    return Promise.reject(toApiError(error));
  },
);

/* ── Retry ───────────────────────────────────────────────────────────────── */

const MAX_ATTEMPTS = 3;
const BASE_DELAY_MS = 500;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Retry a request while it keeps failing transiently.
 *
 * Only `ApiError.retryable` failures are retried — network errors, timeouts,
 * 429 and 5xx. The previous helper retried on any error object it did not
 * recognise, which meant a 422 was re-sent three times and the user waited
 * three seconds to be told their form was invalid.
 *
 * @template T
 * @param {() => Promise<T>} attempt
 * @param {{ retries?: number }} [options]
 * @returns {Promise<T>}
 */
async function withRetry(attempt, { retries = MAX_ATTEMPTS } = {}) {
  let lastError;
  for (let n = 0; n < retries; n += 1) {
    try {
      return await attempt();
    } catch (error) {
      lastError = error instanceof ApiError ? error : toApiError(error);
      if (!lastError.retryable || n === retries - 1) throw lastError;
      // Exponential backoff with jitter, so a recovering server does not get
      // hit by every open tab at the same instant.
      await sleep(BASE_DELAY_MS * 2 ** n + Math.random() * 200);
    }
  }
  throw lastError;
}

/* ── Verb helpers ────────────────────────────────────────────────────────── */

/*
 * These return the response body directly rather than the axios envelope.
 *
 * Existing pages destructure `{ data }`, so `index.js` keeps that shape for
 * now; these are what new code should use. Returning the body is what makes
 * the shared types useful — `await api.get('/admin/dashboard')` is a
 * `DashboardStats`, not an `AxiosResponse<DashboardStats>`.
 */

/**
 * @template T
 * @param {string} url
 * @param {{ params?: Record<string, unknown>, signal?: AbortSignal }} [config]
 * @returns {Promise<T>}
 */
export const get = (url, config) =>
  withRetry(() => http.get(url, config)).then((r) => r.data);

/**
 * @template T
 * @param {string} url
 * @param {unknown} [body]
 * @param {{ params?: Record<string, unknown>, headers?: Record<string, string>, signal?: AbortSignal }} [config]
 * @returns {Promise<T>}
 */
export const post = (url, body, config) =>
  withRetry(() => http.post(url, body, config)).then((r) => r.data);

/** @template T @returns {Promise<T>} */
export const put = (url, body, config) =>
  withRetry(() => http.put(url, body, config)).then((r) => r.data);

/** @template T @returns {Promise<T>} */
export const patch = (url, body, config) =>
  withRetry(() => http.patch(url, body, config)).then((r) => r.data);

/** @template T @returns {Promise<T>} */
export const del = (url, config) =>
  withRetry(() => http.delete(url, config)).then((r) => r.data);

export { http, withRetry };
export default http;
