/** Types for the hand-maintained field-level access manifest. */

import type { Role, Surface } from "./endpoint-access";

/**
 * What the backend does when a role sends a field it may not set.
 *
 * `"ignored"` and `"downgrade"` are the ones to design around — the request
 * succeeds, so the UI will report success for something that did not happen.
 */
export type ViolationBehaviour = "403" | "404" | "ignored" | "downgrade" | null;

export interface RequestFieldRule {
  /** Roles permitted to set this field. `[]` means no one (see `unimplemented`). */
  allowed: Role[];
  onViolation?: ViolationBehaviour;
  /** Which app should render a control for it. */
  surface?: Surface | "both" | "none";
  /** Declared in the schema but never applied by the handler. */
  unimplemented?: boolean;
  note?: string;
}

export interface RequestModelAccess {
  endpoint: string;
  callableBy?: Role[];
  surface?: Surface;
  fields: Record<string, RequestFieldRule>;
  /** Fields removed from the schema, with the reason and the replacement. */
  removed?: Record<string, string>;
}

export interface SensitiveFieldNote {
  severity: "high" | "medium" | "low";
  note: string;
}

export interface ResponseModelVisibility {
  /** Always true here: the backend does not vary serialization by role. */
  uniformShape: true;
  adminOriented?: string[];
  citizenOriented?: string[];
  workerOriented?: string[];
  internalAi?: string[];
  authFlow?: Record<string, string>;
  /** Fields that leave the server for callers who should not receive them. */
  sensitive?: Record<string, SensitiveFieldNote>;
  /**
   * Endpoints where the *rows* differ by role rather than the fields — the
   * TypeScript type is identical but the result set is not.
   */
  rowLevelFiltering?: Partial<Record<Role, string>>;
}

export interface SurfaceSplitEntry {
  admin: string | null;
  mobile: string | null;
  note?: string;
}

export declare const REQUEST_FIELD_ACCESS: Record<string, RequestModelAccess>;
export declare const RESPONSE_FIELD_VISIBILITY: Record<string, ResponseModelVisibility>;
export declare const SURFACE_SPLIT: Record<string, SurfaceSplitEntry>;
