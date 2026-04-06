import api from './client';

export const syncApi = {
  syncOfflineActions: (actions) => api.post('/sync', { actions }),
};
