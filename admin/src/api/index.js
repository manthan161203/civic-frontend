/**
 * The admin app's API surface. This is the only module pages should import.
 *
 * Every method is typed against `@civic/api-types`, which is generated from the
 * backend's own OpenAPI document — so a schema change on the server shows up
 * here as a type error rather than as `undefined` at runtime.
 *
 * Methods resolve to `{ data }` to match what every existing page destructures.
 * New code can import the verb helpers from `./http` directly and get the body
 * without the wrapper:
 *
 *   import { get } from '@/api/http';
 *   const stats = await get('/admin/dashboard');   // DashboardStats
 *
 * Failures reject with an `ApiError` (see `./errors`), never a raw axios error.
 *
 * ── Request cancellation ─────────────────────────────────────────────────────
 *
 * List methods take a trailing `config` that is spread into the axios call, so
 * TanStack Query's `signal` can be forwarded:
 *
 *   queryFn: ({ signal }) => adminApi.getIssues(params, { signal })
 *
 * Without it, Query cannot abort an in-flight request when a component
 * unmounts or a query key changes — a user typing in the search box leaves a
 * trail of requests whose responses race, and the last one to *arrive* wins
 * regardless of which query it answered.
 *
 * The methods the migrated screens use take it today; the rest gain it as their
 * screen converts, so this stays a reviewable change rather than one 583-line
 * mechanical diff touching every call site at once.
 *
 * @see ./http.js         transport, auth, retry
 * @see ./errors.js       error normalization
 * @see ./permissions.js  role checks
 */

import { get, post, put, patch, del, http } from './http';

/**
 * @typedef {import('@civic/api-types').DashboardStats} DashboardStats
 * @typedef {import('@civic/api-types').IssueResponse} IssueResponse
 * @typedef {import('@civic/api-types').IssueListResponse} IssueListResponse
 * @typedef {import('@civic/api-types').UserResponse} UserResponse
 * @typedef {import('@civic/api-types').TokenResponse} TokenResponse
 * @typedef {import('@civic/api-types').SendOTPResponse} SendOTPResponse
 * @typedef {import('@civic/api-types').UpdateProfileRequest} UpdateProfileRequest
 * @typedef {import('@civic/api-types').CreateWorker} CreateWorker
 * @typedef {import('@civic/api-types').UpdateWorker} UpdateWorker
 * @typedef {import('@civic/api-types').WorkerInvitationResult} WorkerInvitationResult
 * @typedef {import('@civic/api-types').CreateSubAdminRequest} CreateSubAdminRequest
 * @typedef {import('@civic/api-types').UpdateSubAdmin} UpdateSubAdmin
 * @typedef {import('@civic/api-types').CreateAnnouncementRequest} CreateAnnouncementRequest
 * @typedef {import('@civic/api-types').CreateGeofenceRequest} CreateGeofenceRequest
 * @typedef {import('@civic/api-types').UpdateGeofenceRequest} UpdateGeofenceRequest
 * @typedef {import('@civic/api-types').GeofenceResponse} GeofenceResponse
 * @typedef {import('@civic/api-types').GeofenceListResponse} GeofenceListResponse
 * @typedef {import('@civic/api-types').AssignWorker} AssignWorker
 * @typedef {import('@civic/api-types').BulkIssueRequest} BulkIssueRequest
 * @typedef {import('@civic/api-types').SendMessageRequest} SendMessageRequest
 * @typedef {import('@civic/api-types').GrantOverrideRequest} GrantOverrideRequest
 * @typedef {import('@civic/api-types').DisputeResolve} DisputeResolve
 * @typedef {import('@civic/api-types').DisputeResponse} DisputeResponse
 * @typedef {import('@civic/api-types').ComplaintResolve} ComplaintResolve
 * @typedef {import('@civic/api-types').ComplaintResponse} ComplaintResponse
 * @typedef {import('@civic/api-types').CustomIssueTypeResponse} CustomIssueTypeResponse
 */

/**
 * Keep the `{ data }` envelope every page already destructures.
 * @template T
 * @param {Promise<T>} promise
 * @returns {Promise<{ data: T }>}
 */
const wrap = (promise) => promise.then((data) => ({ data }));

/* ══ Auth ═══════════════════════════════════════════════════════════════════ */

export const authApi = {
  /**
   * Start OTP sign-in. Named `login` for historical reasons — it sends a code,
   * it does not authenticate.
   * @param {string} phone E.164, e.g. `+919876543210`
   * @returns {Promise<{ data: SendOTPResponse }>}
   */
  login: (phone) => wrap(post('/auth/send-otp', { phone })),

  /**
   * @param {string} phone
   * @param {string} code
   * @returns {Promise<{ data: TokenResponse }>}
   */
  verifyOtp: (phone, code) => wrap(post('/auth/verify-otp', { phone, code })),

  /** @returns {Promise<{ data: UserResponse }>} */
  getMe: () => wrap(get('/auth/me')),

  /** @param {string} refresh_token */
  logout: (refresh_token) => wrap(post('/auth/logout', { refresh_token })),

  /**
   * Note: `ward_id` is citizen-only and 403s for every admin role, and
   * `taluka_id` / `district_id` are no longer accepted at all. Admin
   * jurisdiction is assigned exclusively through `POST`/`PUT /admin/admins`.
   * @param {UpdateProfileRequest} data
   * @returns {Promise<{ data: UserResponse }>}
   */
  updateProfile: (data) => wrap(put('/auth/profile', data)),

  /** @param {string} new_phone */
  sendChangePhoneOtp: (new_phone) => wrap(post('/auth/phone/change/send-otp', { new_phone })),

  /**
   * @param {string} new_phone
   * @param {string} code
   * @returns {Promise<{ data: UserResponse }>}
   */
  verifyChangePhone: (new_phone, code) =>
    wrap(post('/auth/phone/change/verify', { new_phone, code })),

  /**
   * @param {string} current_password
   * @param {string} new_password
   * @param {string} confirm_password
   */
  changePassword: (current_password, new_password, confirm_password) =>
    wrap(post('/auth/change-password', { current_password, new_password, confirm_password })),
};

/* ══ Admin ══════════════════════════════════════════════════════════════════ */

export const adminApi = {
  /* ── Dashboard & analytics ───────────────────────────────────────────── */

  /** @returns {Promise<{ data: DashboardStats }>} */
  getDashboard: () => wrap(get('/admin/dashboard')),

  /**
   * Period analytics. Returns `period_days`, `total_in_period`, `daily_counts`,
   * `by_type`, `by_status`, `by_priority`, `top_wards` — NOT the `total_issues`
   * / `resolved_issues` shape of `getDashboard`. Mixing them up is why the
   * analytics PDF used to export zeroes.
   * @param {{ days?: number }} [params]
   */
  getAnalytics: (params) => wrap(get('/admin/analytics', { params })),

  /** @param {{ issue_type?: string }} [params] */
  getHeatmap: (params) => wrap(get('/admin/heatmap', { params })),

  /** @param {{ start_date: string, end_date: string, interval_days?: number, issue_type?: string }} params */
  getHeatmapTimeMachine: (params) => wrap(get('/admin/heatmap/timemachine', { params })),

  /** @returns {Promise<{ data: Array<Record<string, unknown>> }>} */
  getActiveSOS: () => wrap(get('/admin/sos/active')),

  /** @returns {Promise<{ data: Record<string, unknown> }>} */
  getMyScope: () => wrap(get('/admin/me/scope')),

  /* ── Issues ──────────────────────────────────────────────────────────── */

  /**
   * Paginated, scoped to the caller's jurisdiction.
   *
   * Takes `page`/`size` — `size` is capped at 200 server-side. Passing
   * `limit`/`skip` silently yields page 1 at the default size of 20, which is
   * how the AI insights screen ended up computing "totals" from 20 rows.
   *
   * @param {{ page?: number, size?: number, status?: string, issue_type?: string,
   *           ward?: string, severity?: string, priority?: string, department?: string }} [params]
   * @returns {Promise<{ data: IssueListResponse }>}
   */
  getIssues: (params, config) => wrap(get('/admin/issues', { params, ...config })),

  /** @param {string} id */
  deleteIssue: (id) => wrap(del(`/admin/issues/${id}`)),

  /**
   * @param {string} id
   * @param {string} worker_id
   * @returns {Promise<{ data: IssueResponse }>}
   */
  assignIssue: (id, worker_id) =>
    wrap(post(`/admin/issues/${id}/assign`, /** @type {AssignWorker} */ ({ worker_id }))),

  /**
   * @param {string} id
   * @param {string} worker_id
   * @returns {Promise<{ data: IssueResponse }>}
   */
  reassignIssue: (id, worker_id) =>
    wrap(post(`/admin/issues/${id}/reassign`, /** @type {AssignWorker} */ ({ worker_id }))),

  /**
   * @param {string} id
   * @returns {Promise<{ data: IssueResponse }>}
   */
  escalateIssue: (id) => wrap(post(`/admin/issues/${id}/escalate`)),

  /**
   * @param {string[]} issue_ids
   * @param {BulkIssueRequest['action']} action
   * @param {{ worker_id?: string, priority?: string }} [payload]
   */
  bulkAction: (issue_ids, action, payload) =>
    wrap(post('/admin/issues/bulk', { issue_ids, action, ...payload })),

  /** @param {{ status?: string, issue_type?: string, ward?: string, days?: number }} [params] */
  exportIssues: (params) =>
    http.get('/admin/issues/export', { params, responseType: 'blob' }),

  /** @param {number} [limit] */
  autoAssignOpen: (limit = 50) =>
    wrap(post('/admin/issues/auto-assign-open', null, { params: { limit } })),

  /* ── Blocked tasks ───────────────────────────────────────────────────── */

  /**
   * Note this one takes `limit`/`offset`, not `page`/`size` — the backend is
   * inconsistent between routers here.
   * @param {{ limit?: number, offset?: number, sort?: string }} [params]
   * @returns {Promise<{ data: IssueListResponse }>}
   */
  getBlockedTasks: (params, config) => wrap(get('/admin/blocked-tasks', { params, ...config })),

  /**
   * @param {string} id
   * @param {string} admin_notes required by the backend
   * @returns {Promise<{ data: IssueResponse }>}
   */
  unblockTask: (id, admin_notes) =>
    wrap(post(`/admin/issues/${id}/unblock`, null, { params: { admin_notes } })),

  /**
   * @param {string} id
   * @param {string} message
   * @param {string} [resources_provided]
   * @param {boolean} [can_proceed]
   * @returns {Promise<{ data: IssueResponse }>}
   */
  respondToBlock: (id, message, resources_provided = '', can_proceed = false) =>
    wrap(
      post(`/admin/issues/${id}/respond-to-block`, null, {
        params: { message, resources_provided, can_proceed },
      }),
    ),

  /**
   * @param {string[]} issue_ids
   * @param {string} admin_notes
   */
  bulkUnblockTasks: (issue_ids, admin_notes) =>
    wrap(
      post('/admin/blocked-tasks/bulk-unblock', null, {
        params: { issue_ids: issue_ids.join(','), admin_notes },
      }),
    ),

  /* ── Workers ─────────────────────────────────────────────────────────── */

  /**
   * @param {{ page?: number, size?: number, is_online?: boolean, is_active?: boolean,
   *           ward?: string, department?: string, search?: string }} [params]
   */
  getWorkers: (params, config) => wrap(get('/admin/workers', { params, ...config })),

  /** @param {string} id */
  getWorker: (id) => wrap(get(`/admin/workers/${id}`)),

  /**
   * @param {CreateWorker} data
   * @returns {Promise<{ data: WorkerInvitationResult }>}
   */
  createWorker: (data) => wrap(post('/admin/workers', data)),

  /**
   * @param {string} id
   * @param {UpdateWorker} data
   * @returns {Promise<{ data: UserResponse }>}
   */
  updateWorker: (id, data) => wrap(put(`/admin/workers/${id}`, data)),

  /** @param {string} id @returns {Promise<{ data: UserResponse }>} */
  deactivateWorker: (id) => wrap(post(`/admin/workers/${id}/deactivate`)),

  /** @param {string} id @returns {Promise<{ data: UserResponse }>} */
  reactivateWorker: (id) => wrap(post(`/admin/workers/${id}/reactivate`)),

  /**
   * Re-send a lapsed worker invitation. The backend has supported this all
   * along; nothing in the UI called it.
   * @param {string} id
   * @returns {Promise<{ data: WorkerInvitationResult }>}
   */
  resendWorkerInvitation: (id) => wrap(post(`/admin/workers/${id}/resend-invitation`)),

  /** @param {{ online_only?: boolean }} [params] */
  getWorkerLocations: (params, config) =>
    wrap(get('/admin/workers/locations', { params, ...config })),

  /** @param {string} id */
  getWorkerLocation: (id) => wrap(get(`/admin/workers/${id}/location`)),

  /**
   * Scoped worker leaderboard.
   *
   * `limit` is the only parameter the backend accepts — there is no period
   * filter, so weekly/monthly/all-time cannot be answered server-side today.
   * @param {number} [limit]
   */
  getWorkerLeaderboard: (limit = 50, config) =>
    // `limit` is capped at 50 server-side (422 above that).
    wrap(get('/admin/workers/leaderboard', { params: { limit: Math.min(limit, 50) }, ...config })),

  /** @param {string} id @param {number} [days] */
  getWorkerReport: (id, days = 30, config) =>
    wrap(get(`/admin/workers/${id}/report`, { params: { days }, ...config })),

  /** @param {string} workerId */
  getWorkerComplaintSummary: (workerId) => wrap(get(`/admin/workers/${workerId}/complaints`)),

  /* ── Citizens ────────────────────────────────────────────────────────── */

  /** @param {{ page?: number, size?: number, search?: string, ward?: string }} [params] */
  getCitizens: (params, config) => wrap(get('/admin/citizens', { params, ...config })),

  /** @param {string} id */
  getCitizen: (id) => wrap(get(`/admin/citizens/${id}`)),

  /** @param {string} id */
  deactivateCitizen: (id) => wrap(post(`/admin/citizens/${id}/deactivate`)),

  /** @param {string} id */
  reactivateCitizen: (id) => wrap(post(`/admin/citizens/${id}/reactivate`)),

  /** @param {string} search */
  searchCitizens: (search) => wrap(get('/admin/citizens', { params: { search, size: 10, page: 1 } })),

  /** @param {string} search */
  searchWorkers: (search) => wrap(get('/admin/workers', { params: { search, size: 10, page: 1 } })),

  /* ── Sub-admins ──────────────────────────────────────────────────────── */

  /** @param {{ role?: string, page?: number, size?: number }} [params] */
  getAdmins: (params, config) => wrap(get('/admin/admins', { params, ...config })),

  /**
   * @param {CreateSubAdminRequest} data
   * @returns {Promise<{ data: UserResponse }>}
   */
  createAdmin: (data) => wrap(post('/admin/admins', data)),

  /**
   * @param {string} id
   * @param {UpdateSubAdmin} data
   * @returns {Promise<{ data: UserResponse }>}
   */
  updateAdmin: (id, data) => wrap(put(`/admin/admins/${id}`, data)),

  /**
   * @param {string} user_id
   * @param {string} role
   * @returns {Promise<{ data: UserResponse }>}
   */
  changeUserRole: (user_id, role) =>
    wrap(patch(`/admin/users/${user_id}/role`, null, { params: { role } })),

  /**
   * Super-admin only. Not previously reachable from the UI.
   * @param {string} user_id
   */
  deleteUser: (user_id) => wrap(del(`/admin/users/${user_id}`)),

  /* ── Flags ───────────────────────────────────────────────────────────── */

  /** @param {{ status?: string, page?: number, size?: number }} [params] */
  getFlags: (params) => wrap(get('/admin/flags', { params })),

  /** @param {string} id @param {string} status */
  resolveFlag: (id, status) => wrap(patch(`/admin/flags/${id}`, null, { params: { status } })),

  /* ── Announcements ───────────────────────────────────────────────────── */

  /** @param {{ page?: number, size?: number, active_only?: boolean }} [params] */
  getAnnouncements: (params) => wrap(get('/admin/announcements', { params })),

  /** @param {CreateAnnouncementRequest} data */
  createAnnouncement: (data) => wrap(post('/admin/announcements', data)),

  /** @param {string} id */
  deleteAnnouncement: (id) => wrap(del(`/admin/announcements/${id}`)),

  /**
   * Edit an announcement's text, expiry or map pin.
   *
   * `PATCH /admin/announcements/{id}` now exists. It did not for a long time —
   * the console shipped a complete Edit modal wired to a toast explaining the
   * backend could not do it, and delete-and-recreate was the only option, which
   * minted a new id and re-pushed to every recipient.
   *
   * **Editing never re-notifies.** The server leaves `push_dispatched_at`
   * untouched, so an edit does not reach anyone who already received the
   * original — the response carries that field so the UI can say so.
   * `scope` is not editable: re-scoping a delivered announcement is a new post.
   *
   * @param {string} id
   * @param {{ title?: string, body?: string, expires_at?: string|null,
   *           location_lat?: number|null, location_lng?: number|null }} data
   */
  updateAnnouncement: (id, data) => wrap(patch(`/admin/announcements/${id}`, data)),

  /* ── Insights ────────────────────────────────────────────────────────── */

  /**
   * Aggregate insights for the caller's jurisdiction, computed in SQL.
   *
   * This replaces what the AI-insights screen used to do in the browser: page
   * `/admin/issues` 200 rows at a time up to a 2,000-row ceiling, aggregate
   * client-side, and render an amber banner conceding the figures were "a
   * sample, not a total".
   *
   * `narrative` is best-effort — null when no provider is configured or the
   * call fails, with every number still present.
   *
   * @param {{ days?: number, narrative?: boolean }} [params]
   */
  getInsights: (params, config) => wrap(get('/admin/insights', { params, ...config })),

  /* ── Squads ──────────────────────────────────────────────────────────── */

  /** @param {{ issue_id: string, lead_worker_id: string, assistant_ids?: string, notes?: string }} params */
  createSquad: (params) => wrap(post('/admin/squads', null, { params })),

  /** @param {string} issueId */
  getSquad: (issueId) => wrap(get(`/admin/squads/${issueId}`)),

  /* ── SLA ─────────────────────────────────────────────────────────────── */

  getSLADashboard: () => wrap(get('/issues/sla/dashboard')),

  /** @param {string} id */
  getSLAIssueDetail: (id) => wrap(get(`/issues/sla/${id}`)),

  /* ── Notifications ───────────────────────────────────────────────────── */

  /**
   * Geofenced push. All parameters go in the query string, not a body.
   * @param {number} latitude
   * @param {number} longitude
   * @param {number} radius_km
   * @param {string} title
   * @param {string} body
   */
  sendGeofenceNotification: (latitude, longitude, radius_km, title, body) =>
    wrap(
      post('/admin/notifications/geofence', null, {
        params: { latitude, longitude, radius_km, title, body },
      }),
    ),

  /* ── Disputes ────────────────────────────────────────────────────────── */

  /** @param {{ status?: string, page?: number, size?: number }} [params] */
  getDisputes: (params) => wrap(get('/admin/disputes', { params })),

  /**
   * @param {string} id
   * @param {DisputeResolve['outcome']} outcome
   * @param {string} admin_notes
   * @returns {Promise<{ data: DisputeResponse }>}
   */
  resolveDispute: (id, outcome, admin_notes) =>
    wrap(post(`/admin/disputes/${id}/resolve`, { outcome, admin_notes })),

  /* ── Worker complaints ───────────────────────────────────────────────── */

  /** @param {{ status?: string, worker_id?: string, page?: number, size?: number }} [params]
   *  @returns {Promise<{ data: ComplaintResponse[] }>} */
  getComplaints: (params) => wrap(get('/admin/complaints', { params })),

  /**
   * @param {string} id
   * @param {string} status
   * @param {string} admin_notes
   * @returns {Promise<{ data: ComplaintResponse }>}
   */
  resolveComplaint: (id, status, admin_notes) =>
    wrap(post(`/admin/complaints/${id}/resolve`, { status, admin_notes })),

  /* ── Surveys ─────────────────────────────────────────────────────────── */

  /** @param {number} [days] @param {object} [config] */
  getSurveyStats: (days = 30, config) =>
    wrap(get('/admin/surveys/stats', { params: { days }, ...config })),

  /* ── Custom issue types ──────────────────────────────────────────────── */

  /** @param {{ status?: string, approved_only?: boolean }} [params]
   *  @returns {Promise<{ data: CustomIssueTypeResponse[] }>} */
  getCustomIssueTypes: (params) => wrap(get('/admin/custom-issue-types', { params })),

  /** @param {string} id @returns {Promise<{ data: CustomIssueTypeResponse }>} */
  approveCustomIssueType: (id) => wrap(post(`/admin/custom-issue-types/${id}/approve`)),

  /* ── Geofences ───────────────────────────────────────────────────────── */

  /** @param {number} [page] @param {number} [size]
   *  @returns {Promise<{ data: GeofenceListResponse }>} */
  getGeofences: (page = 1, size = 20) => wrap(get('/admin/geofences', { params: { page, size } })),

  /** @param {CreateGeofenceRequest} data @returns {Promise<{ data: GeofenceResponse }>} */
  createGeofence: (data) => wrap(post('/admin/geofences', data)),

  /** @param {string} id @param {UpdateGeofenceRequest} data
   *  @returns {Promise<{ data: GeofenceResponse }>} */
  updateGeofence: (id, data) => wrap(patch(`/admin/geofences/${id}`, data)),

  /** @param {string} id */
  deleteGeofence: (id) => wrap(del(`/admin/geofences/${id}`)),

  /* ── Admin overrides (super-admin only) ──────────────────────────────── */

  /** @param {GrantOverrideRequest} data */
  grantOverride: (data) => wrap(post('/admin/overrides/grant', data)),

  /** @param {number} [page] @param {number} [size] @param {object} [config] */
  getActiveOverrides: (page = 1, size = 20, config) =>
    wrap(get('/admin/overrides/active', { params: { page, size }, ...config })),

  /** @param {string} override_id */
  revokeOverride: (override_id) => wrap(post(`/admin/overrides/${override_id}/revoke`)),

  /** @param {number} [page] @param {number} [size] @param {object} [config] */
  getOverrideAuditLog: (page = 1, size = 50, config) =>
    wrap(get('/admin/overrides/audit-log', { params: { page, size }, ...config })),

  /* ── Admin messaging ─────────────────────────────────────────────────── */

  /** @param {SendMessageRequest} data */
  sendMessage: (data) => wrap(post('/admin/messages', data)),

  /** @param {boolean} [unread_only] @param {number} [page] @param {number} [size] */
  getInbox: (unread_only = false, page = 1, size = 20) =>
    wrap(get('/admin/messages/inbox', { params: { unread_only, page, size } })),

  /** @param {number} [page] @param {number} [size] */
  getSentMessages: (page = 1, size = 20) =>
    wrap(get('/admin/messages/sent', { params: { page, size } })),

  /** @param {string} message_id */
  getMessage: (message_id) => wrap(get(`/admin/messages/${message_id}`)),

  getUnreadCount: () => wrap(get('/admin/messages/unread/count')),
};

/* ══ Public (no auth) ═══════════════════════════════════════════════════════ */

export const publicApi = {
  /** @param {{ limit?: number, days?: number }} [params] */
  getLeaderboard: (params) => wrap(get('/public/leaderboard', { params })),
};

/* ══ Locations ══════════════════════════════════════════════════════════════ */

/** Strip null/undefined so optional query params are omitted, not sent empty. */
const defined = (obj) =>
  Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== null && v !== undefined && v !== ''));

export const locationsApi = {
  getTree: (config) => wrap(get('/locations/tree', config)),
  getDistricts: (config) => wrap(get('/locations/districts', config)),

  /**
   * @param {string} q
   * @param {'all'|'district'|'taluka'|'ward'} [type]
   * @param {string | null} [district_id]
   * @param {string | null} [taluka_id]
   */
  suggest: (q, type = 'all', district_id = null, taluka_id = null) =>
    wrap(get('/locations/suggest', { params: defined({ q, type, district_id, taluka_id, limit: 8 }) })),

  /** @param {string} name */
  createDistrict: (name, centroid_lat = null, centroid_lon = null) =>
    wrap(post('/locations/districts', null, { params: defined({ name, centroid_lat, centroid_lon }) })),

  updateDistrict: (id, name, state_name, centroid_lat = null, centroid_lon = null) =>
    wrap(
      patch(`/locations/districts/${id}`, null, {
        params: defined({ name, state_name, centroid_lat, centroid_lon }),
      }),
    ),

  /** @param {string} id */
  deleteDistrict: (id) => wrap(del(`/locations/districts/${id}`)),

  /** @param {string} district_id */
  getTalukas: (district_id, config) => wrap(get(`/locations/districts/${district_id}/talukas`, config)),

  createTaluka: (district_id, name, centroid_lat = null, centroid_lon = null) =>
    wrap(
      post(`/locations/districts/${district_id}/talukas`, null, {
        params: defined({ name, centroid_lat, centroid_lon }),
      }),
    ),

  updateTaluka: (id, name, centroid_lat = null, centroid_lon = null) =>
    wrap(patch(`/locations/talukas/${id}`, null, { params: defined({ name, centroid_lat, centroid_lon }) })),

  /** @param {string} id */
  deleteTaluka: (id) => wrap(del(`/locations/talukas/${id}`)),

  /** @param {string} taluka_id */
  getWards: (taluka_id, config) => wrap(get(`/locations/talukas/${taluka_id}/wards`, config)),

  createWard: (taluka_id, name, ward_number, centroid_lat = null, centroid_lon = null) =>
    wrap(
      post(`/locations/talukas/${taluka_id}/wards`, null, {
        params: defined({ name, ward_number, centroid_lat, centroid_lon }),
      }),
    ),

  updateWard: (id, name, ward_number, centroid_lat = null, centroid_lon = null) =>
    wrap(patch(`/locations/wards/${id}`, null, { params: defined({ name, ward_number, centroid_lat, centroid_lon }) })),

  /** @param {string} id */
  deleteWard: (id) => wrap(del(`/locations/wards/${id}`)),
};

/* ══ Re-exports so pages need only one import ═══════════════════════════════ */

export { ApiError, getErrorMessage, getFieldErrors, toApiError } from './errors';
export { can, canCall, canVisit, isAdminUser, isSuperAdmin, hasAtLeastRole, ROLE_LABELS, ALLOWED_ADMIN_ROLES } from './permissions';
export { tokens, onSessionEnded, BASE_URL } from './http';
