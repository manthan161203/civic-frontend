'use client';

import SvgIcon from './SvgIcon';

/**
 * An icon-only button.
 *
 * The modal close "✕" appears in around twenty places with five different class
 * strings, and most of them are a bare `<button>` containing a glyph with no
 * accessible name — a screen reader announces "button" and nothing else.
 *
 * `label` is therefore **required**, not optional. Making it a parameter the
 * caller cannot skip is the only reliable way to stop unlabelled icon buttons
 * reappearing.
 *
 * @typedef {object} IconButtonProps
 * @property {string} icon a name from SvgIcon
 * @property {string} label required — becomes aria-label and the tooltip
 * @property {'sm'|'md'} [size='md']
 * @property {'default'|'danger'} [tone='default']
 * @property {(e: React.MouseEvent) => void} [onClick]
 * @property {boolean} [disabled]
 * @property {string} [className]
 */

/** @param {IconButtonProps} props */
export default function IconButton({
  icon,
  label,
  size = 'md',
  tone = 'default',
  onClick,
  disabled = false,
  className = '',
  ...rest
}) {
  if (process.env.NODE_ENV !== 'production' && !label) {
    // Loud in development rather than a silent accessibility hole in production.
    console.error(
      '[IconButton] `label` is required — an icon-only button with no accessible ' +
        'name is announced as just "button".',
    );
  }

  const box = size === 'sm' ? 'h-7 w-7' : 'h-8 w-8';
  const glyph = size === 'sm' ? 14 : 16;
  const toneClass =
    tone === 'danger'
      ? 'text-ink-muted hover:bg-danger-soft hover:text-danger'
      : 'text-ink-muted hover:bg-surface-alt hover:text-ink';

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex shrink-0 items-center justify-center rounded-control
        transition-colors disabled:cursor-not-allowed disabled:opacity-40
        ${box} ${toneClass} ${className}`}
      {...rest}
    >
      <SvgIcon name={icon} size={glyph} />
    </button>
  );
}
