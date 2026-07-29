'use client';

import { toApiError } from '@/api/errors';
import { SkeletonText, SkeletonRegion } from './Skeleton';
import EmptyState from './EmptyState';
import Button from './Button';
import SvgIcon from './SvgIcon';

/**
 * One place where `{loading, error, isEmpty}` becomes pixels.
 *
 * This is the component that actually fixes the `catch {}` problem. Six screens
 * swallow every load failure — `issues`, `workers`, `citizens`, `admins`,
 * `dashboard`, `layout` — and a user sees an empty table that is
 * indistinguishable from "no results". Moving those catches to `useQuery` only
 * relocates the error into `query.error`; something still has to render it, and
 * without a shared component every screen invents a fifth loading idiom.
 *
 * The three-way precedence is the part screens get wrong: an errored request
 * has no data, so a naive `rows.length === 0` check renders "No issues found"
 * on top of a failure. Order is **error → loading → empty → content**.
 */

/**
 * @typedef {object} AsyncBoundaryProps
 * @property {boolean} loading
 * @property {unknown} [error] an ApiError, or anything toApiError() accepts
 * @property {boolean} [isEmpty=false]
 * @property {React.ReactNode} [skeleton] defaults to three lines of text
 * @property {React.ReactNode} [empty] defaults to a generic EmptyState
 * @property {() => void} [onRetry]
 * @property {React.ReactNode} children
 */

/** @param {AsyncBoundaryProps} props */
export default function AsyncBoundary({
  loading,
  error,
  isEmpty = false,
  skeleton,
  empty,
  onRetry,
  children,
}) {
  if (error) {
    return <ErrorPanel error={error} onRetry={onRetry} />;
  }

  if (loading) {
    return <SkeletonRegion>{skeleton ?? <SkeletonText lines={4} />}</SkeletonRegion>;
  }

  if (isEmpty) {
    return empty ?? <EmptyState title="Nothing here yet" />;
  }

  return children;
}

/**
 * The error state.
 *
 * A 403 gets its own wording rather than the red panel. `src/api/http.js` is
 * explicit that scoped admins hit 403 as a matter of routine — a ward admin
 * opening a record outside their jurisdiction is normal operation, not a
 * malfunction, and presenting it as one teaches people to ignore red panels.
 *
 * @param {{ error: unknown, onRetry?: () => void, compact?: boolean }} props
 */
export function ErrorPanel({ error, onRetry, compact = false }) {
  const apiError = toApiError(error);

  const forbidden = apiError.kind === 'forbidden' || apiError.status === 403;
  const offline = apiError.kind === 'network';

  const tone = forbidden
    ? { bg: 'bg-warning-soft', border: 'border-warning/30', text: 'text-warning-strong', icon: 'alertCircle' }
    : { bg: 'bg-danger-soft', border: 'border-danger/30', text: 'text-danger-strong', icon: 'xCircle' };

  const heading = forbidden
    ? 'Outside your jurisdiction'
    : offline
      ? 'Cannot reach the server'
      : 'Could not load this';

  const detail = forbidden
    ? 'Your role does not cover this record. Ask a super-admin if you need access.'
    : apiError.message;

  return (
    <div
      role="alert"
      className={`flex flex-col items-center justify-center rounded-card border text-center
        ${tone.bg} ${tone.border} ${compact ? 'px-4 py-8' : 'px-6 py-12'}`}
    >
      <span className={tone.text}>
        <SvgIcon name={tone.icon} size={20} />
      </span>

      <p className={`mt-2 text-sm font-medium ${tone.text}`}>{heading}</p>
      <p className="mt-1 max-w-md text-sm text-ink-muted">{detail}</p>

      {/* Only offered when retrying could plausibly work. A retry button on a
          403 is a lie — it will fail identically every time. */}
      {onRetry && apiError.retryable && (
        <Button variant="secondary" size="sm" className="mt-4" onClick={onRetry}>
          Try again
        </Button>
      )}

      {apiError.requestId && (
        <p className="mt-3 font-mono text-[11px] text-ink-subtle">
          Reference: {apiError.requestId}
        </p>
      )}
    </div>
  );
}
