'use client';

import { useEffect, useState } from 'react';
import SvgIcon from './SvgIcon';

/**
 * The filter row above a table.
 *
 * Thin on purpose — the layout is six utility classes and does not need
 * abstracting. What it buys is a consistent height and gap across screens, and
 * a place for the selection bar to live so bulk actions appear in the same
 * position every time rather than being appended to whatever the filter row
 * happened to end with.
 *
 * @param {{ children: React.ReactNode, className?: string }} props
 */
export default function Toolbar({ children, className = '' }) {
  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>{children}</div>
  );
}

/** Pushes everything after it to the right. */
Toolbar.Spacer = function ToolbarSpacer() {
  return <div className="flex-1" />;
};

/**
 * The bulk-action strip, shown only when rows are selected.
 *
 * @param {{ count: number, children: React.ReactNode, onClear?: () => void }} props
 */
Toolbar.Selection = function ToolbarSelection({ count, children, onClear }) {
  if (!count) return null;
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-control border border-primary/30 bg-primary-soft px-2.5 py-1.5">
      <span className="tabular text-xs font-medium text-primary-strong">
        {count} selected
      </span>
      {children}
      {onClear && (
        <button
          type="button"
          onClick={onClear}
          className="text-xs text-primary-strong underline underline-offset-2 hover:no-underline"
        >
          Clear
        </button>
      )}
    </div>
  );
};

/**
 * A search box that reports its value immediately but is debounced by the
 * caller via `useDebouncedValue`.
 *
 * Controlled locally so typing stays responsive — binding the input straight
 * to a debounced value makes the field lag behind the keyboard.
 *
 * @param {{ value: string, onChange: (v: string) => void, placeholder?: string,
 *           width?: string, label?: string }} props
 */
export function SearchInput({
  value,
  onChange,
  placeholder = 'Search…',
  width = 'w-56',
  label = 'Search',
}) {
  const [local, setLocal] = useState(value);

  // Follow external resets (a "Reset filters" button) without fighting the
  // user's typing.
  useEffect(() => {
    setLocal(value);
  }, [value]);

  return (
    <div className={`relative ${width}`}>
      <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-subtle">
        <SvgIcon name="search" size={14} />
      </span>

      <input
        type="search"
        aria-label={label}
        value={local}
        placeholder={placeholder}
        onChange={(e) => {
          setLocal(e.target.value);
          onChange(e.target.value);
        }}
        className="h-9 w-full rounded-control border border-border bg-surface pl-8 pr-2.5
                   text-sm text-ink outline-none placeholder:text-ink-subtle
                   focus:border-primary"
      />
    </div>
  );
}

/**
 * A compact select for filter bars.
 *
 * `options` accepts plain strings — most filters in this console are lists of
 * enum values — or `{value, label}` pairs when the label differs.
 *
 * @param {{ value: string, onChange: (v: string) => void,
 *           options: (string | {value: string, label: string})[],
 *           placeholder?: string, label?: string, className?: string }} props
 */
export function FilterSelect({
  value,
  onChange,
  options,
  placeholder = 'All',
  label,
  className = '',
}) {
  return (
    <select
      aria-label={label ?? placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`h-9 rounded-control border border-border bg-surface px-2.5 text-sm text-ink
                  outline-none focus:border-primary ${className}`}
    >
      <option value="">{placeholder}</option>
      {options.map((option) => {
        const v = typeof option === 'string' ? option : option.value;
        const l = typeof option === 'string' ? option : option.label;
        return (
          <option key={v} value={v}>
            {l}
          </option>
        );
      })}
    </select>
  );
}
