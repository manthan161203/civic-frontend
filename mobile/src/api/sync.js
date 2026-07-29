/**
 * Offline action replay.
 *
 * @typedef {import('@civic/api-types').SyncRequest} SyncRequest
 * @typedef {import('@civic/api-types').SyncResponse} SyncResponse
 * @typedef {import('@civic/api-types').SyncAction} SyncAction
 */
import api from './client';

export const syncApi = {
  /**
   * @param {SyncAction[]} actions
   * @returns {Promise<{ data: SyncResponse }>}
   */
  syncOfflineActions: (actions) => api.post('/sync', { actions }),
};
