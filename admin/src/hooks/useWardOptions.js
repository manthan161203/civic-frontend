'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import { locationsApi } from '@/api/index';
import { qk } from '@/api/queryKeys';
import { useAuthStore } from '@/store/authStore';

/**
 * The ward picker, scoped to what the signed-in admin may actually assign to.
 *
 * This flattening was written out three separate times in the workers screen
 * alone — once in the create form, once in the edit modal, and a third partial
 * version in the list loader that built an id→name map. Two of them ran
 * `GET /locations/tree` on their own, and the third re-ran it on **every page
 * change** of the worker table, because the fetch sat inside the list loader.
 *
 * The tree is the whole district/taluka/ward hierarchy and it changes about
 * never, so it is cached under a shared key with a long `staleTime` and every
 * consumer reads the same copy.
 *
 * ── The scoping rule ─────────────────────────────────────────────────────────
 *
 * A district admin may only assign within their district, a taluka admin within
 * their taluka, a ward admin only their own ward. The backend enforces this on
 * write; filtering here is so the dropdown does not offer a choice that is going
 * to come back 403.
 *
 * Note the `&&` on each check: an admin whose own scope column is null falls
 * through to seeing everything. That is deliberate and matches the backend —
 * `get_admin_scope_filter` treats a scoped admin with no scope as fail-closed
 * on *data*, but this list is only a convenience, and blanking it would make
 * the form look broken rather than restricted.
 */
export function useWardOptions() {
  const user = useAuthStore((s) => s.user);

  const query = useQuery({
    queryKey: qk.locations.all,
    queryFn: ({ signal }) => locationsApi.getTree({ signal }).then((r) => r.data),
    staleTime: 10 * 60_000,
  });

  const tree = useMemo(() => {
    const data = query.data;
    // The endpoint has returned both a bare array and `{districts: [...]}`
    // depending on version; accept either rather than rendering an empty list.
    return Array.isArray(data) ? data : (data?.districts ?? []);
  }, [query.data]);

  const options = useMemo(() => {
    const out = [];
    for (const district of tree) {
      if (user?.role === 'district_admin' && user.district_id && district.id !== user.district_id) {
        continue;
      }
      for (const taluka of district.talukas ?? []) {
        if (user?.role === 'taluka_admin' && user.taluka_id && taluka.id !== user.taluka_id) {
          continue;
        }
        for (const ward of taluka.wards ?? []) {
          if (user?.role === 'ward_admin' && user.ward_id && ward.id !== user.ward_id) continue;
          out.push({
            value: ward.id,
            label: `${ward.name} (Ward-${ward.ward_number}) · ${taluka.name}, ${district.name}`,
          });
        }
      }
    }
    return out;
  }, [tree, user]);

  /** id → name, for rendering a worker's ward in a table cell. */
  const wardNames = useMemo(() => {
    const map = {};
    for (const district of tree) {
      for (const taluka of district.talukas ?? []) {
        for (const ward of taluka.wards ?? []) map[ward.id] = ward.name;
      }
    }
    return map;
  }, [tree]);

  return { options, wardNames, tree, isPending: query.isPending, error: query.error };
}

export default useWardOptions;
