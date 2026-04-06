/**
 * Sentry Error Tracking Initialization
 * Stream 4: Error tracking, logging, and performance monitoring
 */

import * as Sentry from '@sentry/nextjs';

/**
 * Initialize Sentry for error tracking
 * Captures unhandled errors, performance issues, and logs them to Sentry dashboard
 */
export const initializeSentry = () => {
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN) {
    console.warn('Sentry DSN not configured');
    return;
  }

  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment: process.env.NODE_ENV || 'production',
    integrations: [
      new Sentry.Replay({
        maskAllText: true,
        blockAllMedia: true,
      }),
      // Custom integration for API errors
      {
        name: 'APIErrorIntegration',
        setup(client) {
          client.on('beforeSend', (event, hint) => {
            // Capture API errors with full context
            if (hint.originalException) {
              event.extra = {
                ...event.extra,
                timestamp: new Date().toISOString(),
                userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
              };
            }
            return event;
          });
        },
      },
    ],
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
  });
};

/**
 * Capture and log error to Sentry with context
 * @param {Error} error - The error object
 * @param {string} context - Context description (e.g., 'Admin Login Failed')
 * @param {Object} additionalData - Additional context data
 */
export const logError = (error, context = 'Unknown Error', additionalData = {}) => {
  if (!error) return;

  const errorData = {
    name: error.name || 'UnknownError',
    message: error.message || String(error),
    stack: error.stack,
    context,
    ...additionalData,
  };

  console.error(`[${context}]`, errorData);

  if (process.env.NODE_ENV === 'production') {
    Sentry.captureException(error, {
      contexts: {
        error_context: {
          context,
          ...additionalData,
        },
      },
      level: 'error',
    });
  }
};

/**
 * Log warning level event
 */
export const logWarning = (message, data = {}) => {
  console.warn(message, data);
  Sentry.captureMessage(message, 'warning');
};

/**
 * Log info level event
 */
export const logInfo = (message, data = {}) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(message, data);
  }
  Sentry.captureMessage(message, 'info');
};

/**
 * Set user context for error tracking
 * Call this after user login to track errors per user
 */
export const setSentryUser = (userId, email, name) => {
  Sentry.setUser({
    id: userId,
    email,
    username: name,
  });
};

/**
 * Clear user context on logout
 */
export const clearSentryUser = () => {
  Sentry.setUser(null);
};

export default {
  initializeSentry,
  logError,
  logWarning,
  logInfo,
  setSentryUser,
  clearSentryUser,
};
