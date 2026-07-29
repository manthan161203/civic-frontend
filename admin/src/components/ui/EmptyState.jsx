'use client';

import SvgIcon from './SvgIcon';

/**
 * The "nothing here" panel, with a way forward.
 *
 * Roughly ten hand-written variants existed — a 40px grey glyph over
 * `text-gray-400 text-sm` — and none of them offered an action. An empty table
 * that says "No issues found" and nothing else leaves the user to work out
 * whether that is good news, a filter they forgot, or a failed request.
 *
 * That last case is why this is separate from the error state: `AsyncBoundary`
 * only renders this once it knows the request succeeded.
 */

/**
 * @typedef {object} EmptyStateProps
 * @property {string} title
 * @property {string} [description] what to do next, not a restatement of the title
 * @property {string} [icon] a name from SvgIcon
 * @property {React.ReactNode} [action] usually a Button
 * @property {'sm'|'md'} [size='md'] `sm` fits inside a table body
 * @property {string} [className]
 */

/** @param {EmptyStateProps} props */
export default function EmptyState({
  title,
  description,
  icon = 'infoCircle',
  action,
  size = 'md',
  className = '',
}) {
  const compact = size === 'sm';

  return (
    <div
      className={`flex flex-col items-center justify-center text-center ${
        compact ? 'px-4 py-10' : 'px-6 py-16'
      } ${className}`}
    >
      <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-surface-alt text-ink-subtle">
        <SvgIcon name={icon} size={compact ? 16 : 20} />
      </span>

      <p className={`font-medium text-ink ${compact ? 'text-sm' : 'text-base'}`}>
        {title}
      </p>

      {description && (
        <p className="mt-1 max-w-sm text-sm text-ink-muted">{description}</p>
      )}

      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
