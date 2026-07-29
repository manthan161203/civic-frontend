'use client';

import { useEffect } from 'react';
import { FormProvider } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';

import { adminApi, locationsApi } from '@/api/index';
import { qk } from '@/api/queryKeys';
import { scopeFilter, creatableRoles, scopeFieldsFor } from '@/api/scopeFilter';
import { useApiForm } from '@/hooks/useApiForm';
import { useAuthStore } from '@/store/authStore';
import { useUiStore } from '@/store/uiStore';

import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import {
  TextField,
  SelectField,
  ChoiceField,
  FormError,
} from '@/components/ui/form';
import { resolveTone } from '@/components/ui/statusTones';

/**
 * Create or edit a sub-admin.
 *
 * One component for both, because the two were near-duplicates of each other in
 * the same file — including three copies of the cascading-select logic with
 * subtly different branches.
 *
 * This is the screen that proves `useApiForm`. Before, a 422 on `body.ward_id`
 * printed one flat red string above a form with nothing highlighted; now it
 * lands on the Ward select. The rule that makes that work: **every field name
 * here is the API payload key**, because FastAPI's `loc` carries the server's
 * names.
 *
 * @param {{ admin?: object, onDone: () => void, onCancel?: () => void }} props
 *   Pass `admin` to edit; omit it to create.
 */
export default function AdminForm({ admin, onDone, onCancel }) {
  const { user: me } = useAuthStore();
  const addToast = useUiStore((s) => s.addToast);
  const isEdit = Boolean(admin);
  const roles = creatableRoles(me);

  const form = useApiForm({
    defaultValues: {
      name: admin?.name ?? '',
      // Stored with the +91 prefix; edited without it. The prefix is re-added
      // at submit rather than kept in the field, so a 422 on `phone` still
      // highlights the box the user actually typed into.
      phone: admin?.phone ? admin.phone.replace(/^\+91/, '') : '',
      role: admin?.role ?? roles[roles.length - 1] ?? 'ward_admin',
      district_id: admin?.district_id ?? (me?.role !== 'admin' ? me?.district_id ?? '' : ''),
      taluka_id: admin?.taluka_id ?? '',
      ward_id: admin?.ward_id ?? '',
    },
    onSubmit: (values) => {
      const payload = {
        name: values.name.trim(),
        role: values.role,
        district_id: values.district_id || undefined,
        taluka_id: values.taluka_id || undefined,
        ward_id: values.ward_id || undefined,
      };
      return isEdit
        ? adminApi.updateAdmin(admin.id, payload).then((r) => r.data)
        : adminApi
            .createAdmin({ ...payload, phone: `+91${values.phone}`, language: 'en' })
            .then((r) => r.data);
    },
    onSuccess: (saved) => {
      const label = resolveTone('adminRole', saved?.role ?? 'ward_admin').label;
      addToast(isEdit ? `${saved.name} updated` : `${saved.name} created as ${label}`, 'success');
      if (!isEdit) form.reset();
      onDone();
    },
  });

  const role = form.watch('role');
  const districtId = form.watch('district_id');
  const talukaId = form.watch('taluka_id');
  const needs = scopeFieldsFor(role);

  /*
   * Three chained effects become three declarative queries.
   *
   * `enabled` replaces the "if (!selectedDistrict) { clear; return; }" guards,
   * and a failed fetch now surfaces on the control instead of being swallowed
   * by `.catch(err => console.error(...))`, which rendered an empty dropdown
   * with no explanation.
   */
  const districts = useQuery({
    queryKey: qk.locations.districts(),
    queryFn: ({ signal }) =>
      locationsApi
        .getDistricts({ signal })
        .then(({ data }) => scopeFilter(data.items ?? data, me, 'district')),
    staleTime: 10 * 60_000,
  });

  const talukas = useQuery({
    queryKey: qk.locations.talukas(districtId),
    queryFn: ({ signal }) =>
      locationsApi
        .getTalukas(districtId, { signal })
        .then(({ data }) => scopeFilter(data.items ?? data, me, 'taluka')),
    enabled: Boolean(districtId) && needs.taluka,
    staleTime: 10 * 60_000,
  });

  const wards = useQuery({
    queryKey: qk.locations.wards(talukaId),
    queryFn: ({ signal }) =>
      locationsApi
        .getWards(talukaId, { signal })
        .then(({ data }) => scopeFilter(data.items ?? data, me, 'ward')),
    enabled: Boolean(talukaId) && needs.ward,
    staleTime: 10 * 60_000,
  });

  // Clearing children when a parent changes, in one place rather than scattered
  // through the fetch effects where it was easy to miss a case.
  const { setValue } = form;
  useEffect(() => {
    setValue('taluka_id', '');
    setValue('ward_id', '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [districtId]);
  useEffect(() => {
    setValue('ward_id', '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [talukaId]);

  // A scoped admin whose only option is pre-selected should not have to pick it.
  useEffect(() => {
    const only = districts.data?.length === 1 ? districts.data[0].id : null;
    if (only && !districtId) setValue('district_id', only);
  }, [districts.data, districtId, setValue]);

  if (roles.length === 0) {
    return (
      <EmptyState
        icon="users"
        title="Not available to your role"
        description="Only a district admin or above can create sub-admins."
      />
    );
  }

  return (
    <FormProvider {...form}>
      <form onSubmit={form.submit} className="space-y-4" noValidate>
        <FormError message={form.serverError} />

        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            name="name"
            label="Full name"
            placeholder="e.g. Rajesh Kumar"
            rules={{ required: 'Name is required' }}
          />
          <TextField
            name="phone"
            label="Phone"
            type="tel"
            inputMode="numeric"
            prefix="+91"
            maxLength={10}
            disabled={isEdit}
            hint={isEdit ? 'Phone cannot be changed after creation' : undefined}
            transform={(v) => v.replace(/\D/g, '').slice(0, 10)}
            rules={
              isEdit
                ? undefined
                : {
                    required: 'Phone is required',
                    // Was checked after submit and reported twice — once as an
                    // inline string and once as a toast.
                    pattern: {
                      value: /^\d{10}$/,
                      message: 'Enter a valid 10-digit phone number',
                    },
                  }
            }
          />
        </div>

        <ChoiceField
          name="role"
          label="Role"
          options={roles.map((r) => ({ value: r, label: resolveTone('adminRole', r).label }))}
          rules={{ required: 'Pick a role' }}
        />

        <fieldset className="space-y-3 rounded-control border border-border bg-surface-alt p-3">
          <legend className="px-1 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
            Jurisdiction
          </legend>

          {needs.district && (
            <SelectField
              name="district_id"
              label="District"
              placeholder="Select a district"
              loading={districts.isPending}
              error={districts.error}
              options={(districts.data ?? []).map((d) => ({ value: d.id, label: d.name }))}
              rules={{ required: 'A district is required' }}
            />
          )}

          {needs.taluka && (
            <SelectField
              name="taluka_id"
              label="Taluka"
              placeholder={districtId ? 'Select a taluka' : 'Pick a district first'}
              disabled={!districtId}
              loading={talukas.isFetching}
              error={talukas.error}
              options={(talukas.data ?? []).map((t) => ({ value: t.id, label: t.name }))}
              rules={{ required: 'A taluka is required for this role' }}
            />
          )}

          {needs.ward && (
            <SelectField
              name="ward_id"
              label="Ward"
              placeholder={talukaId ? 'Select a ward' : 'Pick a taluka first'}
              disabled={!talukaId}
              loading={wards.isFetching}
              error={wards.error}
              options={(wards.data ?? []).map((w) => ({ value: w.id, label: w.name }))}
              rules={{ required: 'A ward is required for this role' }}
            />
          )}
        </fieldset>

        <div className="flex items-center justify-end gap-2">
          {onCancel && (
            <Button variant="secondary" size="sm" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button
            type="submit"
            size="sm"
            isLoading={form.formState.isSubmitting}
            loadingText={isEdit ? 'Saving…' : 'Creating…'}
          >
            {isEdit ? 'Save changes' : 'Create sub-admin'}
          </Button>
        </div>
      </form>
    </FormProvider>
  );
}
