import api from './client';

// Auth
export const authApi = {
  login: (phone) => api.post('/auth/send-otp', { phone }),
  verifyOtp: (phone, code) => api.post('/auth/verify-otp', { phone, code }),
  getMe: () => api.get('/auth/me'),
  logout: (refresh_token) => api.post('/auth/logout', { refresh_token }),
  updateProfile: (data) => api.put('/auth/profile', data),
  sendChangePhoneOtp: (new_phone) => api.post('/auth/phone/change/send-otp', { new_phone }),
  verifyChangePhone: (new_phone, code) => api.post('/auth/phone/change/verify', { new_phone, code }),
};

// Dashboard & Analytics
export const adminApi = {
  getDashboard: () => api.get('/admin/dashboard'),
  getAnalytics: (params) => api.get('/admin/analytics', { params }),
  getHeatmap: (params) => api.get('/admin/heatmap', { params }),
  getWorkerLocation: (id) => api.get(`/admin/workers/${id}/location`),

  // Issues
  getIssues: (params) => api.get('/admin/issues', { params }),
  deleteIssue: (id) => api.delete(`/admin/issues/${id}`),
  reassignIssue: (id, worker_id) => api.post(`/admin/issues/${id}/reassign`, { worker_id }),
  assignIssue: (id, worker_id) => api.post(`/admin/issues/${id}/assign`, { worker_id }),
  escalateIssue: (id) => api.post(`/admin/issues/${id}/escalate`),
  bulkAction: (issue_ids, action, payload) =>
    api.post('/admin/issues/bulk', { issue_ids, action, ...payload }),
  exportIssues: () => api.get('/admin/issues/export', { responseType: 'blob' }),

  // Workers
  getWorkers: (params) => api.get('/admin/workers', { params }),
  getWorker: (id) => api.get(`/admin/workers/${id}`),
  createWorker: (data) => api.post('/admin/workers', data),
  updateWorker: (id, data) => api.put(`/admin/workers/${id}`, data),
  deactivateWorker: (id) => api.post(`/admin/workers/${id}/deactivate`),
  reactivateWorker: (id) => api.post(`/admin/workers/${id}/reactivate`),
  getWorkerLocations: (params) => api.get('/admin/workers/locations', { params }),
  getWorkerLeaderboard: () => api.get('/admin/workers/leaderboard'),

  // Citizens
  getCitizens: (params) => api.get('/admin/citizens', { params }),
  getCitizen: (id) => api.get(`/admin/citizens/${id}`),
  deactivateCitizen: (id) => api.post(`/admin/citizens/${id}/deactivate`),
  reactivateCitizen: (id) => api.post(`/admin/citizens/${id}/reactivate`),

  // Sub-admins
  getAdmins: (params) => api.get('/admin/admins', { params }),
  getMyScope: () => api.get('/admin/me/scope'),
  createAdmin: (data) => api.post('/admin/admins', data),
  updateAdmin: (id, data) => api.put(`/admin/admins/${id}`, data),
  changeUserRole: (user_id, role) => api.patch(`/admin/users/${user_id}/role`, null, { params: { role } }),
  searchCitizens: (search) => api.get('/admin/citizens', { params: { search, size: 10, page: 1 } }),
  searchWorkers: (search) => api.get('/admin/workers', { params: { search, size: 10, page: 1 } }),

  // Flags
  getFlags: (params) => api.get('/admin/flags', { params }),
  resolveFlag: (id, status) => api.patch(`/admin/flags/${id}`, { status }),

  // Announcements
  getAnnouncements: () => api.get('/admin/announcements'),
  createAnnouncement: (data) => api.post('/admin/announcements', data),
  deleteAnnouncement: (id) => api.delete(`/admin/announcements/${id}`),
};

// Locations
export const locationsApi = {
  getTree: () => api.get('/locations/tree'),
  getDistricts: () => api.get('/locations/districts'),
  suggest: (q, type = 'all', district_id = null, taluka_id = null) =>
    api.get('/locations/suggest', { params: {
      q,
      type,
      ...(district_id && { district_id }),
      ...(taluka_id && { taluka_id }),
      limit: 8,
    } }),
  createDistrict: (name, centroid_lat = null, centroid_lon = null) =>
    api.post('/locations/districts', null, {
      params: { name, ...(centroid_lat != null && { centroid_lat }), ...(centroid_lon != null && { centroid_lon }) },
    }),
  updateDistrict: (id, name, state_name, centroid_lat = null, centroid_lon = null) =>
    api.patch(`/locations/districts/${id}`, null, {
      params: { name, ...(state_name && { state_name }), ...(centroid_lat != null && { centroid_lat }), ...(centroid_lon != null && { centroid_lon }) },
    }),
  deleteDistrict: (id) => api.delete(`/locations/districts/${id}`),
  getTalukas: (district_id) => api.get(`/locations/districts/${district_id}/talukas`),
  createTaluka: (district_id, name, centroid_lat = null, centroid_lon = null) =>
    api.post(`/locations/districts/${district_id}/talukas`, null, {
      params: { name, ...(centroid_lat != null && { centroid_lat }), ...(centroid_lon != null && { centroid_lon }) },
    }),
  updateTaluka: (id, name, centroid_lat = null, centroid_lon = null) =>
    api.patch(`/locations/talukas/${id}`, null, {
      params: { name, ...(centroid_lat != null && { centroid_lat }), ...(centroid_lon != null && { centroid_lon }) },
    }),
  deleteTaluka: (id) => api.delete(`/locations/talukas/${id}`),
  getWards: (taluka_id) => api.get(`/locations/talukas/${taluka_id}/wards`),
  createWard: (taluka_id, name, ward_number, centroid_lat = null, centroid_lon = null) =>
    api.post(`/locations/talukas/${taluka_id}/wards`, null, {
      params: { name, ward_number, ...(centroid_lat != null && { centroid_lat }), ...(centroid_lon != null && { centroid_lon }) },
    }),
  updateWard: (id, name, ward_number, centroid_lat = null, centroid_lon = null) =>
    api.patch(`/locations/wards/${id}`, null, {
      params: { name, ...(ward_number && { ward_number }), ...(centroid_lat != null && { centroid_lat }), ...(centroid_lon != null && { centroid_lon }) },
    }),
  deleteWard: (id) => api.delete(`/locations/wards/${id}`),
};
