'use client';

import { FormProvider } from 'react-hook-form';
import { useQueryClient } from '@tanstack/react-query';

import { adminApi } from '@/api/index';
import { qk } from '@/api/queryKeys';
import { useUiStore } from '@/store/uiStore';
import { useApiForm } from '@/hooks/useApiForm';
import { useWardOptions } from '@/hooks/useWardOptions';

import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { TextField, SelectField, FormError } from '@/components/ui/form';

/**
 * Create or edit a worker.
 *
 * These were two near-identical forms — a create form inlined in the page and an
 * `EditWorkerModal` beside it — each with its own copy of the ward loader, its
 * own phone handling and its own error state. They disagreed: create required an
 * email and edit had no email field at all, so an admin could not fix a typo in
 * the address the invitation was about to be sent to.
 *
 * ── Phone ────────────────────────────────────────────────────────────────────
 *
 * Stored and sent as E.164 (`+919876543210`), typed as ten digits. Both old
 * forms stripped non-digits on every keystroke, which meant pasting a number
 * formatted as `+91 98765 43210` silently produced `919876543210` — eleven
 * digits, rejected on submit with no explanation of what happened. Normalising
 * once at submit, and validating the result, keeps the paste working.
 */

/** `+919876543210` → `9876543210`, and anything unexpected → itself. */
function toLocalDigits(phone) {
  const digits = String(phone ?? '').replace(/\D/g, '');
  return digits.length > 10 ? digits.slice(-10) : digits;
}

const DEPARTMENTS = ['water', 'roads', 'electricity', 'sanitation', 'parks', 'other'].map((d) => ({
  value: d,
  label: d[0].toUpperCase() + d.slice(1),
}));

export default function WorkerFormModal({ open, worker, onClose }) {
  const addToast = useUiStore((s) => s.addToast);
  const queryClient = useQueryClient();
  const wards = useWardOptions();

  const editing = Boolean(worker);

  const form = useApiForm({
    defaultValues: {
      name: worker?.name ?? '',
      phone: toLocalDigits(worker?.phone),
      email: worker?.email ?? '',
      ward_id: worker?.ward_id ?? '',
      department: worker?.department ?? '',
    },
    onSubmit: (values) => {
      const payload = {
        name: values.name.trim(),
        phone: `+91${toLocalDigits(values.phone)}`,
        // Empty string is not "unassigned" to the API — null is.
        ward_id: values.ward_id || null,
        department: values.department || null,
      };

      if (editing) return adminApi.updateWorker(worker.id, payload).then((r) => r.data);

      return adminApi
        .createWorker({ ...payload, email: values.email.trim(), role: 'worker' })
        .then((r) => r.data);
    },
    onSuccess: (data) => {
      if (editing) {
        addToast('Worker updated', 'success');
      } else if (data?.email_sent === false) {
        // The temporary password only exists in this response. Saying "created"
        // and moving on strands the worker with a credential nobody has.
        addToast(
          'Worker created, but the invitation email could not be sent. Use “Resend invite” once mail is configured.',
          'warning',
          8000,
        );
      } else {
        addToast('Worker created and invitation sent', 'success');
      }
      queryClient.invalidateQueries({ queryKey: qk.workers.all });
      form.reset();
      onClose();
    },
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? `Edit ${worker.name}` : 'Add a worker'}
      description={
        editing
          ? undefined
          : 'They receive an email with a temporary password and are asked to change it on first sign-in.'
      }
      size="md"
      dismissible={!form.formState.isSubmitting}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={form.formState.isSubmitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="worker-form"
            isLoading={form.formState.isSubmitting}
            loadingText={editing ? 'Saving…' : 'Creating…'}
          >
            {editing ? 'Save changes' : 'Create and invite'}
          </Button>
        </>
      }
    >
      <FormProvider {...form}>
        <form id="worker-form" onSubmit={form.submit} className="space-y-4" noValidate>
          <FormError message={form.serverError} />

          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              name="name"
              label="Name"
              autoComplete="off"
              rules={{ required: 'Enter the worker’s name' }}
            />
            <TextField
              name="phone"
              label="Phone"
              type="tel"
              inputMode="numeric"
              prefix="+91"
              autoComplete="off"
              rules={{
                required: 'Enter a phone number',
                validate: (value) =>
                  toLocalDigits(value).length === 10 || 'That is not a 10-digit Indian number',
              }}
            />
          </div>

          {!editing && (
            <TextField
              name="email"
              label="Email"
              type="email"
              autoComplete="off"
              hint="The invitation goes here. It cannot be changed later from this screen."
              rules={{
                required: 'An email is required to send the invitation',
                pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Check this address' },
              }}
            />
          )}

          <SelectField
            name="ward_id"
            label="Ward"
            options={wards.options}
            placeholder="No ward assigned"
            loading={wards.isPending}
            error={wards.error}
            hint="Unassigned workers can still be given tasks manually, but auto-assignment skips them."
          />

          <SelectField
            name="department"
            label="Department"
            options={DEPARTMENTS}
            placeholder="No department"
            hint="Auto-assignment matches an issue’s department to the worker’s."
          />
        </form>
      </FormProvider>
    </Modal>
  );
}
