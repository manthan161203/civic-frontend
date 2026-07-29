/**
 * Worker endpoints.
 *
 * @typedef {import('@civic/api-types').IssueResponse} IssueResponse
 * @typedef {import('@civic/api-types').WorkerStats} WorkerStats
 * @typedef {import('@civic/api-types').ShiftUpsert} ShiftUpsert
 * @typedef {import('@civic/api-types').ComplaintCreate} ComplaintCreate
 * @typedef {import('@civic/api-types').ComplaintResponse} ComplaintResponse
 * @typedef {import('@civic/api-types').TaskAcceptReject} TaskAcceptReject
 * @typedef {import('@civic/api-types').ChatRequest} ChatRequest
 * @typedef {import('@civic/api-types').ChatResponse} ChatResponse
 */
import api from './client';

export const workersApi = {
  // Status & location
  setStatus: (is_online) => api.put('/workers/status', { is_online }),
  updateLocation: (latitude, longitude) =>
    api.put('/workers/location', { latitude, longitude }),
  setAvailability: (is_available) =>
    api.put('/workers/availability', { is_available }),
  // Tasks
  /** @returns {Promise<{ data: IssueResponse[] }>} */
  getTasks: () => api.get('/workers/tasks'),
  getTaskHistory: (params) => api.get('/workers/tasks/history', { params }),
  /** @returns {Promise<{ data: WorkerStats }>} */
  getStats: () => api.get('/workers/stats'),
  acceptTask: (issue_id) => api.post(`/workers/tasks/${issue_id}/accept`),
  rejectTask: (issue_id, reason) =>
    api.post(`/workers/tasks/${issue_id}/reject`, { action: 'reject', reason }),
  resolveTask: (issue_id, formData) =>
    api.post(`/workers/tasks/${issue_id}/resolve`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  /**
   * Report a task as blocked.
   *
   * `reason` goes in the QUERY STRING, not the body — the backend declares it
   * as `Query(..., min_length=3)`. Sent as JSON (which is what this did) the
   * request 422'd every single time, so the worker "blocked" flow has never
   * once succeeded. Its sibling `/reject` does take a body, which is probably
   * why the difference went unnoticed.
   *
   * @param {string} issue_id
   * @param {string} reason at least 3 characters
   */
  blockTask: (issue_id, reason) =>
    api.post(`/workers/tasks/${issue_id}/block`, null, { params: { reason } }),
  // Leaderboard
  leaderboard: () => api.get('/workers/leaderboard'),
  getLeaderboard: (params) => api.get('/workers/leaderboard', { params }),
  // Shifts
  getShifts: () => api.get('/workers/shifts'),
  setShift: (day_of_week, start_time, end_time) =>
    api.post('/workers/shifts', { day_of_week, start_time, end_time }),
  deleteShift: (day_of_week) => api.delete(`/workers/shifts/${day_of_week}`),
  // Complaints (filed by citizens against workers)
  fileComplaint: (data) => api.post('/workers/complaints', data),
  uploadComplaintPhotos: (id, formData) =>
    api.post(`/workers/complaints/${id}/photos`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  getMyComplaints: (params) => api.get('/me/complaints', { params }),
  // Chat
  chat: (message, issue_id = null) =>
    api.post('/chat', { message, issue_id }),
};
