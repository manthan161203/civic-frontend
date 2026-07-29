/**
 * Runtime entry point.
 *
 * Everything type-shaped in this package is erased at build time and costs
 * nothing. Only the two access manifests exist at runtime, and only because
 * guards and admin UI need to branch on them.
 */

export {
  ADMIN_ROLES,
  ALL_ROLES,
  ENDPOINT_ACCESS,
} from "./endpoint-access.js";

export {
  REQUEST_FIELD_ACCESS,
  RESPONSE_FIELD_VISIBILITY,
  SURFACE_SPLIT,
} from "./field-access.js";
