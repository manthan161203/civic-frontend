/**
 * Historical import path for error formatting.
 *
 * The implementation moved to `@/api/errors`, which understands FastAPI's two
 * error shapes (a `detail` string from `HTTPException`, a `detail` array from
 * 422 validation) as well as network failures, timeouts and cancellations.
 * Twenty-one pages import `getErrorMessage` from here, so the path stays and
 * forwards rather than being rewritten across all of them.
 *
 * The `(err, fallback)` signature is unchanged.
 *
 * @deprecated Import from `@/api` instead.
 */

export { getErrorMessage, getFieldErrors, ApiError, toApiError } from '@/api/errors';
