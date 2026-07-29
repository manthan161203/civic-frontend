/**
 * Generic helpers for pulling request/response/query types straight off a route.
 *
 * These let call sites name an endpoint by its literal path and method rather
 * than by the schema name, so a rename on the backend surfaces as a type error
 * at the call site instead of silently binding to the wrong model:
 *
 *   type Body = RequestBody<"/issues", "post">;      // IssueCreate
 *   type Res  = ResponseBody<"/issues", "get">;      // IssueListResponse
 *   type Q    = QueryParams<"/issues", "get">;       // { page?, size?, status?, … }
 */

import type { paths } from "./schema";

/** Every path string the API serves. */
export type ApiPath = keyof paths;

type HttpMethod = "get" | "put" | "post" | "delete" | "patch";

/**
 * The HTTP methods a given path actually serves.
 *
 * `openapi-typescript` emits every method on every path and types the absent
 * ones as `never`, so a naive `keyof` accepts `"delete"` on a path that has no
 * DELETE. Filtering those out here means naming the wrong method is a compile
 * error at the call site rather than a silent `never`.
 */
export type MethodsFor<P extends ApiPath> = {
  [M in Extract<keyof paths[P], HttpMethod>]: paths[P][M] extends undefined
    ? never
    : M;
}[Extract<keyof paths[P], HttpMethod>];

type Op<P extends ApiPath, M extends MethodsFor<P>> = paths[P][M];

/**
 * The JSON request body for a route, or `never` if it takes none.
 * Multipart routes resolve to their `multipart/form-data` shape.
 */
export type RequestBody<
  P extends ApiPath,
  M extends MethodsFor<P>,
> = Op<P, M> extends {
  requestBody: { content: infer C };
}
  ? C extends { "application/json": infer J }
    ? J
    : C extends { "multipart/form-data": infer F }
      ? F
      : never
  : never;

/** The 200/201 response body for a route. */
export type ResponseBody<
  P extends ApiPath,
  M extends MethodsFor<P>,
> = Op<P, M> extends { responses: infer R }
  ? R extends { 200: { content: { "application/json": infer J } } }
    ? J
    : R extends { 201: { content: { "application/json": infer J } } }
      ? J
      : never
  : never;

/** Query-string parameters for a route. */
export type QueryParams<
  P extends ApiPath,
  M extends MethodsFor<P>,
> = Op<P, M> extends { parameters: { query?: infer Q } } ? Q : never;

/** Path parameters for a route. */
export type PathParams<
  P extends ApiPath,
  M extends MethodsFor<P>,
> = Op<P, M> extends { parameters: { path?: infer T } } ? T : never;
