import api from './client';

export const workersApi = {
  // Status & location
  setStatus: (is_online) => api.put('/workers/status', { is_online }),
  updateLocation: (latitude, longitude) =>
    api.put('/workers/location', { latitude, longitude }),
  setAvailability: (is_available) =>
    api.put('/workers/availability', { is_available }),
  // Tasks
  getTasks: () => api.get('/workers/tasks'),
  getTaskHistory: (params) => api.get('/workers/tasks/history', { params }),
  getStats: () => api.get('/workers/stats'),
  acceptTask: (issue_id) => api.post(`/workers/tasks/${issue_id}/accept`),
  rejectTask: (issue_id, reason) =>
    api.post(`/workers/tasks/${issue_id}/reject`, { action: 'reject', reason }),
  resolveTask: (issue_id, formData) =>
    api.post(`/workers/tasks/${issue_id}/resolve`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  blockTask: (issue_id, reason) =>
    api.post(`/workers/tasks/${issue_id}/block`, { reason }),
  // Leaderboard
  leaderboard: () => api.get('/workers/leaderboard'),
  getLeaderboard: (params) => api.get('/workers/leaderboard', { params }),
  // Shifts
  getShifts: () => api.get('/workers/shifts'),
  setShift: (day_of_week, start_time, end_time) =>
    api.post('/workers/shifts', { day_of_week, start_time, end_time }),
  deleteShift: (day_of_week) => api.delete(`/workers/shifts/${day_of_week}`),
};
