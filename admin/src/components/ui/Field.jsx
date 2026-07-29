'use client';

import { useId } from 'react';
import SvgIcon from './SvgIcon';

/**
 * Label, hint, error and required marker around one control.
 *
 * Deliberately free of any `react-hook-form` dependency, so filter bars and the
 * handful of non-RHF forms can use it too.
 *
 * The accessibility wiring is the part worth having in one place: `aria-invalid`
 * plus an `aria-describedby` that points at the error node is what makes a 422
 * useful to a screen reader, and none of the console's twenty-odd forms does it
 * today.
 *
 * @typedef {object} FieldProps
 * @property {string} label
 * @property {string} htmlFor
 * @property {string} [hint]
 * @property {string} [error]
 * @property {boolean} [required]
 * @property {(ids: { describedBy?: string, invalid: boolean }) => React.ReactNode} children
 * @property {string} [className]
 */

/** @param {FieldProps} props */
export default function Field({
  label,
  htmlFor,
  hint,
  error,
  required = false,
  children,
  className = '',
}) {
  const hintId = useId();
  const errorId = useId();

  const describedBy = [hint ? hintId : null, error ? errorId : null]
    .filter(Boolean)
    .join(' ') || undefined;

  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="mb-1 block text-xs font-medium text-ink">
        {label}
        {required && (
          <span className="ml-0.5 text-danger" aria-hidden="true">
            *
          </span>
        )}
      </label>

      {children({ describedBy, invalid: Boolean(error) })}

      {hint && !error && (
        <p id={hintId} className="mt-1 text-xs text-ink-subtle">
          {hint}
        </p>
      )}

      {error && (
        <p id={errorId} className="mt-1 flex items-start gap-1 text-xs text-danger">
          <span className="mt-px shrink-0">
            <SvgIcon name="alertCircle" size={12} />
          </span>
          {error}
        </p>
      )}
    </div>
  );
}

/** Shared input chrome, so a text box and a select cannot drift apart. */
export const CONTROL_CLASSES =
  'h-9 w-full rounded-control border bg-surface px-2.5 text-sm text-ink outline-none ' +
  'placeholder:text-ink-subtle disabled:bg-surface-alt disabled:text-ink-subtle';

/** @param {boolean} invalid */
export const borderClass = (invalid) =>
  invalid ? 'border-danger focus:border-danger' : 'border-border focus:border-primary';

/**
 * The banner for an error that does not belong to any single field.
 *
 * @param {{ message?: string }} props
 */
export function FormError({ message }) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className="flex items-start gap-2 rounded-control border border-danger/30 bg-danger-soft px-3 py-2"
    >
      <span className="mt-px shrink-0 text-danger">
        <SvgIcon name="alertCircle" size={14} />
      </span>
      <p className="text-sm text-danger-strong">{message}</p>
    </div>
  );
}
