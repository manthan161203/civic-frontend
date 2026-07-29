'use client';

/**
 * Compatibility shim.
 *
 * `LoadingButton` was the console's only real button primitive and is imported
 * by twelve screens. The implementation moved to `Button.jsx` and gained new
 * variants; re-exporting keeps those twelve imports working so the move is not
 * entangled with a twelve-file diff.
 *
 * The same convention `src/lib/apiError.js` already uses for `src/api/errors`.
 *
 * New code should import `@/components/ui/Button`. This file exists only so the
 * migration can happen screen by screen.
 */

export { default } from './Button';
