/**
 * Structured logging.
 *
 * ── What was here before ─────────────────────────────────────────────────────
 *
 * The previous implementation was broken, not merely basic:
 *
 *     const formatLog = (level, context, message, data) => {
 *       const prefix = `[${timestamp}] [${level}] [${context}]`;
 *       if (data) {
 *         return `${prefix} ${message}`, data;   // ← comma operator
 *       }
 *       return `${prefix} ${message}`;
 *     };
 *
 * `return a, b` is the comma operator: it evaluates `a`, discards it, and
 * returns `b`. So whenever `data` was passed, the formatted message was thrown
 * away and `data` was returned instead — and every caller then did
 * `.split('\n')` on the result, which throws `TypeError: x.split is not a
 * function` for any non-string. `logger.error(ctx, msg, err, { anything })`
 * crashed the call site it was supposed to be reporting from.
 *
 * It also emitted CSS-styled console output, which no transport can consume —
 * so "structured so it's easy to wire to Sentry later" was not true of it.
 *
 * ── What this is ─────────────────────────────────────────────────────────────
 *
 * Every record is a plain object with a stable shape. `console` is the sink
 * today; pointing it at Sentry, Datadog or an HTTP collector is `setSink()` and
 * nothing else. Nothing about the call sites changes.
 *
 * `requestId` is the reason this is worth doing. `ApiError` carries the
 * `X-Request-ID` the backend put on the response, so a browser-side error and
 * the server log line that caused it can be joined — which is the correlation
 * the backend's logging was built for and the frontend never used.
 */

/** @typedef {'debug'|'info'|'warn'|'error'} Level */

/**
 * @typedef {object} LogRecord
 * @property {Level} level
 * @property {string} ts          ISO 8601
 * @property {string} context     the module or screen reporting
 * @property {string} message
 * @property {{name: string, message: string, stack?: string}} [error]
 * @property {Record<string, unknown>} [meta]
 * @property {string} [requestId] X-Request-ID, for joining to backend logs
 */

const LEVEL_ORDER = { debug: 10, info: 20, warn: 30, error: 40 };

/**
 * Below this, nothing is emitted. Debug is noise in production and useful in
 * development, and that is the only difference.
 */
const MIN_LEVEL = process.env.NODE_ENV === 'development' ? 'debug' : 'info';

const CONSOLE_METHOD = { debug: 'debug', info: 'info', warn: 'warn', error: 'error' };

/**
 * The default sink.
 *
 * Logs the record object rather than an interpolated string, so a browser
 * console shows an inspectable tree and a future transport gets real fields
 * instead of having to parse text back apart.
 *
 * @param {LogRecord} record
 */
function consoleSink(record) {
  const method = CONSOLE_METHOD[record.level] ?? 'log';
  const prefix = `[${record.context}]`;
  // eslint-disable-next-line no-console
  console[method](prefix, record.message, record);
}

let sink = consoleSink;

/**
 * Replace the destination. This is the whole Sentry integration:
 *
 *   import * as Sentry from '@sentry/nextjs';
 *   setSink((record) => {
 *     if (record.level === 'error') {
 *       Sentry.captureException(record.error ?? new Error(record.message), {
 *         tags: { context: record.context, request_id: record.requestId },
 *         extra: record.meta,
 *       });
 *     } else {
 *       Sentry.addBreadcrumb({ category: record.context, message: record.message,
 *                              level: record.level, data: record.meta });
 *     }
 *   });
 *
 * @param {(record: LogRecord) => void} next
 */
export function setSink(next) {
  sink = typeof next === 'function' ? next : consoleSink;
}

/** Restore console output. Used by tests. */
export function resetSink() {
  sink = consoleSink;
}

/**
 * Normalise anything throwable into a serialisable shape.
 *
 * An `Error` does not survive `JSON.stringify` — `{}` is what a naive
 * transport would send — so name, message and stack are lifted out explicitly.
 */
function serialiseError(error) {
  if (!error) return undefined;
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
      // ApiError's own fields, when present. Written flat so a query for
      // "all 502s" does not have to reach into a nested object.
      ...(error.kind ? { kind: error.kind } : {}),
      ...(error.status ? { status: error.status } : {}),
    };
  }
  return { name: 'NonError', message: String(error) };
}

/**
 * @param {Level} level
 * @param {string} context
 * @param {string} message
 * @param {{ error?: unknown, meta?: Record<string, unknown> }} [extra]
 */
function emit(level, context, message, extra = {}) {
  if (LEVEL_ORDER[level] < LEVEL_ORDER[MIN_LEVEL]) return;

  const error = serialiseError(extra.error);

  /** @type {LogRecord} */
  const record = {
    level,
    ts: new Date().toISOString(),
    context: context || 'app',
    message: String(message),
    ...(error ? { error } : {}),
    ...(extra.meta ? { meta: extra.meta } : {}),
    // Lifted to the top level because it is the join key, not a detail.
    ...(extra.error?.requestId ? { requestId: extra.error.requestId } : {}),
  };

  try {
    sink(record);
  } catch {
    // A logger that throws takes down the thing it was reporting on. Under no
    // circumstances.
  }
}

export const logger = {
  /** @param {string} context @param {string} message @param {Record<string, unknown>} [meta] */
  debug: (context, message, meta) => emit('debug', context, message, { meta }),

  /** @param {string} context @param {string} message @param {Record<string, unknown>} [meta] */
  info: (context, message, meta) => emit('info', context, message, { meta }),

  /** @param {string} context @param {string} message @param {Record<string, unknown>} [meta] */
  warn: (context, message, meta) => emit('warn', context, message, { meta }),

  /**
   * @param {string} context
   * @param {string} message
   * @param {unknown} [error] the thrown value; an ApiError contributes its
   *   `kind`, `status` and `requestId`
   * @param {Record<string, unknown>} [meta]
   */
  error: (context, message, error, meta) => emit('error', context, message, { error, meta }),
};

export default logger;
