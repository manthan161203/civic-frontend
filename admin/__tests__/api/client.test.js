/**
 * Tests for the API client layer: src/api/{errors,permissions}.js
 *
 * @jest-environment jsdom
 *
 * This replaces the previous `client.test.js` and `utils/errorHandler.test.js`.
 * Both asserted the behaviour this refactor set out to fix — that 403 is an
 * authentication failure, that 400 is a validation error and 422 is not — so
 * they could not be kept and corrected at the same time. The cases below encode
 * the contract the backend actually has.
 */

import { ApiError, toApiError, getErrorMessage, getFieldErrors } from '@/api/errors';

import {
  isAdminUser,
  isSuperAdmin,
  hasAtLeastRole,
  canCall,
  can,
  canVisit,
} from '@/api/permissions';

/** Build something shaped like an axios error. */
const axiosError = (status, data, headers = {}) => ({
  response: { status, data, headers },
  config: {},
  isAxiosError: true,
});

describe('toApiError', () => {
  describe('transport failures', () => {
    it('maps a missing response to a network error', () => {
      // `isAxiosError` matters. A real transport failure carries it; this
      // fixture used to omit it and still expect 'network', which is what let
      // the bug below ship.
      const e = toApiError({ isAxiosError: true, message: 'Network Error' });
      expect(e.kind).toBe('network');
      expect(e.retryable).toBe(true);
      expect(e.status).toBeNull();
    });

    it('does NOT call a thrown TypeError a network problem', () => {
      /*
       * The regression this guards.
       *
       * `toApiError` branched on a bare `!error.response`, so anything thrown
       * inside a caller's try block — a TypeError in a success path, most
       * often — was reported to the user as "Could not reach the server. Check
       * your connection."
       *
       * That cost a long debugging session: a login had already returned 200
       * and been accepted server-side, the failure was in the code after the
       * await, and the error message pointed at CORS, ports and DNS. Anything
       * that is not an axios error is a bug in our own code, and must not be
       * dressed up as a connectivity problem.
       */
      const e = toApiError(new TypeError('x is not a function'));
      expect(e.kind).toBe('client');
      expect(e.kind).not.toBe('network');
      // Retrying runs the same broken code and fails identically.
      expect(e.retryable).toBe(false);
      expect(e.message).not.toMatch(/connection/i);
    });

    it('still treats an axios error with a response as an HTTP error', () => {
      const e = toApiError({
        isAxiosError: true,
        response: { status: 400, data: { detail: 'Invalid or expired OTP' }, headers: {} },
      });
      expect(e.status).toBe(400);
      expect(e.message).toBe('Invalid or expired OTP');
      expect(e.kind).not.toBe('network');
    });

    it('maps ECONNABORTED to a timeout', () => {
      const e = toApiError({ code: 'ECONNABORTED' });
      expect(e.kind).toBe('timeout');
      expect(e.retryable).toBe(true);
    });

    it('treats a deliberate abort as canceled, not a failure', () => {
      const e = toApiError({ code: 'ERR_CANCELED' });
      expect(e.kind).toBe('canceled');
      expect(e.retryable).toBe(false);
    });
  });

  describe('the 401 / 403 distinction', () => {
    // The headline fix. The old `isAuthError` was `401 || 403`, and the axios
    // interceptor destroyed the session for both — so a scoped admin reading
    // outside their jurisdiction was logged out instead of told "not allowed".
    it('401 ends the session', () => {
      const e = toApiError(axiosError(401, { detail: 'Not authenticated' }));
      expect(e.kind).toBe('unauthenticated');
      expect(e.isSessionEnded).toBe(true);
      expect(e.isForbidden).toBe(false);
    });

    it('403 does NOT end the session', () => {
      const e = toApiError(axiosError(403, { detail: 'Out of scope' }));
      expect(e.kind).toBe('forbidden');
      expect(e.isForbidden).toBe(true);
      expect(e.isSessionEnded).toBe(false);
    });
  });

  describe('FastAPI validation errors', () => {
    // FastAPI uses 422 for request validation, not 400.
    const detail = [
      {
        type: 'string_too_short',
        loc: ['body', 'name'],
        msg: 'String should have at least 2 characters',
      },
      { type: 'missing', loc: ['body', 'phone'], msg: 'Field required' },
      { type: 'int_parsing', loc: ['query', 'page'], msg: 'Input should be a valid integer' },
    ];

    it('classifies 422 as validation', () => {
      expect(toApiError(axiosError(422, { detail })).kind).toBe('validation');
    });

    it('does not classify 400 as validation', () => {
      expect(toApiError(axiosError(400, { detail: 'Bad request' })).kind).not.toBe('validation');
    });

    it('parses detail entries into per-field messages', () => {
      expect(getFieldErrors(axiosError(422, { detail }))).toEqual({
        name: 'String should have at least 2 characters',
        phone: 'Field required',
        page: 'Input should be a valid integer',
      });
    });

    it('joins nested locations with dots so forms can address them', () => {
      const fields = getFieldErrors(
        axiosError(422, {
          detail: [{ loc: ['body', 'shifts', 0, 'start_time'], msg: 'Invalid time' }],
        }),
      );
      expect(fields).toEqual({ 'shifts.0.start_time': 'Invalid time' });
    });

    it('keeps the first message when a field fails twice', () => {
      const fields = getFieldErrors(
        axiosError(422, {
          detail: [
            { loc: ['body', 'email'], msg: 'Field required' },
            { loc: ['body', 'email'], msg: 'Value error' },
          ],
        }),
      );
      expect(fields).toEqual({ email: 'Field required' });
    });

    it('falls back to the detail string when 422 detail is not an array', () => {
      const e = toApiError(axiosError(422, { detail: 'unprocessable' }));
      expect(e.fieldErrors).toBeNull();
      expect(e.message).toBe('unprocessable');
    });

    it('returns null field errors for non-422 responses', () => {
      expect(getFieldErrors(axiosError(500, {}))).toBeNull();
    });
  });

  describe('messages', () => {
    it("prefers the server's own detail string", () => {
      // The backend writes these deliberately and they are actionable.
      const e = toApiError(
        axiosError(400, { detail: 'After-photo is required to resolve a high-priority issue.' }),
      );
      expect(e.message).toBe('After-photo is required to resolve a high-priority issue.');
    });

    it('falls back to generic copy when the server sent none', () => {
      expect(toApiError(axiosError(500, {})).message).toMatch(/server ran into a problem/i);
    });

    it('captures X-Request-ID for cross-referencing backend logs', () => {
      const e = toApiError(axiosError(500, {}, { 'x-request-id': 'admin-abc-1' }));
      expect(e.requestId).toBe('admin-abc-1');
    });
  });

  describe('retryability', () => {
    it.each([429, 500, 502, 503, 504])('marks %i retryable', (status) => {
      expect(toApiError(axiosError(status, {})).retryable).toBe(true);
    });

    it.each([400, 401, 403, 404, 409, 422])('does not retry %i', (status) => {
      expect(toApiError(axiosError(status, {})).retryable).toBe(false);
    });
  });

  it('is idempotent — normalizing an ApiError returns it unchanged', () => {
    const first = toApiError(axiosError(404, { detail: 'gone' }));
    expect(toApiError(first)).toBe(first);
  });
});

describe('getErrorMessage', () => {
  it('keeps the (err, fallback) signature the pages rely on', () => {
    expect(getErrorMessage(axiosError(404, { detail: 'Issue not found' }), 'nope')).toBe(
      'Issue not found',
    );
  });

  it('does not let a fallback override a specific server message', () => {
    expect(getErrorMessage(axiosError(409, { detail: 'Ward already exists' }), 'Failed')).toBe(
      'Ward already exists',
    );
  });

  it('handles null without throwing', () => {
    expect(typeof getErrorMessage(null, 'Something went wrong.')).toBe('string');
  });

  it('reads the message straight off an ApiError', () => {
    expect(getErrorMessage(new ApiError({ kind: 'network', message: 'Offline' }))).toBe('Offline');
  });
});

describe('permissions', () => {
  const superAdmin = { role: 'admin' };
  const districtAdmin = { role: 'district_admin' };
  const talukaAdmin = { role: 'taluka_admin' };
  const wardAdmin = { role: 'ward_admin' };
  const citizen = { role: 'citizen' };

  describe('isAdminUser', () => {
    it.each([superAdmin, districtAdmin, talukaAdmin, wardAdmin])('admits %o', (u) => {
      expect(isAdminUser(u)).toBe(true);
    });

    it.each([citizen, { role: 'worker' }, null, undefined, {}])('rejects %o', (u) => {
      expect(isAdminUser(u)).toBe(false);
    });

    it('is an allowlist, not a substring test', () => {
      // The old check was `role?.includes('admin')`, which passed anything with
      // "admin" anywhere in the name.
      expect(isAdminUser({ role: 'admin_assistant' })).toBe(false);
      expect(isAdminUser({ role: 'not_an_admin' })).toBe(false);
    });
  });

  it('isSuperAdmin is exact', () => {
    expect(isSuperAdmin(superAdmin)).toBe(true);
    expect(isSuperAdmin(districtAdmin)).toBe(false);
  });

  it('hasAtLeastRole compares down the hierarchy', () => {
    expect(hasAtLeastRole('admin', 'ward_admin')).toBe(true);
    expect(hasAtLeastRole('district_admin', 'taluka_admin')).toBe(true);
    expect(hasAtLeastRole('ward_admin', 'district_admin')).toBe(false);
    expect(hasAtLeastRole('citizen', 'ward_admin')).toBe(false);
  });

  describe('canCall — driven by the generated route manifest', () => {
    it('permits any admin tier on a require_any_admin route', () => {
      expect(canCall(wardAdmin, 'GET /admin/issues')).toBe(true);
      expect(canCall(superAdmin, 'GET /admin/issues')).toBe(true);
    });

    it('restricts sub-admin management to the tiers the backend allows', () => {
      expect(canCall(superAdmin, 'POST /admin/admins')).toBe(true);
      expect(canCall(talukaAdmin, 'POST /admin/admins')).toBe(true);
      expect(canCall(wardAdmin, 'POST /admin/admins')).toBe(false);
    });

    it('restricts overrides to the super admin', () => {
      expect(canCall(superAdmin, 'POST /admin/overrides/grant')).toBe(true);
      expect(canCall(districtAdmin, 'POST /admin/overrides/grant')).toBe(false);
    });

    it('allows public routes to anyone', () => {
      expect(canCall(null, 'GET /public/leaderboard')).toBe(true);
    });

    it('defers to the server for endpoints it does not know', () => {
      // Failing closed would break the app whenever a route is added ahead of a
      // manifest regeneration.
      expect(canCall(wardAdmin, 'GET /admin/not-generated-yet')).toBe(true);
    });
  });

  describe('capabilities', () => {
    it('map to the endpoint that enforces them', () => {
      expect(can(superAdmin, 'grantOverride')).toBe(true);
      expect(can(wardAdmin, 'grantOverride')).toBe(false);
      expect(can(wardAdmin, 'manageIssues')).toBe(true);
    });

    it('deny unknown capabilities', () => {
      expect(can(superAdmin, 'summonDragons')).toBe(false);
    });
  });

  describe('canVisit', () => {
    it('lets any admin onto unrestricted pages', () => {
      expect(canVisit(wardAdmin, '/dashboard')).toBe(true);
      expect(canVisit(wardAdmin, '/dashboard/issues')).toBe(true);
    });

    it('keeps a ward admin off super-admin pages', () => {
      // Typing the URL used to render the page anyway; every request on it then
      // 403'd, which the old interceptor read as a dead session.
      expect(canVisit(wardAdmin, '/dashboard/admin-overrides')).toBe(false);
      expect(canVisit(superAdmin, '/dashboard/admin-overrides')).toBe(true);
    });

    it('applies a prefix rule to nested routes', () => {
      expect(canVisit(wardAdmin, '/dashboard/locations/districts')).toBe(false);
      expect(canVisit(districtAdmin, '/dashboard/locations/districts')).toBe(true);
    });

    it('refuses non-admins outright', () => {
      expect(canVisit(citizen, '/dashboard')).toBe(false);
      expect(canVisit(null, '/dashboard')).toBe(false);
    });
  });
});
