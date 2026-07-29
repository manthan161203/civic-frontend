/**
 * Civic App — Shared Design Tokens
 * Single source of truth for all colors, spacing, typography, and radii.
 * Citizen context: blue (#1a56db)
 * Worker  context: green (#059669)
 */

// ── Base Colors ───────────────────────────────────────────────────────────────
export const Colors = {
  // Brand
  citizen:   '#1a56db',
  citizenDark: '#1447b2',
  worker:    '#059669',
  workerDark: '#047857',

  // Semantic
  danger:  '#ef4444',
  warning: '#f59e0b',
  success: '#10b981',
  info:    '#3b82f6',
  purple:  '#7c3aed',

  // Neutrals
  white:   '#ffffff',
  bg:      '#f9fafb',
  bgLight: '#f3f4f6',
  border:  '#e5e7eb',
  divider: '#f3f4f6',

  // Text
  textPrimary:   '#111827',
  textSecondary: '#374151',
  textMuted:     '#6b7280',
  textLight:     '#9ca3af',
  textDisabled:  '#d1d5db',
};

// ── Status / Priority ────────────────────────────────────────────────────────
export const StatusColors = {
  open:        { bg: '#fef3c7', text: '#92400e' },
  in_progress: { bg: '#dbeafe', text: '#1e40af' },
  assigned:    { bg: '#dbeafe', text: '#1e40af' },
  resolved:    { bg: '#d1fae5', text: '#065f46' },
  closed:      { bg: '#f3f4f6', text: '#6b7280' },
  escalated:   { bg: '#fee2e2', text: '#991b1b' },
  blocked:     { bg: '#fee2e2', text: '#991b1b' },
  rejected:    { bg: '#fce7f3', text: '#9d174d' },
};

export const PriorityColors = {
  low:      { dot: '#10b981', bg: '#f0fdf4', border: '#10b981' },
  medium:   { dot: '#f59e0b', bg: '#fffbeb', border: '#f59e0b' },
  high:     { dot: '#ef4444', bg: '#fef2f2', border: '#ef4444' },
  // The backend enum's highest level. It is deliberately a deeper red than
  // `high` rather than a different hue: urgency is a matter of degree here, and
  // the purple that `critical` used read as a separate category entirely.
  urgent:   { dot: '#dc2626', bg: '#fef2f2', border: '#dc2626' },
};

// ── Typography ────────────────────────────────────────────────────────────────
export const Typography = {
  // Font sizes
  xs:   10,
  sm:   12,
  base: 14,
  md:   15,
  lg:   16,
  xl:   18,
  '2xl': 20,
  '3xl': 22,
  '4xl': 24,

  // Font weights (React Native uses string)
  regular:    '400',
  medium:     '500',
  semibold:   '600',
  bold:       '700',
  extrabold:  '800',
};

// ── Border Radius ─────────────────────────────────────────────────────────────
export const Radius = {
  xs:   6,
  sm:   8,
  md:   12,
  lg:   16,
  xl:   20,
  full: 9999,
};

// ── Spacing ───────────────────────────────────────────────────────────────────
export const Spacing = {
  xs:   4,
  sm:   8,
  md:   12,
  lg:   16,
  xl:   20,
  '2xl': 24,
  '3xl': 32,
};

// ── Shadows ───────────────────────────────────────────────────────────────────
export const Shadow = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 4,
  },
};

// ── Common Styles ─────────────────────────────────────────────────────────────
export const Common = {
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    ...Shadow.sm,
  },
  chip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.sm,
    backgroundColor: Colors.bgLight,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
};
