/** Types for the generated endpoint access manifest. */

export type Role =
  | "citizen"
  | "worker"
  | "ward_admin"
  | "taluka_admin"
  | "district_admin"
  | "admin";

export type Surface = "admin" | "mobile";

export interface EndpointAccess {
  /**
   * Roles the backend accepts, or `null` for unauthenticated routes.
   *
   * Route-level only. Several admin routes narrow results further by
   * jurisdiction inside the handler (`apply_admin_scope`), so a `ward_admin`
   * listed here can still get 403 or an empty page for another ward.
   */
  roles: Role[] | null;
  /** Which app currently calls it. `[]` means neither. */
  surfaces: Surface[];
  /** Backend router module the route is defined in. */
  router: string;
}

export declare const ADMIN_ROLES: readonly Role[];
export declare const ALL_ROLES: readonly Role[];

/** Keyed by `"METHOD /path"`, e.g. `"POST /issues/{issue_id}/comments"`. */
export declare const ENDPOINT_ACCESS: Record<string, EndpointAccess>;
