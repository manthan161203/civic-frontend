'use client';

import { useForm } from 'react-hook-form';
import { getErrorMessage, getFieldErrors } from '@/api/errors';

/**
 * `react-hook-form` plus the one piece the console was missing: routing a
 * FastAPI 422 back onto the fields that caused it.
 *
 * Both halves of this already existed and were never connected.
 * `react-hook-form` is a declared dependency with **zero imports**, and
 * `parseValidationDetail` in `src/api/errors.js` joins FastAPI's `loc` path
 * with **dots** — `shifts.0.start_time` — which is precisely the path syntax
 * RHF's `setError` consumes. That function has five unit tests and is imported
 * by no screen.
 *
 * The result today is that every form shows one flat red string above a set of
 * inputs with nothing highlighted, so "Please correct the highlighted fields"
 * appears next to a form in which nothing is highlighted.
 *
 * ── The rule that makes this work ────────────────────────────────────────────
 *
 * **RHF field names must equal the API payload keys.** FastAPI's `loc` carries
 * the server's names (`ward_id`, `district_id`, `phone`); if the form calls a
 * field `selectedWard`, no amount of machinery lands the error on the right
 * control. `fieldAliases` exists for the cases you genuinely cannot rename, not
 * as the normal path.
 *
 * @param {import('react-hook-form').UseFormProps & {
 *   onSubmit: (values: any) => Promise<unknown>,
 *   onSuccess?: (result: unknown, values: any) => void,
 *   fieldAliases?: Record<string, string>,
 * }} options
 */
export function useApiForm({ onSubmit, onSuccess, fieldAliases = {}, ...formOptions }) {
  const form = useForm({
    // Validate on blur rather than on submit: telling someone their phone
    // number is too short as they leave the field beats telling them after
    // they have filled in six more.
    mode: 'onTouched',
    ...formOptions,
  });

  const submit = form.handleSubmit(async (values) => {
    form.clearErrors('root.serverError');

    try {
      const result = await onSubmit(values);
      onSuccess?.(result, values);
      return result;
    } catch (error) {
      const fields = getFieldErrors(error);
      const known = new Set(Object.keys(form.getValues()));
      let placed = 0;

      for (const [rawKey, message] of Object.entries(fields ?? {})) {
        const key = fieldAliases[rawKey] ?? rawKey;
        // `general` is the bucket parseValidationDetail uses for a body-level
        // error with no field, and a nested path's root has to exist on the
        // form or setError silently attaches to nothing.
        if (key !== 'general' && known.has(key.split('.')[0])) {
          form.setError(key, { type: 'server', message });
          placed += 1;
        }
      }

      // Anything unplaceable — 'general', a 409, a 500, a field this form does
      // not own — surfaces at the top rather than vanishing. Silently dropping
      // it is how a failed save looks like a successful one.
      if (!fields || placed < Object.keys(fields).length) {
        form.setError('root.serverError', {
          type: 'server',
          message: getErrorMessage(error, 'Could not save. Please try again.'),
        });
      }

      return undefined;
    }
  });

  return {
    ...form,
    submit,
    /** Convenience for the banner above the form. */
    serverError: form.formState.errors.root?.serverError?.message,
  };
}

export default useApiForm;
