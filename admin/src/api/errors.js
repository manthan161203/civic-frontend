/**
 * One error shape for the whole admin app.
 *
 * Before this, three helpers disagreed about what an API failure looked like:
 * `lib/apiError.js` returned a string, `utils/errorHandler.js` returned an
 * object with a different field set, and the axios interceptor made its own
 * decisions from raw status codes. Pages picked whichever they imported, so the
 * same 422 rendered as a field-level hint on one screen and "An unexpected
 * error occurred" on another.
 *
 * Everything that leaves the client layer is now an `ApiError`.
 */

/**
 * `client` is the odd one out: it means our own code threw, not that a request
 * failed. It exists so that a bug in a success path cannot be presented to the
 * user as a connection problem — see the note in `toApiError`.
 *
 * @typedef {'network'|'timeout'|'canceled'|'unauthenticated'|'forbidden'
 *          |'validation'|'notFound'|'conflict'|'rateLimited'|'server'
 *          |'client'|'unknown'} ErrorKind
 */

/** Per-field messages parsed out of a FastAPI 422, keyed by field name. */
/** @typedef {Record<string, string>} FieldErrors */

export class ApiError extends Error {
  /**
   * @param {object} init
   * @param {ErrorKind} init.kind
   * @param {string}    init.message      user-facing, safe to render
   * @param {number}   [init.status]
   * @param {FieldErrors} [init.fieldErrors]
   * @param {boolean}  [init.retryable]
   * @param {string}   [init.requestId]   X-Request-ID, for cross-referencing backend logs
   * @param {unknown}  [init.cause]       the original axios error
   */
  constructor({ kind, message, status, fieldErrors, retryable, requestId, cause }) {
    super(message);
    this.name = 'ApiError';
    this.kind = kind;
    this.status = status ?? null;
    this.fieldErrors = fieldErrors ?? null;
    this.retryable = retryable ?? false;
    this.requestId = requestId ?? null;
    this.cause = cause;
  }

  /** True when re-issuing the identical request could plausibly succeed. */
  get isTransient() {
    return this.retryable;
  }

  /** True when the session is gone and the user has to sign in again. */
  get isSessionEnded() {
    return this.kind === 'unauthenticated';
  }

  /**
   * True when the user is signed in but not allowed to do this.
   *
   * The distinction from `isSessionEnded` is the whole point. The old
   * interceptor treated 401 and 403 identically and destroyed the session for
   * both, so a ward admin who opened a district-scoped page was silently
   * logged out. Scoped admins hit 403 routinely — it is a normal answer, not a
   * session failure.
   */
  get isForbidden() {
    return this.kind === 'forbidden';
  }
}

/** Copy for statuses that carry no useful server-supplied message. */
const GENERIC = {
  400: 'That request was not valid. Please check the form and try again.',
  401: 'Your session has expired. Please sign in again.',
  403: 'You do not have permission to do this.',
  404: 'That resource no longer exists.',
  409: 'That conflicts with something that already exists.',
  413: 'That file is too large.',
  429: 'Too many requests. Please wait a moment and try again.',
  500: 'The server ran into a problem. Please try again.',
  501: 'That feature is not enabled on this server.',
  502: 'The server is unreachable right now. Please try again.',
  503: 'The service is temporarily unavailable. Please try again.',
  504: 'The server took too long to respond. Please try again.',
};

const KIND_BY_STATUS = {
  401: 'unauthenticated',
  403: 'forbidden',
  404: 'notFound',
  409: 'conflict',
  422: 'validation',
  429: 'rateLimited',
};

/**
 * Turn a FastAPI 422 body into `{ field: message }`.
 *
 * FastAPI emits `{ detail: [{ type, loc, msg, input }] }` where `loc` is a path
 * like `["body", "email"]` or `["query", "page"]`. Nested models produce longer
 * paths (`["body", "shifts", 0, "start_time"]`), which we join with dots so a
 * form can look up `shifts.0.start_time`.
 *
 * @param {unknown} detail
 * @returns {FieldErrors | null}
 */
function parseValidationDetail(detail) {
  if (!Array.isArray(detail)) return null;
  /** @type {FieldErrors} */
  const fields = {};
  for (const entry of detail) {
    const loc = Array.isArray(entry?.loc) ? entry.loc : [];
    // Drop the leading source segment ("body" | "query" | "path" | "header").
    const path = loc.slice(1).map(String).filter(Boolean);
    const key = path.length ? path.join('.') : 'general';
    // Keep the first message per field; later ones are usually less specific.
    if (!fields[key]) fields[key] = entry?.msg ?? 'Invalid value';
  }
  return Object.keys(fields).length ? fields : null;
}

/**
 * The server's own message, when it gave one worth showing.
 *
 * FastAPI `HTTPException(detail="...")` produces a string; the backend uses it
 * deliberately for things the user can act on ("After-photo is required to
 * resolve a high-priority issue"). Those are better than any generic copy, so
 * they win. Arrays are 422 detail and get handled as field errors instead.
 *
 * @param {unknown} data
 * @returns {string | null}
 */
function serverMessage(data) {
  if (typeof data === 'string' && data.trim()) return data.trim();
  const detail = data?.detail;
  if (typeof detail === 'string' && detail.trim()) return detail.trim();
  if (typeof data?.message === 'string' && data.message.trim()) return data.message.trim();
  return null;
}

/**
 * Normalize anything axios throws into an `ApiError`.
 *
 * @param {any} error
 * @returns {ApiError}
 */
export function toApiError(error) {
  if (error instanceof ApiError) return error;

  // Request was aborted deliberately (navigation, StrictMode double-effect,
  // an AbortController). Not a failure — callers should swallow it.
  if (error?.code === 'ERR_CANCELED' || error?.name === 'CanceledError') {
    return new ApiError({
      kind: 'canceled',
      message: 'Request canceled.',
      retryable: false,
      cause: error,
    });
  }

  if (error?.code === 'ECONNABORTED') {
    return new ApiError({
      kind: 'timeout',
      message: 'The request timed out. Please try again.',
      retryable: true,
      cause: error,
    });
  }

  /*
   * A transport failure — DNS, connection refused, offline, CORS — is an axios
   * error with no `response`. The `isAxiosError` check is what makes that
   * distinct from the branch below, and it matters more than it looks.
   */
  if (error?.isAxiosError && !error.response) {
    return new ApiError({
      kind: 'network',
      message: navigator?.onLine === false
        ? 'You appear to be offline. Check your connection and try again.'
        : 'Could not reach the server. Check your connection and try again.',
      retryable: true,
      cause: error,
    });
  }

  /*
   * Not an axios error and not a response — so this is **our own code throwing
   * inside somebody's try block**, not a network problem at all.
   *
   * This branch used to be folded into the one above on a bare
   * `if (!error?.response)`, which meant any `TypeError` in a success path was
   * reported to the user as "Could not reach the server. Check your
   * connection." That is actively misleading: it sent a real debugging session
   * chasing CORS, ports, DNS and firewall rules for a request that had already
   * returned 200 — the failure was in the code *after* the await.
   *
   * So it gets its own kind, honest copy, and a console record with the real
   * stack, because the whole reason the original was hard to find is that the
   * underlying error was swallowed and replaced.
   */
  if (!error?.response) {
    if (typeof console !== 'undefined') {
      console.error(
        '[api] Non-transport error surfaced through toApiError — this is a bug in ' +
          'client code, not a connection problem:',
        error,
      );
    }
    return new ApiError({
      kind: 'client',
      message: 'Something went wrong in the app. Please reload and try again.',
      // Retrying cannot help: the same code will throw the same way.
      retryable: false,
      cause: error,
    });
  }

  const { status, data, headers } = error.response;
  const requestId = headers?.['x-request-id'] ?? null;
  const fieldErrors = status === 422 ? parseValidationDetail(data?.detail) : null;

  let kind = KIND_BY_STATUS[status];
  if (!kind) kind = status >= 500 ? 'server' : status >= 400 ? 'unknown' : 'unknown';

  // A 422 whose detail we could not parse is still a bad request, but there is
  // nothing field-specific to show, so fall back to generic copy.
  const message =
    (status === 422 && fieldErrors
      ? 'Please correct the highlighted fields.'
      : serverMessage(data)) ??
    GENERIC[status] ??
    'Something went wrong. Please try again.';

  return new ApiError({
    kind,
    message,
    status,
    fieldErrors,
    // 5xx and 429 are worth retrying; 4xx will fail identically every time.
    retryable: status === 429 || (status >= 500 && status < 600),
    requestId,
    cause: error,
  });
}

/**
 * Read a user-facing message off any thrown value.
 *
 * Replaces both `lib/apiError.js#getErrorMessage` and
 * `utils/errorHandler.js#getErrorMessage`. The `fallback` argument keeps the
 * call signature of the former so existing call sites keep working.
 *
 * @param {unknown} error
 * @param {string} [fallback]
 * @returns {string}
 */
export function getErrorMessage(error, fallback) {
  if (error instanceof ApiError) return error.message;
  const normalized = toApiError(error);
  // Only override with the caller's fallback when we had nothing better than
  // the catch-all — a specific server message should not be thrown away.
  if (fallback && normalized.kind === 'unknown' && !normalized.status) return fallback;
  return normalized.message || fallback || 'Something went wrong.';
}

/**
 * Field-level messages for a form, or `null` if this was not a validation error.
 *
 * @param {unknown} error
 * @returns {FieldErrors | null}
 */
export function getFieldErrors(error) {
  const normalized = error instanceof ApiError ? error : toApiError(error);
  return normalized.fieldErrors;
}
