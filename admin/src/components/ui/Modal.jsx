'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import IconButton from './IconButton';

/**
 * The dialog.
 *
 * Around twenty-seven overlays exist in the console, each a hand-written
 * `<div className="fixed inset-0 bg-black/40 …">`. None of them traps focus,
 * closes on Escape, locks background scroll, or carries a dialog role — and all
 * of them share one destructive bug:
 *
 *     <div className="fixed inset-0 …" onClick={onClose}>
 *       <div onClick={(e) => e.stopPropagation()}> … </div>
 *
 * A text-selection drag that *starts* inside the panel and *ends* on the
 * backdrop fires the backdrop's `onClick` — because a click is dispatched to
 * the nearest common ancestor of mousedown and mouseup. Selecting a phone
 * number in a form and releasing slightly outside the panel closes the dialog
 * and destroys everything typed into it. This closes only when both mousedown
 * and mouseup landed on the backdrop.
 *
 * Rendered through a portal because the current modals are nested inside
 * `<main className="overflow-y-auto p-6">`, and a `fixed` element inside a
 * scroll container is a containing-block hazard.
 */

/**
 * @typedef {object} ModalProps
 * @property {boolean} open
 * @property {() => void} onClose fired by Escape, the backdrop, and the ✕
 * @property {string} [title]
 * @property {string} [description]
 * @property {'sm'|'md'|'lg'|'xl'} [size='md']
 * @property {React.ReactNode} [footer] pinned below a scrolling body
 * @property {boolean} [dismissible=true] set false while a mutation is in flight
 * @property {React.RefObject<HTMLElement>} [initialFocus]
 * @property {React.ReactNode} children
 */

const SIZES = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
};

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), ' +
  'textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** @param {ModalProps} props */
export default function Modal({
  open,
  onClose,
  title,
  description,
  size = 'md',
  footer,
  dismissible = true,
  initialFocus,
  children,
}) {
  const panelRef = useRef(null);
  const backdropMouseDown = useRef(false);
  const restoreFocusTo = useRef(null);
  const titleId = useId();
  const descriptionId = useId();

  // createPortal needs a DOM target, which does not exist during SSR.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const requestClose = useCallback(() => {
    if (dismissible) onClose?.();
  }, [dismissible, onClose]);

  /* ── Escape ─────────────────────────────────────────────────────────────── */
  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        requestClose();
      }
    };
    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, [open, requestClose]);

  /* ── Background scroll lock ─────────────────────────────────────────────── */
  useEffect(() => {
    if (!open) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  /* ── Focus in on open, back to the trigger on close ─────────────────────── */
  useEffect(() => {
    if (!open) return undefined;

    restoreFocusTo.current = document.activeElement;

    // A frame later: the panel has to be in the document before it can be
    // focused, and initialFocus targets a child that renders with it.
    const raf = requestAnimationFrame(() => {
      const target =
        initialFocus?.current ??
        panelRef.current?.querySelector(FOCUSABLE) ??
        panelRef.current;
      target?.focus?.();
    });

    return () => {
      cancelAnimationFrame(raf);
      // Returning focus is the half everyone forgets. Without it, closing a
      // dialog drops the caret at the top of the document and a keyboard user
      // has to tab back to where they were.
      restoreFocusTo.current?.focus?.();
    };
  }, [open, initialFocus]);

  /* ── Focus trap ─────────────────────────────────────────────────────────── */
  const onKeyDownTrap = (e) => {
    if (e.key !== 'Tab' || !panelRef.current) return;

    // Visibility is checked without `offsetParent`.
    //
    // `offsetParent` is null for any element inside a `position: fixed`
    // ancestor — which is every element in this dialog — so filtering on it
    // emptied the list and disabled the trap entirely. It is also always null
    // under jsdom, so the bug was invisible to a naive test.
    const focusable = Array.from(panelRef.current.querySelectorAll(FOCUSABLE)).filter(
      (el) =>
        !el.hasAttribute('hidden') &&
        el.getAttribute('aria-hidden') !== 'true' &&
        !el.closest('[hidden], [aria-hidden="true"]'),
    );

    if (focusable.length === 0) {
      e.preventDefault();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  if (!open || !mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/50 p-4 sm:items-center"
      // Both halves of the gesture must land on the backdrop. Tracking only
      // the click is what lets a selection drag out of the panel destroy the
      // form — see the note at the top of this file.
      onMouseDown={(e) => {
        backdropMouseDown.current = e.target === e.currentTarget;
      }}
      onMouseUp={(e) => {
        if (backdropMouseDown.current && e.target === e.currentTarget) requestClose();
        backdropMouseDown.current = false;
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        onKeyDown={onKeyDownTrap}
        className={`my-auto flex w-full ${SIZES[size]} max-h-[calc(100vh-2rem)] flex-col
          rounded-card border border-border bg-surface shadow-xl outline-none`}
      >
        {(title || dismissible) && (
          <header className="flex items-start justify-between gap-4 border-b border-divider px-5 py-3.5">
            <div className="min-w-0">
              {title && (
                <h2 id={titleId} className="text-sm font-semibold text-ink">
                  {title}
                </h2>
              )}
              {description && (
                <p id={descriptionId} className="mt-1 text-xs text-ink-muted">
                  {description}
                </p>
              )}
            </div>
            {dismissible && (
              <IconButton icon="close" label="Close dialog" size="sm" onClick={requestClose} />
            )}
          </header>
        )}

        {/* Only the body scrolls, so the header and the action buttons stay put
            on a long form — several current modals scroll the whole panel and
            push their own Save button off screen. */}
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>

        {footer && (
          <footer className="flex items-center justify-end gap-2 border-t border-divider bg-surface-alt px-5 py-3">
            {footer}
          </footer>
        )}
      </div>
    </div>,
    document.body,
  );
}
