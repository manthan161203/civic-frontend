/**
 * Live integration test for the refresh interceptor.
 *
 * @jest-environment jsdom
 *
 * OPT-IN. Run it with:
 *
 *   npm run test:live
 *
 * which provisions a fresh token pair and then invokes jest with
 * RUN_LIVE_API_TESTS=1. Without that variable the suite skips, so the default
 * `npm test` stays deterministic and works with no backend running.
 *
 * It has to be opt-in because the backend ROTATES refresh tokens on use: each
 * one is single-use, so a token file written by a previous run is already spent
 * and the test would fail for a reason that has nothing to do with the code.
 *
 * This is the test the old client could not have passed: its refresh branch sat
 * below an `if (isAuthError(error)) return` that caught 401 first, so the branch
 * was unreachable and an expired access token was always a hard logout.
 *
 * The steps run as one sequence rather than separate `it` blocks because the
 * backend ROTATES refresh tokens — each one is single-use, so a fresh
 * `beforeEach` would be replaying a token the previous step already spent.
 */
const fs = require('fs');

const TOKEN_FILE = process.env.LIVE_API_TOKENS || '/tmp/civic-admin-tokens.json';

const TOKENS =
  process.env.RUN_LIVE_API_TESTS === '1' && fs.existsSync(TOKEN_FILE)
    ? JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf8'))
    : null;

(TOKENS ? describe : describe.skip)('token refresh (live backend)', () => {
  it('refreshes on 401, single-flights concurrent retries, and ignores 403', async () => {
    process.env.NEXT_PUBLIC_API_URL = 'http://localhost:8000';
    localStorage.clear();
    localStorage.setItem('access_token', 'deliberately.invalid.token');
    localStorage.setItem('refresh_token', TOKENS.r);

    const { get, tokens, onSessionEnded } = await import('@/api/http');

    let sessionEnded = false;
    onSessionEnded(() => {
      sessionEnded = true;
    });

    /* 1. A 401 is recovered by refreshing, not by ending the session. */
    const me = await get('/auth/me');
    expect(me.role).toBe('admin');
    expect(sessionEnded).toBe(false);
    expect(tokens.getAccess()).not.toBe('deliberately.invalid.token');

    /* 2. Concurrent 401s collapse into one refresh.
     *
     * With a per-request refresh, three simultaneous 401s would fire three
     * rotations; the second and third would present an already-rotated token
     * and fail. Reaching this assertion at all is the proof.
     */
    const refreshBefore = tokens.getRefresh();
    localStorage.setItem('access_token', 'expired.again.token');

    const results = await Promise.all([get('/auth/me'), get('/auth/me'), get('/auth/me')]);
    expect(results.every((r) => r.role === 'admin')).toBe(true);
    expect(tokens.getRefresh()).not.toBe(refreshBefore);
    expect(sessionEnded).toBe(false);

    /* 3. A 403 leaves the session alone.
     *
     * `PUT /auth/profile { ward_id }` is rejected for every non-citizen role —
     * it is the column admin authority derives from, so writing it would be
     * privilege escalation. A genuine 403 from a non-auth route, which is
     * exactly the case that used to log scoped admins out mid-session.
     */
    const { put } = await import('@/api/http');
    const forbidden = await put('/auth/profile', {
      ward_id: '00000000-0000-0000-0000-000000000000',
    }).catch((e) => e);

    expect(forbidden.kind).toBe('forbidden');
    expect(forbidden.status).toBe(403);
    expect(forbidden.isSessionEnded).toBe(false);
    expect(forbidden.retryable).toBe(false);
    expect(sessionEnded).toBe(false);
    expect(tokens.getAccess()).toBeTruthy();

    /* The session still works afterwards. */
    await expect(get('/auth/me')).resolves.toHaveProperty('role', 'admin');
  }, 30000);
});
