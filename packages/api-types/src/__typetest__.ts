/**
 * Compile-time tests. Not shipped, not run — `tsc --noEmit` either accepts this
 * file or it doesn't, which is the whole assertion.
 *
 * Its job is to fail loudly when a regeneration silently changes a shape both
 * apps depend on. `@ts-expect-error` lines are as load-bearing as the positive
 * assertions: each one proves the types actually reject something, rather than
 * having collapsed to `any` — which is the usual way a generated types package
 * rots without anyone noticing.
 */

import type {
  IssueCreate,
  IssueListResponse,
  IssueResponse,
  IssueUpdate,
  PasswordLoginRequest,
  TokenResponse,
  UpdateProfileRequest,
  UserResponse,
  SyncRequest,
  RequestBody,
  ResponseBody,
  QueryParams,
  ApiPath,
} from "./index";

/** Asserts two types are mutually assignable. */
type Exact<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
const assert = <T extends true>(_: T) => {};

/* ── Path-driven helpers resolve to the same models as the aliases ───────── */

assert<Exact<RequestBody<"/issues", "post">, IssueCreate>>(true);
assert<Exact<ResponseBody<"/issues", "get">, IssueListResponse>>(true);
assert<Exact<ResponseBody<"/issues", "post">, IssueResponse>>(true);
assert<Exact<RequestBody<"/auth/login", "post">, PasswordLoginRequest>>(true);
assert<Exact<ResponseBody<"/auth/login", "post">, TokenResponse>>(true);
assert<Exact<ResponseBody<"/auth/me", "get">, UserResponse>>(true);
assert<Exact<RequestBody<"/sync", "post">, SyncRequest>>(true);
assert<Exact<RequestBody<"/issues/{issue_id}", "patch">, IssueUpdate>>(true);

/* ── Both pagination conventions are present on IssueListResponse ────────── */
/* The backend emits page/size AND limit/offset; admin reads `total`, mobile   */
/* falls back to `data.items || data`. Losing either breaks one of the apps.   */

const page: IssueListResponse = {
  items: [],
  total: 0,
  page: 1,
  size: 20,
  limit: 20,
  offset: 0,
  pages: 0,
};
void page;

/* ── Query params are typed, and unknown ones are rejected ───────────────── */

const issueQuery: QueryParams<"/issues", "get"> = { page: 1, size: 20, sort: "recent" };
void issueQuery;

// @ts-expect-error — `/issues` has no `severity` filter; that is `/admin/issues`.
const wrongQuery: QueryParams<"/issues", "get"> = { severity: "high" };
void wrongQuery;

/* ── The surface split is enforced, not just documented ──────────────────── */

// @ts-expect-error — taluka_id was removed from UpdateProfileRequest entirely.
const escalate: UpdateProfileRequest = { taluka_id: "any-uuid" };
void escalate;

// ward_id survives, but only a citizen may send it (403 otherwise — see
// REQUEST_FIELD_ACCESS.UpdateProfileRequest). Types cannot express that.
const citizenHomeWard: UpdateProfileRequest = { ward_id: "ward-uuid" };
void citizenHomeWard;

/* ── Routes that do not exist stay non-constructible ─────────────────────── */

// @ts-expect-error — no DELETE /issues/{id}; admin/src/api/client.js implies one
// in a JSDoc example. The admin surface must use DELETE /admin/issues/{id}.
type NoSuchRoute = ResponseBody<"/issues/{issue_id}", "delete">;
void 0 as unknown as NoSuchRoute;

// @ts-expect-error — the admin app calls PATCH /admin/announcements/{id}; the
// backend never defined it. Editing an announcement 405s today.
type NoAnnouncementPatch = RequestBody<"/admin/announcements/{announcement_id}", "patch">;
void 0 as unknown as NoAnnouncementPatch;

/* ── Every path is a literal, so typos cannot reach the network ──────────── */

const known: ApiPath = "/workers/tasks/{issue_id}/block";
void known;

// @ts-expect-error — not a route.
const typo: ApiPath = "/worker/tasks";
void typo;
