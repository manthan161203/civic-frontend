'use client';

import { resolveTone } from './statusTones';

/**
 * @typedef {'neutral'|'primary'|'success'|'warning'|'danger'|'info'|'accent'} Tone
 */

/**
 * Tone → utility classes.
 *
 * Written out rather than interpolated (`bg-${tone}-soft`) because Tailwind
 * scans source text for complete class names; a template literal produces no
 * class at all and the badge renders unstyled.
 *
 * @type {Record<Tone, { soft: string, solid: string, outline: string, rail: string }>}
 */
const TONE_CLASSES = {
  neutral: {
    soft: 'bg-neutral-soft text-neutral-strong',
    solid: 'bg-neutral text-white',
    outline: 'border border-border-strong text-ink-muted',
    rail: 'bg-neutral',
  },
  primary: {
    soft: 'bg-primary-soft text-primary-strong',
    solid: 'bg-primary text-white',
    outline: 'border border-primary text-primary',
    rail: 'bg-primary',
  },
  success: {
    soft: 'bg-success-soft text-success-strong',
    solid: 'bg-success text-white',
    outline: 'border border-success text-success',
    rail: 'bg-success',
  },
  warning: {
    soft: 'bg-warning-soft text-warning-strong',
    solid: 'bg-warning text-white',
    outline: 'border border-warning text-warning',
    rail: 'bg-warning',
  },
  danger: {
    soft: 'bg-danger-soft text-danger-strong',
    solid: 'bg-danger text-white',
    outline: 'border border-danger text-danger',
    rail: 'bg-danger',
  },
  info: {
    soft: 'bg-info-soft text-info-strong',
    solid: 'bg-info text-white',
    outline: 'border border-info text-info',
    rail: 'bg-info',
  },
  accent: {
    soft: 'bg-accent-soft text-accent-strong',
    solid: 'bg-accent text-white',
    outline: 'border border-accent text-accent',
    rail: 'bg-accent',
  },
};

const SIZE_CLASSES = {
  sm: 'px-1.5 py-0.5 text-[11px]',
  md: 'px-2 py-0.5 text-xs',
};

/**
 * @typedef {object} BadgeProps
 * @property {React.ReactNode} children
 * @property {Tone} [tone='neutral']
 * @property {'soft'|'solid'|'outline'} [appearance='soft']
 * @property {'sm'|'md'} [size='sm']
 * @property {boolean} [dot=false] leading dot, for a status read at a glance
 * @property {string} [className]
 */

/** @param {BadgeProps} props */
export default function Badge({
  children,
  tone = 'neutral',
  appearance = 'soft',
  size = 'sm',
  dot = false,
  className = '',
}) {
  const palette = TONE_CLASSES[tone] ?? TONE_CLASSES.neutral;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-control font-medium whitespace-nowrap ${
        palette[appearance]
      } ${SIZE_CLASSES[size]} ${className}`}
    >
      {dot && (
        <span
          aria-hidden="true"
          className={`h-1.5 w-1.5 shrink-0 rounded-full ${palette.rail}`}
        />
      )}
      {children}
    </span>
  );
}

/**
 * A badge whose tone and label are looked up from the status registry.
 *
 * This is the form nearly every call site wants — it removes both the colour
 * map and the `value?.replace(/_/g, ' ')` dance that surrounded every badge.
 *
 * @param {{ kind: string, value: string|null|undefined, fallback?: string,
 *           appearance?: 'soft'|'solid'|'outline', size?: 'sm'|'md',
 *           dot?: boolean, className?: string }} props
 */
export function StatusBadge({ kind, value, fallback = '—', ...rest }) {
  const { tone, label } = resolveTone(kind, value, fallback);
  return (
    <Badge tone={tone} {...rest}>
      {label}
    </Badge>
  );
}

/**
 * The vertical colour bar on the leading edge of a table row.
 *
 * The console's organising idea: status is carried by a rail rather than by a
 * pill in every row, so a screen full of issues reads as a pattern you scan
 * instead of a field of coloured lozenges competing for attention.
 *
 * @param {{ kind: string, value: string|null|undefined, title?: string }} props
 */
export function StatusRail({ kind, value, title }) {
  const { tone, label } = resolveTone(kind, value, '');
  const palette = TONE_CLASSES[tone] ?? TONE_CLASSES.neutral;
  return (
    <span
      aria-hidden="true"
      title={title ?? label}
      className={`absolute inset-y-0 left-0 w-[3px] ${palette.rail}`}
    />
  );
}

export { TONE_CLASSES };
