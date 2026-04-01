import api from './client';

export const locationsApi = {
  getDistricts: () => api.get('/locations/districts'),
  getTalukas: (district_id) =>
    api.get(`/locations/districts/${district_id}/talukas`),
  getWards: (taluka_id) =>
    api.get(`/locations/talukas/${taluka_id}/wards`),
  getTree: () => api.get('/locations/tree'),
  getNearbyWard: (latitude, longitude) =>
    api.get('/locations/nearby-ward', { params: { latitude, longitude } }),
  getAnnouncements: (params) => api.get('/announcements', { params }),
  getSubscriptions: () => api.get('/me/subscriptions'),
  subscribe: (ward_id) => api.post('/me/subscriptions', { ward_id }),
  unsubscribe: (ward_id) => api.delete(`/me/subscriptions/${ward_id}`),
};
