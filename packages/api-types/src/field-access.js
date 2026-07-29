/**
 * Field-level access manifest — HAND-MAINTAINED.
 *
 * `endpoint-access.js` answers "who may call this route". This file answers the
 * harder question: on routes *both* apps call, which individual fields belong to
 * the admin surface and which to the mobile-user surface.
 *
 * That distinction is invisible in the OpenAPI document, because the backend
 * does not vary its serialization by role — `IssueResponse.model_validate(issue)`
 * emits the same 45 keys to a citizen and to a super-admin. The difference is in
 * which keys are *meaningful*, which are *writable*, and which are *silently
 * dropped*. A generated type cannot express any of that, so it lives here.
 *
 * Every entry below was verified against `civic-backend` source at the revision
 * recorded in `openapi.json`. Re-verify when regenerating.
 *
 * @see ./endpoint-access.js for route-level role gating.
 */

/**
 * Request fields whose acceptance depends on the caller's role.
 *
 * `onViolation` is the important column — it tells you whether the backend will
 * tell you that you got it wrong:
 *   "403"      → rejected loudly. Safe; you will find out in development.
 *   "ignored"  → accepted, 200, no effect. Dangerous: the UI reports success.
 *   "downgrade"→ accepted, 200, coerced to a safe value. Also silent.
 */
export const REQUEST_FIELD_ACCESS = {
  UpdateProfileRequest: {
    endpoint: "PUT /auth/profile",
    fields: {
      ward_id: {
        allowed: ["citizen"],
        onViolation: "403",
        surface: "mobile",
        note:
          "A citizen's home ward — a display and subscription preference. For " +
          "every other role this is the column admin authority is derived from, " +
          "so the backend rejects it outright. The admin app must never send it; " +
          "admin jurisdiction is assigned only via POST/PUT /admin/admins.",
      },
    },
    removed: {
      taluka_id:
        "No longer accepted from any caller. Assign via POST/PUT /admin/admins.",
      district_id:
        "No longer accepted from any caller. Assign via POST/PUT /admin/admins.",
    },
  },

  IssueCommentCreate: {
    endpoint: "POST /issues/{issue_id}/comments",
    fields: {
      is_internal: {
        allowed: ["worker", "ward_admin", "taluka_admin", "district_admin", "admin"],
        onViolation: "downgrade",
        surface: "admin",
        note:
          "Marks a comment as an internal note. A citizen who sets it gets 201 " +
          "and a comment with is_internal=false — no error. The mobile citizen " +
          "UI must not expose this control, because the response will claim the " +
          "note was created either way.",
      },
    },
  },

  IssueUpdate: {
    endpoint: "PATCH /issues/{issue_id}",
    fields: {
      status: {
        allowed: ["worker", "ward_admin", "taluka_admin", "district_admin", "admin"],
        onViolation: "ignored",
        surface: "both",
        note:
          "Also runs _validate_status_transition. Workers resolving an " +
          "urgent/high issue must have uploaded an after-photo first (400).",
      },
      resolution_notes: {
        allowed: ["worker", "ward_admin", "taluka_admin", "district_admin", "admin"],
        onViolation: "ignored",
        surface: "both",
      },
      assigned_worker_id: {
        allowed: ["ward_admin", "taluka_admin", "district_admin", "admin"],
        onViolation: "ignored",
        surface: "admin",
        note: "Setting it also forces status to 'assigned'.",
      },
      citizen_rating: {
        allowed: ["citizen"],
        onViolation: "ignored",
        surface: "mobile",
        note: "Only on the caller's own resolved issue. 1–5.",
      },
      priority: {
        allowed: ["admin", "district_admin", "taluka_admin", "ward_admin"],
        onViolation: "ignored",
        surface: "admin",
        note:
          "Now wired. It was declared, documented as admin-only, enum-validated " +
          "and never read by the handler — the request returned 200 with the " +
          "priority unchanged, so re-triaging looked like it worked. " +
          "Applied before any status change in the same request, because the " +
          "after-photo requirement is keyed on the stored priority. " +
          "Values are urgent|high|medium|low — note there is no 'critical', " +
          "which the admin console's filter offered for a while.",
      },
      department: {
        allowed: ["admin", "district_admin", "taluka_admin", "ward_admin"],
        onViolation: "ignored",
        surface: "admin",
        note:
          "Now wired, same history as priority. Changing it does NOT reassign an " +
          "already-assigned worker — they stay matched on the old department " +
          "until an admin revisits the assignment deliberately.",
      },
    },
  },

  IssueCreate: {
    endpoint: "POST /issues",
    callableBy: ["citizen", "admin"],
    fields: {
      severity: {
        allowed: ["citizen", "admin"],
        onViolation: null,
        surface: "mobile",
        note:
          "Reads like an admin field but is NOT gated — a citizen sets it freely " +
          "at creation. Treat it as a user-supplied hint, not an authoritative " +
          "triage value; the AI classifier writes its own opinion to ai_severity.",
      },
      priority: {
        allowed: ["citizen", "admin"],
        onViolation: null,
        surface: "mobile",
        note:
          "Also ungated at creation. is_sos=true overrides it to 'urgent'. " +
          "Contrast with IssueUpdate.priority, which is admin-only on paper and " +
          "inert in practice.",
      },
      department: { allowed: ["citizen", "admin"], onViolation: null, surface: "mobile" },
      ward_id: {
        allowed: ["citizen", "admin"],
        onViolation: "404",
        surface: "mobile",
        note: "Validated to exist; unrelated to admin scope.",
      },
      is_sos: {
        allowed: ["citizen", "admin"],
        onViolation: null,
        surface: "mobile",
        note: "Forces priority='urgent' and triggers a radius broadcast.",
      },
    },
  },

  CreateSubAdminRequest: {
    endpoint: "POST /admin/admins",
    callableBy: ["admin", "district_admin", "taluka_admin"],
    surface: "admin",
    fields: {
      ward_id: { allowed: ["admin", "district_admin", "taluka_admin"], surface: "admin" },
      taluka_id: { allowed: ["admin", "district_admin"], surface: "admin" },
      district_id: { allowed: ["admin"], surface: "admin" },
      role: {
        allowed: ["admin", "district_admin", "taluka_admin"],
        onViolation: "403",
        surface: "admin",
        note: "The new admin's scope must fall inside the caller's own scope.",
      },
    },
  },

  CreateWorker: {
    endpoint: "POST /admin/workers",
    surface: "admin",
    fields: {
      ward_id: { allowed: ["ward_admin", "taluka_admin", "district_admin", "admin"], surface: "admin" },
      taluka_id: { allowed: ["taluka_admin", "district_admin", "admin"], surface: "admin" },
      district_id: { allowed: ["district_admin", "admin"], surface: "admin" },
    },
  },
};

/**
 * Response fields that are present for everyone but only *mean* something to
 * one surface.
 *
 * `uniformShape: true` on every entry is the point: the backend never strips
 * keys by role, so TypeScript sees one type and both apps receive one shape.
 * Nulls here mean "not applicable to you", not "you are not allowed to see it".
 */
export const RESPONSE_FIELD_VISIBILITY = {
  IssueResponse: {
    uniformShape: true,
    /** Operational fields the mobile app has no use for. */
    adminOriented: [
      "is_blocked",
      "blocked_reason",
      "blocked_at",
      "blocked_by_id",
      "unblocked_at",
      "unblocked_by_id",
      "admin_unblock_note",
      "block_resolved_by",
      "blocked_duration_hours",
      "reassignment_count",
      "is_escalated",
      "escalated_at",
      "escalation_level",
      "is_duplicate",
      "parent_issue_id",
      "is_deleted",
    ],
    /** Internal AI triage signals. Surfaced in the admin ai-insights page only. */
    internalAi: [
      "ai_issue_type",
      "ai_severity",
      "ai_confidence",
      "ai_suggested_description",
      "ai_is_resolved",
      "ai_resolution_quality",
      "ai_resolution_notes",
    ],
    /** Meaningful to the reporting citizen. */
    citizenOriented: ["user_upvoted", "citizen_rating", "upvote_count", "comment_count"],
    /** Populated only once a worker is assigned. */
    workerOriented: ["assigned_worker_id", "assigned_worker_name", "resolution_notes"],
    sensitive: {
      reporter: {
        severity: "resolved",
        note:
          "FIXED. IssueResponse.reporter is Optional[IssueReporterInfo] with " +
          "from_attributes over an eager ORM relationship, so model_validate " +
          "populated it at all 24 call sites — and while `phone` lived on that " +
          "model, GET /issues/nearby handed the phone number of every nearby " +
          "reporter to any authenticated citizen, in bulk, keyed on a " +
          "caller-supplied coordinate. " +
          "`phone` is now gone from IssueReporterInfo entirely, so no response " +
          "model can emit it. Admin routes declare IssueAdminResponse, whose " +
          "reporter is IssueReporterAdminInfo and does carry it. " +
          "The direction matters: a route added later that forgets to opt in " +
          "leaks nothing, which stripping the field per-site could not give.",
      },
    },
  },

  UserResponse: {
    uniformShape: true,
    /** Admin scope columns. Null for citizens; authoritative for admins. */
    adminOriented: ["taluka_id", "district_id", "department"],
    citizenOriented: ["ward", "ward_id", "aadhar_verified", "google_id"],
    /** Worker presence and live tracking. */
    workerOriented: ["is_online", "is_available", "latitude", "longitude"],
    authFlow: {
      must_change_password:
        "Returned on TokenResponse and /auth/me. The mobile app routes on it; " +
        "the admin app currently ignores it and has no change-password screen.",
    },
  },

  IssueCommentResponse: {
    uniformShape: true,
    /**
     * Not a field difference — a ROW difference, which is easier to miss.
     * GET /issues/{id}/comments returns a different result set per role:
     * citizens have both is_internal=true comments AND every worker-authored
     * comment filtered out. Same TypeScript type, different cardinality. Do not
     * cache one app's result and reuse it for the other.
     */
    rowLevelFiltering: {
      citizen: "internal notes and all worker-authored comments are hidden",
      worker: "sees everything",
      admin: "sees everything",
    },
    adminOriented: ["is_internal"],
  },
};

/**
 * Endpoints where the two surfaces need genuinely different request shapes for
 * the same conceptual action. Neither app should reach for the other's route.
 */
export const SURFACE_SPLIT = {
  "assign a worker": {
    admin: "POST /admin/issues/{issue_id}/assign  (AssignWorker)",
    mobile: null,
  },
  "list issues": {
    admin: "GET /admin/issues  — jurisdiction-scoped, extra severity/department filters",
    mobile: "GET /issues  — reporter-scoped for citizens, adds a `sort` param",
    note: "Both return IssueListResponse. Do not share a fetch layer between them.",
  },
  "resolve an issue": {
    admin: "PATCH /issues/{issue_id} { status: 'resolved' }",
    mobile: "POST /workers/tasks/{issue_id}/resolve  (multipart, after_photo required)",
    note:
      "The worker route enforces the after-photo requirement and runs AI " +
      "resolution verification; the admin PATCH does not.",
  },
  "delete an issue": {
    admin: "DELETE /admin/issues/{issue_id}",
    mobile: null,
    note: "There is no DELETE /issues/{id}. A JSDoc example in admin/src/api/client.js implies one.",
  },
  "leaderboard": {
    admin: "GET /admin/workers/leaderboard  (scoped) | GET /public/leaderboard",
    mobile: "GET /leaderboard/citizens | GET /leaderboard/workers | GET /workers/leaderboard",
  },
};
