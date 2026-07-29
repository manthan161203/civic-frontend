/**
 * Location hierarchy, announcements and ward subscriptions.
 *
 * @typedef {import('@civic/api-types').SubscribeRequest} SubscribeRequest
 */
import api from './client';

export const locationsApi = {
  getDistricts: () => api.get('/locations/districts'),
  getTalukas: (district_id) =>
    api.get(`/locations/districts/${district_id}/talukas`),
  getWards: (taluka_id) =>
    api.get(`/locations/talukas/${taluka_id}/wards`),
  getTree: () => api.get('/locations/tree'),
  getNearbyWard: (latitude, longitude, radiusKm = 10) =>
    api.get('/locations/nearby-ward', { params: { latitude, longitude, radius_km: radiusKm } }),
  suggest: (q, type = 'all', district_id = null, taluka_id = null) =>
    api.get('/locations/suggest', { params: {
      q, type, limit: 6,
      ...(district_id && { district_id }),
      ...(taluka_id && { taluka_id }),
    } }),
  getAnnouncements: (params) => api.get('/announcements', { params }),
  getSubscriptions: () => api.get('/me/subscriptions'),
  subscribe: (ward_id) => api.post('/me/subscriptions', { ward_id }),
  unsubscribe: (ward_id) => api.delete(`/me/subscriptions/${ward_id}`),
};
