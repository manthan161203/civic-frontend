/**
 * Role and permission checks for the admin surface.
 *
 * The backend is the authority — every rule here is also enforced server-side,
 * and nothing in this file is a security boundary. Its job is to stop the UI
 * from offering actions that are going to 403, because a 403 the user could not
 * have anticipated is indistinguishable from a bug.
 *
 * The route table comes from `@civic/api-types`, which derives it from the
 * backend's own `Depends(require_role(...))` declarations. That means these
 * checks cannot drift from the API by hand-editing — they drift only when the
 * backend changes and the manifest is regenerated.
 */

import { ENDPOINT_ACCESS, ADMIN_ROLES } from '@civic/api-types';

/** @typedef {import('@civic/api-types').Role} Role */

/** Roles this app is for. A citizen or worker token must not get past login. */
export const ALLOWED_ADMIN_ROLES = /** @type {readonly Role[]} */ (ADMIN_ROLES);

/**
 * Broadest to narrowest. Used for "at least this senior" comparisons.
 * @type {readonly Role[]}
 */
export const ROLE_HIERARCHY = ['admin', 'district_admin', 'taluka_admin', 'ward_admin'];

export const ROLE_LABELS = {
  admin: 'Super Admin',
  district_admin: 'District Admin',
  taluka_admin: 'Taluka Admin',
  ward_admin: 'Ward Admin',
};

/**
 * Is this user allowed into the admin app at all?
 *
 * Deliberately an allowlist. The previous check was
 * `role?.includes('admin') && role !== 'admin'`, a substring test that happened
 * to work only because every admin tier is named `*_admin` — a role called
 * `admin_assistant` would have walked straight in.
 *
 * @param {{ role?: string } | null | undefined} user
 * @returns {boolean}
 */
export function isAdminUser(user) {
  return !!user?.role && ALLOWED_ADMIN_ROLES.includes(/** @type {Role} */ (user.role));
}

/** @param {{ role?: string } | null | undefined} user */
export function isSuperAdmin(user) {
  return user?.role === 'admin';
}

/**
 * True when `role` sits at or above `minimum` in the hierarchy.
 * @param {string | undefined} role
 * @param {Role} minimum
 */
export function hasAtLeastRole(role, minimum) {
  const held = ROLE_HIERARCHY.indexOf(/** @type {Role} */ (role));
  const need = ROLE_HIERARCHY.indexOf(minimum);
  return held !== -1 && need !== -1 && held <= need;
}

/**
 * Can this user call this endpoint?
 *
 * @param {{ role?: string } | null | undefined} user
 * @param {string} endpoint `"METHOD /path"`, e.g. `"POST /admin/admins"`
 * @returns {boolean}
 */
export function canCall(user, endpoint) {
  const entry = ENDPOINT_ACCESS[endpoint];
  // Unknown endpoint: allow, and let the server answer. Failing closed here
  // would break the app every time a route is added ahead of a regeneration.
  if (!entry) return true;
  if (entry.roles === null) return true; // public
  return !!user?.role && entry.roles.includes(/** @type {Role} */ (user.role));
}

/**
 * Named capabilities, so pages ask "may I do this" instead of hard-coding role
 * lists in JSX. Each maps to the endpoint that actually enforces it.
 *
 * Route-level only — a `ward_admin` who passes `manageWorkers` can still get a
 * 403 for a worker outside their ward, because jurisdiction scoping happens
 * inside the handler and cannot be predicted from here.
 */
const CAPABILITY_ENDPOINTS = {
  manageAdmins: 'POST /admin/admins',
  changeUserRole: 'PATCH /admin/users/{user_id}/role',
  deleteUser: 'DELETE /admin/users/{user_id}',
  grantOverride: 'POST /admin/overrides/grant',
  viewOverrideAudit: 'GET /admin/overrides/audit-log',
  manageWorkers: 'POST /admin/workers',
  manageIssues: 'GET /admin/issues',
  deleteIssue: 'DELETE /admin/issues/{issue_id}',
  manageAnnouncements: 'POST /admin/announcements',
  manageGeofences: 'POST /admin/geofences',
  sendGeofenceNotification: 'POST /admin/notifications/geofence',
  manageDistricts: 'POST /locations/districts',
  manageTalukas: 'POST /locations/districts/{district_id}/talukas',
  manageWards: 'POST /locations/talukas/{taluka_id}/wards',
  viewSla: 'GET /issues/sla/dashboard',
  viewIntegrity: 'GET /health/integrity',
};

/** @typedef {keyof typeof CAPABILITY_ENDPOINTS} Capability */

/**
 * @param {{ role?: string } | null | undefined} user
 * @param {Capability} capability
 * @returns {boolean}
 */
export function can(user, capability) {
  const endpoint = CAPABILITY_ENDPOINTS[capability];
  if (!endpoint) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`[permissions] unknown capability: ${capability}`);
    }
    return false;
  }
  return canCall(user, endpoint);
}

/**
 * Route guard for dashboard pages. Keys are pathname prefixes.
 *
 * This is the list the sidebar already encoded for *visibility*; applying it to
 * navigation too closes the gap where a ward admin could type
 * `/dashboard/admins` directly, get a rendered page, and then have every API
 * call on it fail.
 *
 * @type {Record<string, readonly Role[]>}
 */
export const ROUTE_ROLES = {
  '/dashboard/admins': ['admin', 'district_admin', 'taluka_admin'],
  '/dashboard/admin-overrides': ['admin'],
  '/dashboard/admin-messages': ['admin', 'district_admin', 'taluka_admin', 'ward_admin'],
  '/dashboard/locations': ['admin', 'district_admin'],
  '/dashboard/custom-types': ['admin', 'district_admin'],
  '/dashboard/bulk-notifications': ['admin', 'district_admin'],
  '/dashboard/geofence': ['admin', 'district_admin'],
  '/dashboard/sla': ['admin', 'district_admin', 'taluka_admin'],
  '/dashboard/squads': ['admin', 'district_admin', 'taluka_admin'],
  '/dashboard/surveys': ['admin', 'district_admin', 'taluka_admin'],
};

/**
 * Is this user allowed on this pathname?
 *
 * @param {{ role?: string } | null | undefined} user
 * @param {string} pathname
 * @returns {boolean}
 */
export function canVisit(user, pathname) {
  if (!isAdminUser(user)) return false;
  const match = Object.keys(ROUTE_ROLES)
    .filter((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
    // Longest prefix wins, so a nested route can be narrower than its parent.
    .sort((a, b) => b.length - a.length)[0];
  if (!match) return true;
  return ROUTE_ROLES[match].includes(/** @type {Role} */ (user.role));
}
