'use client';

import { useFormContext } from 'react-hook-form';
import Field, { CONTROL_CLASSES, borderClass } from '../Field';
import Spinner from '../Spinner';

/**
 * RHF-bound controls.
 *
 * Four concrete components rather than one generic render-prop `<Field>`,
 * because the whole console contains exactly four kinds of control — text,
 * select, textarea and a row of choice chips — and a render-prop abstraction
 * costs more than it saves at that count.
 *
 * Each reads its error from `useFormContext`, so the 422 routed by
 * `useApiForm` lands on the control without the screen wiring anything.
 */

/** Pull the error message for a possibly-nested field name. */
function errorFor(errors, name) {
  const node = name.split('.').reduce((acc, part) => acc?.[part], errors);
  return node?.message;
}

/**
 * @typedef {object} TextFieldProps
 * @property {string} name must equal the API payload key — see useApiForm
 * @property {string} label
 * @property {string} [hint]
 * @property {string} [prefix] static text inside the control, e.g. "+91"
 * @property {(value: string) => string} [transform] applied on change, e.g. digits-only
 * @property {object} [rules] react-hook-form validation rules
 */

/** @param {TextFieldProps & Record<string, any>} props */
export function TextField({ name, label, hint, prefix, transform, rules, ...inputProps }) {
  const { register, formState, setValue, getValues } = useFormContext();
  const error = errorFor(formState.errors, name);
  const registered = register(name, rules);

  return (
    <Field label={label} htmlFor={name} hint={hint} error={error} required={Boolean(rules?.required)}>
      {({ describedBy, invalid }) => (
        <div className="relative">
          {prefix && (
            <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-ink-subtle">
              {prefix}
            </span>
          )}
          <input
            id={name}
            aria-invalid={invalid}
            aria-describedby={describedBy}
            {...registered}
            onChange={(e) => {
              if (transform) {
                // Masking happens here rather than at submit so the user sees
                // what will actually be sent — but the *payload* transform
                // (adding "+91", dropping empty strings) stays at submit, so a
                // 422 on `phone` still highlights the box they typed into.
                const next = transform(e.target.value);
                setValue(name, next, { shouldValidate: formState.isSubmitted });
                return;
              }
              registered.onChange(e);
            }}
            value={transform ? (getValues(name) ?? '') : undefined}
            className={`${CONTROL_CLASSES} ${borderClass(invalid)} ${prefix ? 'pl-11' : ''}`}
            {...inputProps}
          />
        </div>
      )}
    </Field>
  );
}

/**
 * @param {{ name: string, label: string, options: {value: string, label: string}[],
 *          placeholder?: string, hint?: string, disabled?: boolean,
 *          loading?: boolean, error?: unknown, rules?: object }} props
 *   `loading` and `error` describe the *options* request, not the field value —
 *   a cascading select whose parent list failed to load previously rendered as
 *   an empty dropdown with no explanation.
 */
export function SelectField({
  name,
  label,
  options,
  placeholder = 'Select…',
  hint,
  disabled = false,
  loading = false,
  error: optionsError,
  rules,
}) {
  const { register, formState } = useFormContext();
  const fieldError = errorFor(formState.errors, name);

  const message = fieldError ?? (optionsError ? 'Could not load these options.' : undefined);

  return (
    <Field
      label={label}
      htmlFor={name}
      hint={hint}
      error={message}
      required={Boolean(rules?.required)}
    >
      {({ describedBy, invalid }) => (
        <div className="relative">
          <select
            id={name}
            disabled={disabled || loading}
            aria-invalid={invalid}
            aria-describedby={describedBy}
            {...register(name, rules)}
            className={`${CONTROL_CLASSES} ${borderClass(invalid)} appearance-none pr-8`}
          >
            <option value="">{loading ? 'Loading…' : placeholder}</option>
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {loading && (
            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-subtle">
              <Spinner size="sm" label={null} />
            </span>
          )}
        </div>
      )}
    </Field>
  );
}

/** @param {{ name: string, label: string, rows?: number, hint?: string, rules?: object }} props */
export function TextAreaField({ name, label, rows = 4, hint, rules, ...rest }) {
  const { register, formState } = useFormContext();
  const error = errorFor(formState.errors, name);

  return (
    <Field label={label} htmlFor={name} hint={hint} error={error} required={Boolean(rules?.required)}>
      {({ describedBy, invalid }) => (
        <textarea
          id={name}
          rows={rows}
          aria-invalid={invalid}
          aria-describedby={describedBy}
          {...register(name, rules)}
          className={`w-full rounded-control border bg-surface px-2.5 py-2 text-sm text-ink
            outline-none placeholder:text-ink-subtle ${borderClass(invalid)}`}
          {...rest}
        />
      )}
    </Field>
  );
}

/**
 * A row of chips, for a short mutually-exclusive choice.
 *
 * Rendered as real radios so arrow-key navigation and screen-reader grouping
 * come for free; the chip look is the label.
 *
 * @param {{ name: string, label: string, options: {value: string, label: string}[],
 *          hint?: string, rules?: object }} props
 */
export function ChoiceField({ name, label, options, hint, rules }) {
  const { register, watch, formState } = useFormContext();
  const error = errorFor(formState.errors, name);
  const current = watch(name);

  return (
    <Field label={label} htmlFor={`${name}-${options[0]?.value}`} hint={hint} error={error}>
      {() => (
        <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-1.5">
          {options.map((option) => {
            const selected = current === option.value;
            return (
              <label
                key={option.value}
                className={`cursor-pointer rounded-control border px-2.5 py-1.5 text-xs font-medium
                  transition-colors ${
                    selected
                      ? 'border-primary bg-primary-soft text-primary-strong'
                      : 'border-border text-ink-muted hover:bg-surface-alt'
                  }`}
              >
                <input
                  id={`${name}-${option.value}`}
                  type="radio"
                  value={option.value}
                  {...register(name, rules)}
                  className="sr-only"
                />
                {option.label}
              </label>
            );
          })}
        </div>
      )}
    </Field>
  );
}

export { FormError } from '../Field';
