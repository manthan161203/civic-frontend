'use client';

import Spinner from './Spinner';

/**
 * The button.
 *
 * `LoadingButton` already had the right API and is used on 12 of 27 screens;
 * the other 15 hand-write
 * `px-3 py-2 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50`
 * about forty times. This is that component moved here and fixed, with
 * `LoadingButton.jsx` left as a re-export so no existing import has to change —
 * the same convention `src/lib/apiError.js` already uses for `src/api/errors`.
 *
 * Three fixes over the original:
 *
 *  1. The `<style>` block containing `@keyframes` was injected on **every
 *     render**, so the issues table put sixty identical `<style>` elements in
 *     the document. Keyframes now live in globals.css.
 *  2. `loadingText` replaced the children, so a button snapped from
 *     "Create Sub-Admin" to "Creating…" and changed width under the cursor
 *     mid-click. The children now stay in the layout, hidden, and the spinner
 *     overlays them — the button cannot resize.
 *  3. `aria-busy` was missing, so the state was invisible to a screen reader.
 */

/**
 * @typedef {'primary'|'secondary'|'outline'|'ghost'|'danger'|'success'} ButtonVariant
 * @typedef {'sm'|'md'|'lg'} ButtonSize
 */

/** @type {Record<ButtonVariant, string>} */
const VARIANTS = {
  primary:
    'bg-primary text-white hover:bg-primary-hover disabled:bg-primary/50',
  secondary:
    'bg-surface text-ink border border-border-strong hover:bg-surface-alt disabled:text-ink-subtle',
  outline:
    'bg-transparent text-ink-muted border border-border hover:bg-surface-alt hover:text-ink disabled:text-ink-subtle',
  ghost:
    'bg-transparent text-ink-muted hover:bg-surface-alt hover:text-ink disabled:text-ink-subtle',
  danger:
    'bg-danger text-white hover:bg-danger-strong disabled:bg-danger/50',
  success:
    'bg-success text-white hover:bg-success-strong disabled:bg-success/50',
};

/** A danger-toned variant of the quieter styles, for destructive row actions. */
const DANGER_TONE = {
  ghost: 'bg-transparent text-danger hover:bg-danger-soft disabled:text-danger/40',
  outline: 'bg-transparent text-danger border border-danger/40 hover:bg-danger-soft',
  secondary: 'bg-danger-soft text-danger-strong border border-danger/30 hover:bg-danger-soft',
};

/** @type {Record<ButtonSize, string>} */
const SIZES = {
  sm: 'h-7 px-2.5 text-xs gap-1.5',
  md: 'h-9 px-3.5 text-sm gap-2',
  lg: 'h-11 px-5 text-sm gap-2',
};

/**
 * @typedef {object} ButtonProps
 * @property {React.ReactNode} children
 * @property {ButtonVariant} [variant='primary']
 * @property {ButtonSize} [size='md']
 * @property {'danger'} [tone] recolours the quiet variants for destructive actions
 * @property {boolean} [isLoading=false]
 * @property {boolean} [loading=false] alias kept for existing call sites
 * @property {string} [loadingText] announced while loading; does not resize the button
 * @property {boolean} [disabled=false]
 * @property {boolean} [fullWidth=false]
 * @property {React.ReactNode} [leadingIcon]
 * @property {'button'|'submit'|'reset'} [type='button']
 * @property {(e: React.MouseEvent) => void} [onClick]
 * @property {string} [className]
 */

/** @param {ButtonProps & { ref?: React.Ref<HTMLButtonElement> }} props */
export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  tone,
  isLoading = false,
  loading = false,
  loadingText,
  disabled = false,
  fullWidth = false,
  leadingIcon,
  // Defaults to "button". A bare <button> inside a <form> submits it, which
  // becomes a live bug now that the console has real forms.
  type = 'button',
  className = '',
  // React 19 passes `ref` to function components as an ordinary prop, so no
  // forwardRef is needed. Destructured explicitly rather than left to fall
  // through `...rest`, because that only works by coincidence of ordering and
  // is the kind of thing that breaks silently.
  ref,
  ...rest
}) {
  const busy = isLoading || loading;
  const isDisabled = disabled || busy;

  const variantClass =
    (tone === 'danger' && DANGER_TONE[variant]) || VARIANTS[variant] || VARIANTS.primary;

  return (
    <button
      ref={ref}
      type={type}
      disabled={isDisabled}
      aria-busy={busy || undefined}
      className={`relative inline-flex items-center justify-center rounded-control font-medium
        transition-colors disabled:cursor-not-allowed
        ${variantClass} ${SIZES[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...rest}
    >
      {/* Children stay in the flow, invisible, so the button keeps its width
          while loading. Replacing them outright made buttons jump under the
          cursor at the exact moment the user had just clicked. */}
      <span className={`inline-flex items-center gap-2 ${busy ? 'invisible' : ''}`}>
        {leadingIcon}
        {children}
      </span>

      {busy && (
        <span className="absolute inset-0 inline-flex items-center justify-center gap-2">
          <Spinner size={size === 'lg' ? 'md' : 'sm'} label={null} />
          {loadingText && <span className="text-inherit">{loadingText}</span>}
        </span>
      )}
    </button>
  );
}
