// Extracts a readable string from any FastAPI error response.
// FastAPI 422 returns { detail: [ {type, loc, msg, input} ] }
// FastAPI 400/401/404 returns { detail: "string" }
export function getErrorMessage(err, fallback = 'Something went wrong.') {
  const detail = err?.response?.data?.detail;
  if (!detail) return fallback;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    return detail.map((e) => e.msg || JSON.stringify(e)).join(', ');
  }
  return fallback;
}
