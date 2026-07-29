/**
 * Endpoint access manifest — GENERATED. Do not hand-edit.
 * Refresh with:
 *   python3 scripts/derive-endpoint-access.py ../../civic-backend
 *
 * `roles`    the roles the backend accepts. `null` means unauthenticated.
 *            Route-level only: several admin routes additionally narrow
 *            results by jurisdiction via `apply_admin_scope`, so a
 *            `ward_admin` who is listed here can still receive 403 or an
 *            empty page for anything outside their ward.
 * `surfaces` which app currently calls it. `[]` means neither — either a
 *            backend-only concern (health, setup) or an unwired feature.
 */

export const ADMIN_ROLES = ["admin", "district_admin", "taluka_admin", "ward_admin"];
export const ALL_ROLES = ["citizen", "worker", "admin", "district_admin", "taluka_admin", "ward_admin"];

export const ENDPOINT_ACCESS = {
  "GET /": {
    "roles": null,
    "surfaces": [],
    "router": "main"
  },
  "GET /admin/admins": {
    "roles": [
      "admin",
      "district_admin",
      "taluka_admin"
    ],
    "surfaces": [
      "admin"
    ],
    "router": "admin"
  },
  "POST /admin/admins": {
    "roles": [
      "admin",
      "district_admin",
      "taluka_admin"
    ],
    "surfaces": [
      "admin"
    ],
    "router": "admin"
  },
  "PUT /admin/admins/{admin_id}": {
    "roles": [
      "admin",
      "district_admin",
      "taluka_admin"
    ],
    "surfaces": [
      "admin"
    ],
    "router": "admin"
  },
  "GET /admin/analytics": {
    "roles": [
      "admin",
      "district_admin",
      "taluka_admin",
      "ward_admin"
    ],
    "surfaces": [
      "admin"
    ],
    "router": "admin"
  },
  "GET /admin/announcements": {
    "roles": [
      "admin",
      "district_admin",
      "taluka_admin",
      "ward_admin"
    ],
    "surfaces": [
      "admin"
    ],
    "router": "admin"
  },
  "POST /admin/announcements": {
    "roles": [
      "admin",
      "district_admin",
      "taluka_admin",
      "ward_admin"
    ],
    "surfaces": [
      "admin"
    ],
    "router": "admin"
  },
  "DELETE /admin/announcements/{announcement_id}": {
    "roles": [
      "admin",
      "district_admin",
      "taluka_admin",
      "ward_admin"
    ],
    "surfaces": [],
    "router": "admin"
  },
  "PATCH /admin/announcements/{announcement_id}": {
    "roles": [
      "admin",
      "district_admin",
      "taluka_admin",
      "ward_admin"
    ],
    "surfaces": [],
    "router": "admin"
  },
  "GET /admin/blocked-tasks": {
    "roles": [
      "admin",
      "district_admin",
      "taluka_admin",
      "ward_admin"
    ],
    "surfaces": [
      "admin"
    ],
    "router": "admin"
  },
  "POST /admin/blocked-tasks/bulk-unblock": {
    "roles": [
      "admin",
      "district_admin",
      "taluka_admin",
      "ward_admin"
    ],
    "surfaces": [
      "admin"
    ],
    "router": "admin"
  },
  "GET /admin/citizens": {
    "roles": [
      "admin",
      "district_admin",
      "taluka_admin",
      "ward_admin"
    ],
    "surfaces": [
      "admin"
    ],
    "router": "admin"
  },
  "GET /admin/citizens/{citizen_id}": {
    "roles": [
      "admin",
      "district_admin",
      "taluka_admin",
      "ward_admin"
    ],
    "surfaces": [
      "admin"
    ],
    "router": "admin"
  },
  "POST /admin/citizens/{citizen_id}/deactivate": {
    "roles": [
      "admin",
      "district_admin",
      "taluka_admin",
      "ward_admin"
    ],
    "surfaces": [
      "admin"
    ],
    "router": "admin"
  },
  "POST /admin/citizens/{citizen_id}/reactivate": {
    "roles": [
      "admin",
      "district_admin",
      "taluka_admin",
      "ward_admin"
    ],
    "surfaces": [
      "admin"
    ],
    "router": "admin"
  },
  "GET /admin/complaints": {
    "roles": [
      "admin",
      "district_admin",
      "taluka_admin",
      "ward_admin"
    ],
    "surfaces": [
      "admin"
    ],
    "router": "complaints"
  },
  "POST /admin/complaints/{complaint_id}/resolve": {
    "roles": [
      "admin",
      "district_admin",
      "taluka_admin",
      "ward_admin"
    ],
    "surfaces": [
      "admin"
    ],
    "router": "complaints"
  },
  "GET /admin/custom-issue-types": {
    "roles": [
      "admin",
      "district_admin",
      "taluka_admin",
      "ward_admin"
    ],
    "surfaces": [
      "admin"
    ],
    "router": "citizen_features"
  },
  "POST /admin/custom-issue-types/{type_id}/approve": {
    "roles": [
      "admin",
      "district_admin",
      "taluka_admin",
      "ward_admin"
    ],
    "surfaces": [
      "admin"
    ],
    "router": "citizen_features"
  },
  "GET /admin/dashboard": {
    "roles": [
      "admin",
      "district_admin",
      "taluka_admin",
      "ward_admin"
    ],
    "surfaces": [
      "admin"
    ],
    "router": "admin"
  },
  "GET /admin/disputes": {
    "roles": [
      "admin",
      "district_admin",
      "taluka_admin",
      "ward_admin"
    ],
    "surfaces": [
      "admin"
    ],
    "router": "citizen_features"
  },
  "POST /admin/disputes/{dispute_id}/resolve": {
    "roles": [
      "admin",
      "district_admin",
      "taluka_admin",
      "ward_admin"
    ],
    "surfaces": [
      "admin"
    ],
    "router": "citizen_features"
  },
  "GET /admin/flags": {
    "roles": [
      "admin",
      "district_admin",
      "taluka_admin",
      "ward_admin"
    ],
    "surfaces": [
      "admin"
    ],
    "router": "admin"
  },
  "PATCH /admin/flags/{flag_id}": {
    "roles": [
      "admin",
      "district_admin",
      "taluka_admin",
      "ward_admin"
    ],
    "surfaces": [
      "admin"
    ],
    "router": "admin"
  },
  "GET /admin/geofences": {
    "roles": [
      "admin",
      "district_admin",
      "taluka_admin",
      "ward_admin"
    ],
    "surfaces": [
      "admin"
    ],
    "router": "admin"
  },
  "POST /admin/geofences": {
    "roles": [
      "admin",
      "district_admin",
      "taluka_admin",
      "ward_admin"
    ],
    "surfaces": [
      "admin"
    ],
    "router": "admin"
  },
  "DELETE /admin/geofences/{geofence_id}": {
    "roles": [
      "admin",
      "district_admin",
      "taluka_admin",
      "ward_admin"
    ],
    "surfaces": [],
    "router": "admin"
  },
  "PATCH /admin/geofences/{geofence_id}": {
    "roles": [
      "admin",
      "district_admin",
      "taluka_admin",
      "ward_admin"
    ],
    "surfaces": [
      "admin"
    ],
    "router": "admin"
  },
  "GET /admin/geofences/{geofence_id}/alerts": {
    "roles": [
      "admin",
      "district_admin",
      "taluka_admin",
      "ward_admin"
    ],
    "surfaces": [],
    "router": "admin"
  },
  "GET /admin/geofences/{geofence_id}/workers": {
    "roles": [
      "admin",
      "district_admin",
      "taluka_admin",
      "ward_admin"
    ],
    "surfaces": [],
    "router": "admin"
  },
  "GET /admin/heatmap": {
    "roles": [
      "admin",
      "district_admin",
      "taluka_admin",
      "ward_admin"
    ],
    "surfaces": [
      "admin"
    ],
    "router": "admin"
  },
  "GET /admin/heatmap/timemachine": {
    "roles": [
      "admin",
      "district_admin",
      "taluka_admin",
      "ward_admin"
    ],
    "surfaces": [
      "admin"
    ],
    "router": "admin"
  },
  "GET /admin/insights": {
    "roles": [
      "admin",
      "district_admin",
      "taluka_admin",
      "ward_admin"
    ],
    "surfaces": [],
    "router": "admin"
  },
  "GET /admin/issues": {
    "roles": [
      "admin",
      "district_admin",
      "taluka_admin",
      "ward_admin"
    ],
    "surfaces": [
      "admin"
    ],
    "router": "admin"
  },
  "POST /admin/issues/auto-assign-open": {
    "roles": [
      "admin",
      "district_admin",
      "taluka_admin",
      "ward_admin"
    ],
    "surfaces": [
      "admin"
    ],
    "router": "admin"
  },
  "POST /admin/issues/bulk": {
    "roles": [
      "admin",
      "district_admin",
      "taluka_admin",
      "ward_admin"
    ],
    "surfaces": [
      "admin"
    ],
    "router": "admin"
  },
  "GET /admin/issues/export": {
    "roles": [
      "admin",
      "district_admin",
      "taluka_admin",
      "ward_admin"
    ],
    "surfaces": [
      "admin"
    ],
    "router": "admin"
  },
  "DELETE /admin/issues/{issue_id}": {
    "roles": [
      "admin",
      "district_admin",
      "taluka_admin",
      "ward_admin"
    ],
    "surfaces": [],
    "router": "admin"
  },
  "POST /admin/issues/{issue_id}/assign": {
    "roles": [
      "admin",
      "district_admin",
      "taluka_admin",
      "ward_admin"
    ],
    "surfaces": [
      "admin"
    ],
    "router": "admin"
  },
  "POST /admin/issues/{issue_id}/escalate": {
    "roles": [
      "admin",
      "district_admin",
      "taluka_admin",
      "ward_admin"
    ],
    "surfaces": [
      "admin"
    ],
    "router": "admin"
  },
  "POST /admin/issues/{issue_id}/reassign": {
    "roles": [
      "admin",
      "district_admin",
      "taluka_admin",
      "ward_admin"
    ],
    "surfaces": [
      "admin"
    ],
    "router": "admin"
  },
  "POST /admin/issues/{issue_id}/respond-to-block": {
    "roles": [
      "admin",
      "district_admin",
      "taluka_admin",
      "ward_admin"
    ],
    "surfaces": [
      "admin"
    ],
    "router": "admin"
  },
  "POST /admin/issues/{issue_id}/unblock": {
    "roles": [
      "admin",
      "district_admin",
      "taluka_admin",
      "ward_admin"
    ],
    "surfaces": [
      "admin"
    ],
    "router": "admin"
  },
  "GET /admin/me/scope": {
    "roles": [
      "admin",
      "district_admin",
      "taluka_admin",
      "ward_admin"
    ],
    "surfaces": [
      "admin"
    ],
    "router": "admin"
  },
  "POST /admin/messages": {
    "roles": [
      "admin",
      "district_admin",
      "taluka_admin",
      "ward_admin"
    ],
    "surfaces": [
      "admin"
    ],
    "router": "admin"
  },
  "GET /admin/messages/inbox": {
    "roles": [
      "admin",
      "district_admin",
      "taluka_admin",
      "ward_admin"
    ],
    "surfaces": [
      "admin"
    ],
    "router": "admin"
  },
  "GET /admin/messages/sent": {
    "roles": [
      "admin",
      "district_admin",
      "taluka_admin",
      "ward_admin"
    ],
    "surfaces": [
      "admin"
    ],
    "router": "admin"
  },
  "GET /admin/messages/unread/count": {
    "roles": [
      "admin",
      "district_admin",
      "taluka_admin",
      "ward_admin"
    ],
    "surfaces": [
      "admin"
    ],
    "router": "admin"
  },
  "GET /admin/messages/{message_id}": {
    "roles": [
      "admin",
      "district_admin",
      "taluka_admin",
      "ward_admin"
    ],
    "surfaces": [
      "admin"
    ],
    "router": "admin"
  },
  "POST /admin/notifications/geofence": {
    "roles": [
      "admin",
      "district_admin",
      "taluka_admin",
      "ward_admin"
    ],
    "surfaces": [
      "admin"
    ],
    "router": "admin"
  },
  "GET /admin/overrides/active": {
    "roles": [
      "admin"
    ],
    "surfaces": [
      "admin"
    ],
    "router": "admin"
  },
  "GET /admin/overrides/audit-log": {
    "roles": [
      "admin"
    ],
    "surfaces": [
      "admin"
    ],
    "router": "admin"
  },
  "POST /admin/overrides/grant": {
    "roles": [
      "admin"
    ],
    "surfaces": [
      "admin"
    ],
    "router": "admin"
  },
  "POST /admin/overrides/{override_id}/revoke": {
    "roles": [
      "admin"
    ],
    "surfaces": [
      "admin"
    ],
    "router": "admin"
  },
  "GET /admin/sos/active": {
    "roles": [
      "admin",
      "district_admin",
      "taluka_admin",
      "ward_admin"
    ],
    "surfaces": [
      "admin"
    ],
    "router": "admin"
  },
  "POST /admin/squads": {
    "roles": [
      "admin",
      "district_admin",
      "taluka_admin",
      "ward_admin"
    ],
    "surfaces": [
      "admin"
    ],
    "router": "admin"
  },
  "GET /admin/squads/{issue_id}": {
    "roles": [
      "admin",
      "district_admin",
      "taluka_admin",
      "ward_admin"
    ],
    "surfaces": [
      "admin"
    ],
    "router": "admin"
  },
  "GET /admin/surveys/stats": {
    "roles": [
      "admin",
      "district_admin",
      "taluka_admin",
      "ward_admin"
    ],
    "surfaces": [
      "admin"
    ],
    "router": "citizen_features"
  },
  "DELETE /admin/users/{user_id}": {
    "roles": [
      "admin",
      "district_admin",
      "taluka_admin",
      "ward_admin"
    ],
    "surfaces": [],
    "router": "admin"
  },
  "PATCH /admin/users/{user_id}/role": {
    "roles": [
      "admin"
    ],
    "surfaces": [
      "admin"
    ],
    "router": "admin"
  },
  "GET /admin/workers": {
    "roles": [
      "admin",
      "district_admin",
      "taluka_admin",
      "ward_admin"
    ],
    "surfaces": [
      "admin"
    ],
    "router": "admin"
  },
  "POST /admin/workers": {
    "roles": [
      "admin",
      "district_admin",
      "taluka_admin",
      "ward_admin"
    ],
    "surfaces": [
      "admin"
    ],
    "router": "admin"
  },
  "GET /admin/workers/leaderboard": {
    "roles": [
      "admin",
      "district_admin",
      "taluka_admin",
      "ward_admin"
    ],
    "surfaces": [
      "admin"
    ],
    "router": "admin"
  },
  "GET /admin/workers/locations": {
    "roles": [
      "admin",
      "district_admin",
      "taluka_admin",
      "ward_admin"
    ],
    "surfaces": [
      "admin"
    ],
    "router": "admin"
  },
  "GET /admin/workers/{worker_id}": {
    "roles": [
      "admin",
      "district_admin",
      "taluka_admin",
      "ward_admin"
    ],
    "surfaces": [
      "admin"
    ],
    "router": "admin"
  },
  "PUT /admin/workers/{worker_id}": {
    "roles": [
      "admin",
      "district_admin",
      "taluka_admin",
      "ward_admin"
    ],
    "surfaces": [
      "admin"
    ],
    "router": "admin"
  },
  "GET /admin/workers/{worker_id}/complaints": {
    "roles": [
      "admin",
      "district_admin",
      "taluka_admin",
      "ward_admin"
    ],
    "surfaces": [
      "admin"
    ],
    "router": "complaints"
  },
  "POST /admin/workers/{worker_id}/deactivate": {
    "roles": [
      "admin",
      "district_admin",
      "taluka_admin",
      "ward_admin"
    ],
    "surfaces": [
      "admin"
    ],
    "router": "admin"
  },
  "GET /admin/workers/{worker_id}/location": {
    "roles": [
      "admin",
      "district_admin",
      "taluka_admin",
      "ward_admin"
    ],
    "surfaces": [
      "admin"
    ],
    "router": "admin"
  },
  "POST /admin/workers/{worker_id}/reactivate": {
    "roles": [
      "admin",
      "district_admin",
      "taluka_admin",
      "ward_admin"
    ],
    "surfaces": [
      "admin"
    ],
    "router": "admin"
  },
  "GET /admin/workers/{worker_id}/report": {
    "roles": [
      "admin",
      "district_admin",
      "taluka_admin",
      "ward_admin"
    ],
    "surfaces": [
      "admin"
    ],
    "router": "admin"
  },
  "POST /admin/workers/{worker_id}/resend-invitation": {
    "roles": [
      "admin",
      "district_admin",
      "taluka_admin",
      "ward_admin"
    ],
    "surfaces": [
      "admin"
    ],
    "router": "admin"
  },
  "GET /announcements": {
    "roles": [
      "citizen",
      "worker",
      "admin",
      "district_admin",
      "taluka_admin",
      "ward_admin"
    ],
    "surfaces": [
      "mobile"
    ],
    "router": "features"
  },
  "POST /auth/aadhar/send-otp": {
    "roles": null,
    "surfaces": [
      "mobile"
    ],
    "router": "auth"
  },
  "POST /auth/aadhar/verify": {
    "roles": null,
    "surfaces": [
      "mobile"
    ],
    "router": "auth"
  },
  "DELETE /auth/account": {
    "roles": [
      "citizen",
      "worker",
      "admin",
      "district_admin",
      "taluka_admin",
      "ward_admin"
    ],
    "surfaces": [
      "mobile"
    ],
    "router": "auth"
  },
  "POST /auth/change-password": {
    "roles": [
      "citizen",
      "worker",
      "admin",
      "district_admin",
      "taluka_admin",
      "ward_admin"
    ],
    "surfaces": [
      "admin",
      "mobile"
    ],
    "router": "auth"
  },
  "GET /auth/check-phone": {
    "roles": null,
    "surfaces": [],
    "router": "auth"
  },
  "POST /auth/forgot-password": {
    "roles": null,
    "surfaces": [
      "mobile"
    ],
    "router": "auth"
  },
  "POST /auth/google": {
    "roles": null,
    "surfaces": [
      "mobile"
    ],
    "router": "auth"
  },
  "POST /auth/login": {
    "roles": null,
    "surfaces": [
      "mobile"
    ],
    "router": "auth"
  },
  "POST /auth/logout": {
    "roles": null,
    "surfaces": [
      "admin",
      "mobile"
    ],
    "router": "auth"
  },
  "GET /auth/me": {
    "roles": [
      "citizen",
      "worker",
      "admin",
      "district_admin",
      "taluka_admin",
      "ward_admin"
    ],
    "surfaces": [
      "admin",
      "mobile"
    ],
    "router": "auth"
  },
  "GET /auth/me/export": {
    "roles": [
      "citizen",
      "worker",
      "admin",
      "district_admin",
      "taluka_admin",
      "ward_admin"
    ],
    "surfaces": [
      "mobile"
    ],
    "router": "auth"
  },
  "POST /auth/phone/change/send-otp": {
    "roles": [
      "citizen",
      "worker",
      "admin",
      "district_admin",
      "taluka_admin",
      "ward_admin"
    ],
    "surfaces": [
      "admin",
      "mobile"
    ],
    "router": "auth"
  },
  "POST /auth/phone/change/verify": {
    "roles": [
      "citizen",
      "worker",
      "admin",
      "district_admin",
      "taluka_admin",
      "ward_admin"
    ],
    "surfaces": [
      "admin",
      "mobile"
    ],
    "router": "auth"
  },
  "PUT /auth/profile": {
    "roles": [
      "citizen",
      "worker",
      "admin",
      "district_admin",
      "taluka_admin",
      "ward_admin"
    ],
    "surfaces": [
      "admin",
      "mobile"
    ],
    "router": "auth"
  },
  "POST /auth/profile/photo": {
    "roles": [
      "citizen",
      "worker",
      "admin",
      "district_admin",
      "taluka_admin",
      "ward_admin"
    ],
    "surfaces": [
      "mobile"
    ],
    "router": "auth"
  },
  "GET /auth/providers": {
    "roles": [
      "citizen",
      "worker",
      "admin",
      "district_admin",
      "taluka_admin",
      "ward_admin"
    ],
    "surfaces": [
      "mobile"
    ],
    "router": "auth"
  },
  "POST /auth/refresh": {
    "roles": null,
    "surfaces": [
      "mobile"
    ],
    "router": "auth"
  },
  "POST /auth/register": {
    "roles": null,
    "surfaces": [
      "mobile"
    ],
    "router": "auth"
  },
  "POST /auth/reset-password": {
    "roles": null,
    "surfaces": [
      "mobile"
    ],
    "router": "auth"
  },
  "POST /auth/send-otp": {
    "roles": null,
    "surfaces": [
      "admin",
      "mobile"
    ],
    "router": "auth"
  },
  "POST /auth/verify-otp": {
    "roles": null,
    "surfaces": [
      "admin",
      "mobile"
    ],
    "router": "auth"
  },
  "GET /badges": {
    "roles": [
      "citizen",
      "worker",
      "admin",
      "district_admin",
      "taluka_admin",
      "ward_admin"
    ],
    "surfaces": [
      "mobile"
    ],
    "router": "rewards"
  },
  "POST /chat": {
    "roles": [
      "citizen",
      "worker",
      "admin",
      "district_admin",
      "taluka_admin",
      "ward_admin"
    ],
    "surfaces": [
      "mobile"
    ],
    "router": "chat"
  },
  "GET /health/": {
    "roles": null,
    "surfaces": [],
    "router": "health"
  },
  "GET /health/integrity": {
    "roles": [
      "admin"
    ],
    "surfaces": [],
    "router": "health"
  },
  "GET /health/live": {
    "roles": null,
    "surfaces": [],
    "router": "health"
  },
  "GET /health/pool": {
    "roles": null,
    "surfaces": [],
    "router": "main"
  },
  "GET /health/ready": {
    "roles": null,
    "surfaces": [],
    "router": "health"
  },
  "GET /issues": {
    "roles": [
      "citizen",
      "worker",
      "admin",
      "district_admin",
      "taluka_admin",
      "ward_admin"
    ],
    "surfaces": [
      "mobile"
    ],
    "router": "issues"
  },
  "POST /issues": {
    "roles": [
      "citizen",
      "admin"
    ],
    "surfaces": [
      "mobile"
    ],
    "router": "issues"
  },
  "GET /issues/custom-types": {
    "roles": [
      "citizen",
      "worker",
      "admin",
      "district_admin",
      "taluka_admin",
      "ward_admin"
    ],
    "surfaces": [
      "mobile"
    ],
    "router": "citizen_features"
  },
  "GET /issues/following": {
    "roles": [
      "citizen",
      "worker",
      "admin",
      "district_admin",
      "taluka_admin",
      "ward_admin"
    ],
    "surfaces": [
      "mobile"
    ],
    "router": "issues"
  },
  "GET /issues/nearby": {
    "roles": [
      "citizen",
      "worker",
      "admin",
      "district_admin",
      "taluka_admin",
      "ward_admin"
    ],
    "surfaces": [
      "mobile"
    ],
    "router": "issues"
  },
  "GET /issues/search": {
    "roles": [
      "citizen",
      "worker",
      "admin",
      "district_admin",
      "taluka_admin",
      "ward_admin"
    ],
    "surfaces": [
      "mobile"
    ],
    "router": "features"
  },
  "GET /issues/sla/dashboard": {
    "roles": [
      "admin",
      "district_admin",
      "taluka_admin",
      "ward_admin"
    ],
    "surfaces": [
      "admin"
    ],
    "router": "issues"
  },
  "GET /issues/sla/{issue_id}": {
    "roles": [
      "admin",
      "district_admin",
      "taluka_admin",
      "ward_admin"
    ],
    "surfaces": [
      "admin"
    ],
    "router": "issues"
  },
  "POST /issues/transcribe": {
    "roles": [
      "citizen",
      "worker",
      "admin",
      "district_admin",
      "taluka_admin",
      "ward_admin"
    ],
    "surfaces": [],
    "router": "issues"
  },
  "GET /issues/ward-health": {
    "roles": [
      "citizen",
      "worker",
      "admin",
      "district_admin",
      "taluka_admin",
      "ward_admin"
    ],
    "surfaces": [
      "mobile"
    ],
    "router": "issues"
  },
  "GET /issues/{issue_id}": {
    "roles": [
      "citizen",
      "worker",
      "admin",
      "district_admin",
      "taluka_admin",
      "ward_admin"
    ],
    "surfaces": [
      "mobile"
    ],
    "router": "issues"
  },
  "PATCH /issues/{issue_id}": {
    "roles": [
      "citizen",
      "worker",
      "admin",
      "district_admin",
      "taluka_admin",
      "ward_admin"
    ],
    "surfaces": [
      "mobile"
    ],
    "router": "issues"
  },
  "DELETE /issues/{issue_id}/bookmark": {
    "roles": [
      "citizen",
      "worker",
      "admin",
      "district_admin",
      "taluka_admin",
      "ward_admin"
    ],
    "surfaces": [
      "mobile"
    ],
    "router": "citizen_features"
  },
  "POST /issues/{issue_id}/bookmark": {
    "roles": [
      "citizen",
      "worker",
      "admin",
      "district_admin",
      "taluka_admin",
      "ward_admin"
    ],
    "surfaces": [
      "mobile"
    ],
    "router": "citizen_features"
  },
  "GET /issues/{issue_id}/comments": {
    "roles": [
      "citizen",
      "worker",
      "admin",
      "district_admin",
      "taluka_admin",
      "ward_admin"
    ],
    "surfaces": [
      "mobile"
    ],
    "router": "issues"
  },
  "POST /issues/{issue_id}/comments": {
    "roles": [
      "citizen",
      "worker",
      "admin",
      "district_admin",
      "taluka_admin",
      "ward_admin"
    ],
    "surfaces": [
      "mobile"
    ],
    "router": "issues"
  },
  "DELETE /issues/{issue_id}/comments/{comment_id}": {
    "roles": [
      "citizen",
      "worker",
      "admin",
      "district_admin",
      "taluka_admin",
      "ward_admin"
    ],
    "surfaces": [
      "mobile"
    ],
    "router": "issues"
  },
  "POST /issues/{issue_id}/dispute": {
    "roles": [
      "citizen",
      "admin"
    ],
    "surfaces": [
      "mobile"
    ],
    "router": "citizen_features"
  },
  "POST /issues/{issue_id}/dispute/photos": {
    "roles": [
      "citizen",
      "admin"
    ],
    "surfaces": [
      "mobile"
    ],
    "router": "citizen_features"
  },
  "GET /issues/{issue_id}/disputes": {
    "roles": [
      "citizen",
      "worker",
      "admin",
      "district_admin",
      "taluka_admin",
      "ward_admin"
    ],
    "surfaces": [
      "mobile"
    ],
    "router": "citizen_features"
  },
  "POST /issues/{issue_id}/flag": {
    "roles": [
      "citizen",
      "worker",
      "admin",
      "district_admin",
      "taluka_admin",
      "ward_admin"
    ],
    "surfaces": [
      "mobile"
    ],
    "router": "features"
  },
  "DELETE /issues/{issue_id}/photos": {
    "roles": [
      "citizen",
      "worker",
      "admin",
      "district_admin",
      "taluka_admin",
      "ward_admin"
    ],
    "surfaces": [
      "mobile"
    ],
    "router": "issues"
  },
  "POST /issues/{issue_id}/photos": {
    "roles": [
      "citizen",
      "worker",
      "admin",
      "district_admin",
      "taluka_admin",
      "ward_admin"
    ],
    "surfaces": [
      "mobile"
    ],
    "router": "issues"
  },
  "POST /issues/{issue_id}/reopen": {
    "roles": [
      "citizen",
      "worker",
      "admin",
      "district_admin",
      "taluka_admin",
      "ward_admin"
    ],
    "surfaces": [
      "mobile"
    ],
    "router": "issues"
  },
  "GET /issues/{issue_id}/survey": {
    "roles": [
      "citizen",
      "worker",
      "admin",
      "district_admin",
      "taluka_admin",
      "ward_admin"
    ],
    "surfaces": [
      "mobile"
    ],
    "router": "citizen_features"
  },
  "POST /issues/{issue_id}/survey": {
    "roles": [
      "citizen",
      "admin"
    ],
    "surfaces": [
      "mobile"
    ],
    "router": "citizen_features"
  },
  "GET /issues/{issue_id}/timeline": {
    "roles": [
      "citizen",
      "worker",
      "admin",
      "district_admin",
      "taluka_admin",
      "ward_admin"
    ],
    "surfaces": [
      "mobile"
    ],
    "router": "issues"
  },
  "DELETE /issues/{issue_id}/upvote": {
    "roles": [
      "citizen",
      "worker",
      "admin",
      "district_admin",
      "taluka_admin",
      "ward_admin"
    ],
    "surfaces": [
      "mobile"
    ],
    "router": "features"
  },
  "POST /issues/{issue_id}/upvote": {
    "roles": [
      "citizen",
      "worker",
      "admin",
      "district_admin",
      "taluka_admin",
      "ward_admin"
    ],
    "surfaces": [
      "mobile"
    ],
    "router": "features"
  },
  "GET /leaderboard/citizens": {
    "roles": [
      "citizen",
      "worker",
      "admin",
      "district_admin",
      "taluka_admin",
      "ward_admin"
    ],
    "surfaces": [
      "mobile"
    ],
    "router": "rewards"
  },
  "GET /leaderboard/workers": {
    "roles": [
      "citizen",
      "worker",
      "admin",
      "district_admin",
      "taluka_admin",
      "ward_admin"
    ],
    "surfaces": [
      "mobile"
    ],
    "router": "rewards"
  },
  "GET /locations/districts": {
    "roles": null,
    "surfaces": [
      "admin",
      "mobile"
    ],
    "router": "locations"
  },
  "POST /locations/districts": {
    "roles": [
      "admin"
    ],
    "surfaces": [
      "admin"
    ],
    "router": "locations"
  },
  "DELETE /locations/districts/{district_id}": {
    "roles": [
      "admin"
    ],
    "surfaces": [],
    "router": "locations"
  },
  "PATCH /locations/districts/{district_id}": {
    "roles": [
      "admin"
    ],
    "surfaces": [
      "admin"
    ],
    "router": "locations"
  },
  "GET /locations/districts/{district_id}/talukas": {
    "roles": null,
    "surfaces": [
      "admin",
      "mobile"
    ],
    "router": "locations"
  },
  "POST /locations/districts/{district_id}/talukas": {
    "roles": [
      "admin",
      "district_admin"
    ],
    "surfaces": [
      "admin"
    ],
    "router": "locations"
  },
  "GET /locations/nearby-ward": {
    "roles": null,
    "surfaces": [
      "mobile"
    ],
    "router": "locations"
  },
  "GET /locations/suggest": {
    "roles": null,
    "surfaces": [
      "admin",
      "mobile"
    ],
    "router": "locations"
  },
  "DELETE /locations/talukas/{taluka_id}": {
    "roles": [
      "admin",
      "district_admin"
    ],
    "surfaces": [],
    "router": "locations"
  },
  "PATCH /locations/talukas/{taluka_id}": {
    "roles": [
      "admin",
      "district_admin"
    ],
    "surfaces": [
      "admin"
    ],
    "router": "locations"
  },
  "GET /locations/talukas/{taluka_id}/wards": {
    "roles": null,
    "surfaces": [
      "admin",
      "mobile"
    ],
    "router": "locations"
  },
  "POST /locations/talukas/{taluka_id}/wards": {
    "roles": [
      "admin",
      "district_admin",
      "taluka_admin"
    ],
    "surfaces": [
      "admin"
    ],
    "router": "locations"
  },
  "GET /locations/tree": {
    "roles": null,
    "surfaces": [
      "admin",
      "mobile"
    ],
    "router": "locations"
  },
  "DELETE /locations/wards/{ward_id}": {
    "roles": [
      "admin",
      "district_admin",
      "taluka_admin"
    ],
    "surfaces": [],
    "router": "locations"
  },
  "PATCH /locations/wards/{ward_id}": {
    "roles": [
      "admin",
      "district_admin",
      "taluka_admin"
    ],
    "surfaces": [
      "admin"
    ],
    "router": "locations"
  },
  "POST /locations/wards/{ward_id}/geocode": {
    "roles": [
      "admin",
      "district_admin",
      "taluka_admin"
    ],
    "surfaces": [],
    "router": "locations"
  },
  "GET /me/bookmarks": {
    "roles": [
      "citizen",
      "worker",
      "admin",
      "district_admin",
      "taluka_admin",
      "ward_admin"
    ],
    "surfaces": [
      "mobile"
    ],
    "router": "citizen_features"
  },
  "GET /me/complaints": {
    "roles": [
      "citizen",
      "worker",
      "admin",
      "district_admin",
      "taluka_admin",
      "ward_admin"
    ],
    "surfaces": [
      "mobile"
    ],
    "router": "complaints"
  },
  "DELETE /me/notifications": {
    "roles": [
      "citizen",
      "worker",
      "admin",
      "district_admin",
      "taluka_admin",
      "ward_admin"
    ],
    "surfaces": [
      "mobile"
    ],
    "router": "notifications"
  },
  "GET /me/notifications": {
    "roles": [
      "citizen",
      "worker",
      "admin",
      "district_admin",
      "taluka_admin",
      "ward_admin"
    ],
    "surfaces": [
      "mobile"
    ],
    "router": "notifications"
  },
  "GET /me/notifications/count": {
    "roles": [
      "citizen",
      "worker",
      "admin",
      "district_admin",
      "taluka_admin",
      "ward_admin"
    ],
    "surfaces": [
      "mobile"
    ],
    "router": "notifications"
  },
  "POST /me/notifications/read-all": {
    "roles": [
      "citizen",
      "worker",
      "admin",
      "district_admin",
      "taluka_admin",
      "ward_admin"
    ],
    "surfaces": [
      "mobile"
    ],
    "router": "notifications"
  },
  "DELETE /me/notifications/{notification_id}": {
    "roles": [
      "citizen",
      "worker",
      "admin",
      "district_admin",
      "taluka_admin",
      "ward_admin"
    ],
    "surfaces": [
      "mobile"
    ],
    "router": "notifications"
  },
  "POST /me/notifications/{notification_id}/read": {
    "roles": [
      "citizen",
      "worker",
      "admin",
      "district_admin",
      "taluka_admin",
      "ward_admin"
    ],
    "surfaces": [
      "mobile"
    ],
    "router": "notifications"
  },
  "GET /me/rewards": {
    "roles": [
      "citizen",
      "worker",
      "admin",
      "district_admin",
      "taluka_admin",
      "ward_admin"
    ],
    "surfaces": [
      "mobile"
    ],
    "router": "rewards"
  },
  "GET /me/subscriptions": {
    "roles": [
      "citizen"
    ],
    "surfaces": [
      "mobile"
    ],
    "router": "features"
  },
  "POST /me/subscriptions": {
    "roles": [
      "citizen"
    ],
    "surfaces": [
      "mobile"
    ],
    "router": "features"
  },
  "DELETE /me/subscriptions/{ward_id}": {
    "roles": [
      "citizen"
    ],
    "surfaces": [
      "mobile"
    ],
    "router": "features"
  },
  "GET /me/surveys": {
    "roles": [
      "citizen",
      "worker",
      "admin",
      "district_admin",
      "taluka_admin",
      "ward_admin"
    ],
    "surfaces": [
      "mobile"
    ],
    "router": "citizen_features"
  },
  "GET /public/issues/map": {
    "roles": null,
    "surfaces": [],
    "router": "public"
  },
  "GET /public/leaderboard": {
    "roles": null,
    "surfaces": [
      "admin"
    ],
    "router": "public"
  },
  "POST /setup/admin": {
    "roles": null,
    "surfaces": [],
    "router": "setup"
  },
  "GET /setup/status": {
    "roles": null,
    "surfaces": [],
    "router": "setup"
  },
  "POST /sync": {
    "roles": [
      "citizen",
      "worker",
      "admin",
      "district_admin",
      "taluka_admin",
      "ward_admin"
    ],
    "surfaces": [
      "mobile"
    ],
    "router": "sync"
  },
  "PUT /workers/availability": {
    "roles": [
      "worker"
    ],
    "surfaces": [
      "mobile"
    ],
    "router": "features"
  },
  "POST /workers/complaints": {
    "roles": [
      "citizen",
      "admin"
    ],
    "surfaces": [
      "mobile"
    ],
    "router": "complaints"
  },
  "POST /workers/complaints/{complaint_id}/photos": {
    "roles": [
      "citizen",
      "admin"
    ],
    "surfaces": [
      "mobile"
    ],
    "router": "complaints"
  },
  "GET /workers/leaderboard": {
    "roles": [
      "worker"
    ],
    "surfaces": [
      "mobile"
    ],
    "router": "workers"
  },
  "PUT /workers/location": {
    "roles": [
      "worker"
    ],
    "surfaces": [
      "mobile"
    ],
    "router": "workers"
  },
  "GET /workers/shifts": {
    "roles": [
      "worker"
    ],
    "surfaces": [
      "mobile"
    ],
    "router": "features"
  },
  "POST /workers/shifts": {
    "roles": [
      "worker"
    ],
    "surfaces": [
      "mobile"
    ],
    "router": "features"
  },
  "DELETE /workers/shifts/{day_of_week}": {
    "roles": [
      "worker"
    ],
    "surfaces": [
      "mobile"
    ],
    "router": "features"
  },
  "GET /workers/stats": {
    "roles": [
      "worker"
    ],
    "surfaces": [
      "mobile"
    ],
    "router": "workers"
  },
  "PUT /workers/status": {
    "roles": [
      "worker",
      "admin"
    ],
    "surfaces": [
      "mobile"
    ],
    "router": "workers"
  },
  "GET /workers/tasks": {
    "roles": [
      "worker"
    ],
    "surfaces": [
      "mobile"
    ],
    "router": "workers"
  },
  "GET /workers/tasks/history": {
    "roles": [
      "worker"
    ],
    "surfaces": [
      "mobile"
    ],
    "router": "workers"
  },
  "POST /workers/tasks/{issue_id}/accept": {
    "roles": [
      "worker"
    ],
    "surfaces": [
      "mobile"
    ],
    "router": "workers"
  },
  "POST /workers/tasks/{issue_id}/block": {
    "roles": [
      "worker"
    ],
    "surfaces": [
      "mobile"
    ],
    "router": "workers"
  },
  "POST /workers/tasks/{issue_id}/reject": {
    "roles": [
      "worker"
    ],
    "surfaces": [
      "mobile"
    ],
    "router": "workers"
  },
  "POST /workers/tasks/{issue_id}/resolve": {
    "roles": [
      "worker"
    ],
    "surfaces": [
      "mobile"
    ],
    "router": "workers"
  }
};
