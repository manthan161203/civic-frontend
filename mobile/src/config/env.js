/**
 * Environment configuration.
 *
 * One place that knows which backend this build talks to and what it is allowed
 * to do. Everything else imports from here rather than reading
 * `process.env.EXPO_PUBLIC_*` directly, so switching environments is a build
 * flag rather than a search-and-replace.
 *
 * Values arrive two ways and both are checked:
 *
 *  - `Constants.expoConfig.extra` — baked in by `app.config.js` at build time.
 *    This is what a released binary uses; it cannot be changed after the fact.
 *  - `process.env.EXPO_PUBLIC_*` — inlined by Metro. Useful in development for
 *    pointing a running app at a different machine without a rebuild.
 *
 * `extra` wins, because a shipped build should not be steerable by whatever
 * happened to be in the shell that started Metro.
 */

import Constants from 'expo-constants';

const extra = Constants.expoConfig?.extra ?? {};

/** @typedef {'development' | 'staging' | 'production'} AppEnv */

/** @type {AppEnv} */
export const APP_ENV = extra.appEnv ?? process.env.EXPO_PUBLIC_APP_ENV ?? 'development';

export const IS_DEV = APP_ENV === 'development';
export const IS_STAGING = APP_ENV === 'staging';
export const IS_PROD = APP_ENV === 'production';

/**
 * Backend base URL, without a trailing slash.
 *
 * The development default is deliberately `localhost`, which is correct for a
 * simulator and wrong for a physical device — on a phone, localhost is the
 * phone. `assertConfig()` below says so rather than letting every request fail
 * with an opaque network error.
 */
export const API_URL = String(
  extra.apiUrl ?? process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000',
).replace(/\/+$/, '');

/** Request timeout. Mobile networks are slow; staging and prod get longer. */
export const API_TIMEOUT_MS = IS_DEV ? 15_000 : 30_000;

/** How many times the transport retries a genuinely transient failure. */
export const API_MAX_RETRIES = 3;

/**
 * How long a request may run before the UI admits it is slow.
 *
 * Not a timeout — the request continues. It is the point at which staying
 * silent stops being honest, because on a weak connection the difference
 * between "working" and "hung" is invisible without it.
 */
export const SLOW_REQUEST_MS = 4_000;

export const GOOGLE_MAPS_API_KEY =
  extra.googleMapsApiKey ?? process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? null;

export const GOOGLE_CONFIG = {
  webClientId: extra.googleWebClientId ?? process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? null,
  iosClientId: extra.googleIosClientId ?? process.env.EXPO_PUBLIC_GOOGLE_iOS_CLIENT_ID ?? null,
  androidClientId:
    extra.googleAndroidClientId ?? process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ?? null,
};

/** Verbose request logging. Never on in production, regardless of config. */
export const DEBUG_NETWORK = IS_DEV && extra.debugNetwork !== false;

/**
 * Check the configuration and report anything that will cause failures later.
 *
 * Called once from the root layout. It warns rather than throws in development
 * — a missing Maps key should not stop you working on the report flow — but a
 * production build pointing at localhost or plain HTTP is a packaging mistake
 * worth being loud about.
 *
 * @returns {{ level: 'error'|'warn', message: string }[]}
 */
export function assertConfig() {
  /** @type {{ level: 'error'|'warn', message: string }[]} */
  const problems = [];

  if (!API_URL) {
    problems.push({ level: 'error', message: 'API_URL is empty. The app cannot reach the backend.' });
  }

  if (IS_PROD) {
    if (/localhost|127\.0\.0\.1|10\.0\.2\.2/.test(API_URL)) {
      problems.push({
        level: 'error',
        message: `Production build points at a local address (${API_URL}). This will fail on every device.`,
      });
    }
    if (API_URL.startsWith('http://')) {
      problems.push({
        level: 'error',
        message: `Production build uses plain HTTP (${API_URL}). Tokens would travel unencrypted.`,
      });
    }
  }

  if (IS_DEV && /localhost|127\.0\.0\.1/.test(API_URL)) {
    problems.push({
      level: 'warn',
      message:
        `API_URL is ${API_URL}. That works in a simulator, but on a physical device ` +
        `localhost is the phone itself — set EXPO_PUBLIC_API_URL to your machine's LAN address.`,
    });
  }

  if (!GOOGLE_MAPS_API_KEY) {
    problems.push({ level: 'warn', message: 'No Google Maps key — map screens will render blank.' });
  }

  for (const { level, message } of problems) {
    // eslint-disable-next-line no-console
    console[level === 'error' ? 'error' : 'warn'](`[config] ${message}`);
  }
  return problems;
}

/** Everything worth showing on a diagnostics screen. Never includes secrets. */
export const configSummary = () => ({
  env: APP_ENV,
  apiUrl: API_URL,
  timeoutMs: API_TIMEOUT_MS,
  maxRetries: API_MAX_RETRIES,
  hasMapsKey: Boolean(GOOGLE_MAPS_API_KEY),
  hasGoogleSignIn: Boolean(GOOGLE_CONFIG.webClientId),
});
