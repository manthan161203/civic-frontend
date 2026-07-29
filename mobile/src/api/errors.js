/**
 * One error shape for the whole mobile app.
 *
 * Deliberately the same contract as `admin/src/api/errors.js` — same `kind`
 * values, same `ApiError` surface — so a behaviour discussed for one app holds
 * for the other. The differences are mobile-specific: connectivity is the
 * normal failure mode rather than the exception, so the copy says so.
 *
 * Everything that leaves the client layer is an `ApiError`.
 */

/**
 * @typedef {'network'|'timeout'|'canceled'|'unauthenticated'|'forbidden'
 *          |'validation'|'notFound'|'conflict'|'rateLimited'|'server'|'unknown'} ErrorKind
 */

/** @typedef {Record<string, string>} FieldErrors */

export class ApiError extends Error {
  /**
   * @param {object} init
   * @param {ErrorKind} init.kind
   * @param {string}    init.message
   * @param {number}   [init.status]
   * @param {FieldErrors} [init.fieldErrors]
   * @param {boolean}  [init.retryable]
   * @param {string}   [init.requestId]
   * @param {unknown}  [init.cause]
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

  get isTransient() {
    return this.retryable;
  }

  /** The session is gone; the user has to sign in again. */
  get isSessionEnded() {
    return this.kind === 'unauthenticated';
  }

  /**
   * Signed in, but not allowed.
   *
   * Kept distinct from `isSessionEnded` for the same reason as on the admin
   * side: the old handler treated 401 and 403 alike and cleared the session for
   * both. On mobile that meant a citizen who tapped an issue they did not
   * report was logged out of the app.
   */
  get isForbidden() {
    return this.kind === 'forbidden';
  }

  /** Worth showing a "you're offline" affordance rather than an error toast. */
  get isOffline() {
    return this.kind === 'network';
  }
}

const GENERIC = {
  400: 'That request was not valid. Please check the form and try again.',
  401: 'Your session has expired. Please sign in again.',
  403: 'You do not have permission to do this.',
  404: 'That is no longer available.',
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
 * `{ detail: [{ type, loc, msg, input }] }`, where `loc` is `["body","email"]`
 * or deeper for nested models. Paths are joined with dots so a form can look up
 * `shifts.0.start_time`.
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
    const path = loc.slice(1).map(String).filter(Boolean);
    const key = path.length ? path.join('.') : 'general';
    if (!fields[key]) fields[key] = entry?.msg ?? 'Invalid value';
  }
  return Object.keys(fields).length ? fields : null;
}

/** @param {unknown} data */
function serverMessage(data) {
  if (typeof data === 'string' && data.trim()) return data.trim();
  const detail = data?.detail;
  if (typeof detail === 'string' && detail.trim()) return detail.trim();
  if (typeof data?.message === 'string' && data.message.trim()) return data.message.trim();
  return null;
}

/**
 * Normalize anything axios throws into an `ApiError`.
 * @param {any} error
 * @returns {ApiError}
 */
export function toApiError(error) {
  if (error instanceof ApiError) return error;

  if (error?.code === 'ERR_CANCELED' || error?.name === 'CanceledError') {
    return new ApiError({ kind: 'canceled', message: 'Request canceled.', cause: error });
  }

  if (error?.code === 'ECONNABORTED') {
    return new ApiError({
      kind: 'timeout',
      message: 'The request timed out. Check your connection and try again.',
      retryable: true,
      cause: error,
    });
  }

  // On mobile this is the common case, not the exceptional one — a tunnel, a
  // lift, a dead cell. The offline queue depends on recognising it.
  if (!error?.response) {
    return new ApiError({
      kind: 'network',
      message: "You're offline. This will be retried when you reconnect.",
      retryable: true,
      cause: error,
    });
  }

  const { status, data, headers } = error.response;
  const requestId = headers?.['x-request-id'] ?? null;
  const fieldErrors = status === 422 ? parseValidationDetail(data?.detail) : null;

  let kind = KIND_BY_STATUS[status];
  if (!kind) kind = status >= 500 ? 'server' : 'unknown';

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
    retryable: status === 429 || (status >= 500 && status < 600),
    requestId,
    cause: error,
  });
}

/**
 * Read a user-facing message off any thrown value.
 * @param {unknown} error
 * @param {string} [fallback]
 * @returns {string}
 */
export function getErrorMessage(error, fallback) {
  if (error instanceof ApiError) return error.message;
  const normalized = toApiError(error);
  if (fallback && normalized.kind === 'unknown' && !normalized.status) return fallback;
  return normalized.message || fallback || 'Something went wrong.';
}

/**
 * Field-level messages for a form, or `null` if this was not a validation error.
 * @param {unknown} error
 * @returns {FieldErrors | null}
 */
export function getFieldErrors(error) {
  const normalized = error instanceof ApiError ? error : toApiError(error);
  return normalized.fieldErrors;
}

/** True when this failure should be queued for retry rather than surfaced. */
export function isQueueable(error) {
  const e = error instanceof ApiError ? error : toApiError(error);
  return e.kind === 'network' || e.kind === 'timeout';
}
