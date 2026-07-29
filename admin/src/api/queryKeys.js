/**
 * Query keys, in one place.
 *
 * Hierarchical, so a mutation can invalidate a whole family without knowing
 * which page or filter combination is currently mounted:
 *
 *   queryClient.invalidateQueries({ queryKey: qk.issues.all })
 *
 * catches every issue list on every page and every open issue detail. Ad-hoc
 * inline keys make that impossible — you end up invalidating the exact key you
 * happen to remember and leaving the others stale, which shows up as a bulk
 * action that appears not to have worked until the user reloads.
 *
 * The convention: `all` is the family prefix, and every more specific key
 * starts with it.
 */

export const qk = {
  issues: {
    all: ['admin', 'issues'],
    /** @param {object} params */
    list: (params) => ['admin', 'issues', 'list', params],
    /** @param {string} id */
    detail: (id) => ['admin', 'issues', 'detail', id],
    blocked: (params) => ['admin', 'issues', 'blocked', params],
  },

  workers: {
    all: ['admin', 'workers'],
    list: (params) => ['admin', 'workers', 'list', params],
    detail: (id) => ['admin', 'workers', 'detail', id],
    /** Id → name, used to label assignment cells. Long staleTime. */
    nameMap: () => ['admin', 'workers', 'nameMap'],
    locations: () => ['admin', 'workers', 'locations'],
    leaderboard: (params) => ['admin', 'workers', 'leaderboard', params],
  },

  citizens: {
    all: ['admin', 'citizens'],
    list: (params) => ['admin', 'citizens', 'list', params],
  },

  admins: {
    all: ['admin', 'admins'],
    list: (params) => ['admin', 'admins', 'list', params],
    scope: () => ['admin', 'admins', 'scope'],
  },

  /**
   * Rarely changes, so screens can hold it with a long `staleTime` instead of
   * re-fetching the whole hierarchy on every mount — `GET /locations/tree`
   * joins the entire table set.
   */
  locations: {
    all: ['locations'],
    districts: () => ['locations', 'districts'],
    talukas: (districtId) => ['locations', 'talukas', districtId],
    wards: (talukaId) => ['locations', 'wards', talukaId],
  },

  announcements: {
    all: ['admin', 'announcements'],
    list: (params) => ['admin', 'announcements', 'list', params],
  },

  geofences: {
    all: ['admin', 'geofences'],
    list: (params) => ['admin', 'geofences', 'list', params],
    workers: (id) => ['admin', 'geofences', 'workers', id],
    alerts: (id, params) => ['admin', 'geofences', 'alerts', id, params],
  },

  insights: {
    all: ['admin', 'insights'],
    summary: (params) => ['admin', 'insights', 'summary', params],
  },

  dashboard: {
    all: ['admin', 'dashboard'],
    stats: () => ['admin', 'dashboard', 'stats'],
    analytics: (days) => ['admin', 'dashboard', 'analytics', days],
    sos: () => ['admin', 'dashboard', 'sos'],
  },

  moderation: {
    all: ['admin', 'moderation'],
    flags: (params) => ['admin', 'moderation', 'flags', params],
    disputes: (params) => ['admin', 'moderation', 'disputes', params],
    complaints: (params) => ['admin', 'moderation', 'complaints', params],
  },
};

export default qk;
