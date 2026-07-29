/**
 * Narrow a location list to what the signed-in admin may actually pick.
 *
 * The same role-filtering block was written three times in
 * `app/dashboard/admins/page.js` — once for districts, once for talukas, once
 * for wards — and again inside the Edit modal in the same file, with the
 * branches subtly different each time. Being a pure function it is also
 * testable, which the inline versions were not.
 *
 * This is presentation only. The backend enforces the same thing in
 * `_resolve_geofence_scope` and `user_scope_filter`, and will reject an
 * out-of-scope id regardless of what this returns — so a bug here is a
 * usability problem, not a security one.
 *
 * @template {{ id: string }} T
 * @param {T[]} list
 * @param {{ role?: string, district_id?: string, taluka_id?: string, ward_id?: string }|null} user
 * @param {'district'|'taluka'|'ward'} level
 * @returns {T[]}
 */
export function scopeFilter(list, user, level) {
  const items = Array.isArray(list) ? list : [];
  if (!user || user.role === 'admin') return items;

  // A scoped admin sees exactly their own branch of the hierarchy at or above
  // their level, and everything below it. A ward_admin picking a district is
  // shown only their own district — not as a restriction on the dropdown so
  // much as an acknowledgement that the other options would 403.
  const pin = {
    district: user.district_id,
    taluka: user.role === 'ward_admin' || user.role === 'taluka_admin' ? user.taluka_id : null,
    ward: user.role === 'ward_admin' ? user.ward_id : null,
  }[level];

  return pin ? items.filter((item) => item.id === pin) : items;
}

/**
 * The roles a given admin is permitted to create or assign.
 *
 * Encoded once rather than inline in two components. A super-admin cannot
 * create another super-admin here by design — that is a bootstrap operation,
 * not a console one.
 *
 * @param {{ role?: string }|null} user
 * @returns {string[]}
 */
export function creatableRoles(user) {
  return (
    {
      admin: ['district_admin', 'taluka_admin', 'ward_admin'],
      district_admin: ['taluka_admin', 'ward_admin'],
      taluka_admin: ['ward_admin'],
    }[user?.role] ?? []
  );
}

/**
 * Which jurisdiction fields a role actually needs.
 *
 * Used to decide which selects to show, and which are required — a
 * district_admin has no ward, so demanding one is asking for a value the
 * backend would ignore.
 *
 * @param {string} role
 * @returns {{ district: boolean, taluka: boolean, ward: boolean }}
 */
export function scopeFieldsFor(role) {
  return {
    district: role !== 'admin',
    taluka: role === 'taluka_admin' || role === 'ward_admin',
    ward: role === 'ward_admin',
  };
}
