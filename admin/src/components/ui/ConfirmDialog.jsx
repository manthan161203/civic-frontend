'use client';

import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import Modal from './Modal';
import Button from './Button';

/**
 * Confirmation, as a promise.
 *
 * The console asks for confirmation with native `window.confirm()` in issues,
 * citizens, announcements, locations and workers, and with native `prompt()`
 * for delete-admin. Native dialogs cannot be styled, block the entire browser
 * tab, look like a phishing attempt in some browsers, and in the `prompt()`
 * case ask an operator to hand-type a value with no validation.
 *
 * Promise-based rather than a `<ConfirmDialog open={…} />` component, because
 * all fourteen call sites are inside `async` handlers already shaped like:
 *
 *     if (!confirm('Delete this issue?')) return;
 *     await adminApi.deleteIssue(id);
 *
 * which becomes:
 *
 *     if (!(await confirm({ title: 'Delete this issue?' }))) return;
 *     await adminApi.deleteIssue(id);
 *
 * A controlled component would force every one of those handlers to be split
 * in two around a piece of state, which is how confirmation dialogs end up
 * being skipped.
 */

/** @typedef {object} ConfirmOptions
 * @property {string} title
 * @property {string} [description]
 * @property {string} [confirmLabel='Confirm']
 * @property {string} [cancelLabel='Cancel']
 * @property {'primary'|'danger'} [tone='primary']
 * @property {string} [requireTyping] the user must type this exactly to proceed
 */

const ConfirmContext = createContext(null);

/**
 * Ask for confirmation.
 *
 * @returns {(options: ConfirmOptions) => Promise<boolean>}
 */
export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    throw new Error('useConfirm must be used inside <ConfirmProvider> (see src/lib/providers.js)');
  }
  return ctx;
}

/**
 * Mounted once, near the root. Holds the single dialog every screen shares.
 *
 * @param {{ children: React.ReactNode }} props
 */
export function ConfirmProvider({ children }) {
  const [options, setOptions] = useState(null);
  const [typed, setTyped] = useState('');
  const resolver = useRef(null);
  const cancelRef = useRef(null);

  const confirm = useCallback((opts) => {
    setTyped('');
    setOptions(opts);
    return new Promise((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const settle = useCallback((result) => {
    resolver.current?.(result);
    resolver.current = null;
    setOptions(null);
    setTyped('');
  }, []);

  const value = useMemo(() => confirm, [confirm]);

  const needsTyping = Boolean(options?.requireTyping);
  const typedMatches = !needsTyping || typed === options.requireTyping;

  return (
    <ConfirmContext.Provider value={value}>
      {children}

      <Modal
        open={Boolean(options)}
        // Escape and the backdrop mean "no", not "silently do nothing" — a
        // dialog that resolves nothing leaves the caller's await hanging
        // forever and the handler never completes.
        onClose={() => settle(false)}
        title={options?.title}
        description={options?.description}
        size="sm"
        // Focus lands on Cancel, never on the destructive action. Autofocusing
        // "Delete" means a stray Enter deletes.
        initialFocus={cancelRef}
        footer={
          <>
            <Button
              ref={cancelRef}
              variant="secondary"
              size="sm"
              onClick={() => settle(false)}
            >
              {options?.cancelLabel ?? 'Cancel'}
            </Button>
            <Button
              variant={options?.tone === 'danger' ? 'danger' : 'primary'}
              size="sm"
              disabled={!typedMatches}
              onClick={() => settle(true)}
            >
              {options?.confirmLabel ?? 'Confirm'}
            </Button>
          </>
        }
      >
        {needsTyping ? (
          <div className="space-y-2">
            <label htmlFor="confirm-typing" className="block text-sm text-ink-muted">
              Type{' '}
              <code className="rounded bg-surface-alt px-1 py-0.5 font-mono text-xs text-ink">
                {options.requireTyping}
              </code>{' '}
              to confirm.
            </label>
            <input
              id="confirm-typing"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              autoComplete="off"
              className="w-full rounded-control border border-border px-3 py-2 text-sm
                         outline-none focus:border-primary"
            />
          </div>
        ) : (
          // The description already rendered in the Modal header; nothing more
          // to say for a plain confirmation.
          <p className="text-sm text-ink-muted">
            {options?.description ? '' : 'This action cannot be undone.'}
          </p>
        )}
      </Modal>
    </ConfirmContext.Provider>
  );
}
