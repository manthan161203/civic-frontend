'use client';

/**
 * The one spinner.
 *
 * Seven screens each inlined
 * `<div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent">`,
 * and `LoadingButton` shipped its own SVG plus a `<style>` block re-injected
 * into the document on every render.
 *
 * Prefer a skeleton for anything that occupies layout — a spinner says "wait"
 * where a skeleton says "here is what is coming". This is for buttons and for
 * refreshes over content that is already on screen.
 *
 * @param {{ size?: 'sm'|'md'|'lg', className?: string, label?: string }} props
 *   `label` is announced to screen readers; pass null to silence it when the
 *   surrounding element already says what is happening.
 */
export default function Spinner({ size = 'md', className = '', label = 'Loading' }) {
  const px = { sm: 14, md: 20, lg: 32 }[size] ?? 20;

  return (
    <span
      role={label ? 'status' : undefined}
      aria-label={label || undefined}
      className={`inline-block shrink-0 ${className}`}
      style={{ width: px, height: px }}
    >
      <svg
        viewBox="0 0 24 24"
        width={px}
        height={px}
        fill="none"
        aria-hidden="true"
        // Keyframes live in globals.css. Inlining them here is what produced
        // sixty duplicate <style> elements on the issues table.
        style={{ animation: 'civic-spin 0.7s linear infinite' }}
      >
        <circle
          cx="12" cy="12" r="9"
          stroke="currentColor" strokeWidth="2.5"
          opacity="0.2"
        />
        <path
          d="M12 3a9 9 0 0 1 9 9"
          stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
        />
      </svg>
    </span>
  );
}
