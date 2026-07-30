/**
 * The permission layer's runtime dependencies must actually exist at runtime.
 *
 * `src/api/permissions.js` imports `ADMIN_ROLES` and `ENDPOINT_ACCESS` from
 * `@civic/api-types`. Both apps' `jsconfig.json` mapped that specifier to
 * `src/index.d.ts` — a pure declaration file with **no runtime exports**.
 *
 * Bundlers honour `paths`, so in the browser every one of those imports was
 * `undefined`, and `isAdminUser()` died on
 * `Cannot read properties of undefined (reading 'includes')` the first time
 * anyone signed in. Node ignores `jsconfig`, follows the node_modules symlink
 * and gets the real `index.js` — so every existing test passed and the failure
 * was browser-only.
 *
 * These assertions are deliberately about *values*, not types: a type test
 * cannot tell the difference between a real array and an erased declaration,
 * which is precisely how this shipped.
 */

import { ADMIN_ROLES, ENDPOINT_ACCESS } from '@civic/api-types';
import { isAdminUser, canVisit, ALLOWED_ADMIN_ROLES } from '@/api/permissions';

describe('@civic/api-types resolves to runtime values', () => {
  it('ADMIN_ROLES is a populated array, not an erased type', () => {
    expect(Array.isArray(ADMIN_ROLES)).toBe(true);
    expect(ADMIN_ROLES.length).toBeGreaterThan(0);
    expect(ADMIN_ROLES).toContain('district_admin');
  });

  it('ENDPOINT_ACCESS is a populated object', () => {
    expect(ENDPOINT_ACCESS).toBeDefined();
    expect(Object.keys(ENDPOINT_ACCESS).length).toBeGreaterThan(0);
  });

  it('ALLOWED_ADMIN_ROLES is usable — the exact expression that threw', () => {
    expect(ALLOWED_ADMIN_ROLES).toBeDefined();
    expect(() => ALLOWED_ADMIN_ROLES.includes('admin')).not.toThrow();
  });
});

describe('isAdminUser', () => {
  it('does not throw for a real admin — the login-path regression', () => {
    // permissions.js:47 threw here, and toApiError then reported it to the user
    // as "Could not reach the server", which sent debugging in the wrong
    // direction entirely.
    expect(() => isAdminUser({ role: 'admin' })).not.toThrow();
    expect(isAdminUser({ role: 'admin' })).toBe(true);
  });

  it('accepts every scoped admin tier', () => {
    for (const role of ['district_admin', 'taluka_admin', 'ward_admin']) {
      expect(isAdminUser({ role })).toBe(true);
    }
  });

  it('rejects non-admins and empty input', () => {
    expect(isAdminUser({ role: 'citizen' })).toBe(false);
    expect(isAdminUser({ role: 'worker' })).toBe(false);
    expect(isAdminUser(null)).toBe(false);
    expect(isAdminUser(undefined)).toBe(false);
    expect(isAdminUser({})).toBe(false);
  });
});

describe('canVisit depends on the same imports', () => {
  it('does not throw, and gates a ward admin out of an admin-only route', () => {
    expect(() => canVisit({ role: 'admin' }, '/dashboard')).not.toThrow();
    expect(canVisit({ role: 'admin' }, '/dashboard/admin-overrides')).toBe(true);
    expect(canVisit({ role: 'ward_admin' }, '/dashboard/admin-overrides')).toBe(false);
  });
});
