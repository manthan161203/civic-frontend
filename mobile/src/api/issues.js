/**
 * Issue endpoints.
 *
 * @typedef {import('@civic/api-types').IssueCreate} IssueCreate
 * @typedef {import('@civic/api-types').IssueUpdate} IssueUpdate
 * @typedef {import('@civic/api-types').IssueResponse} IssueResponse
 * @typedef {import('@civic/api-types').IssueListResponse} IssueListResponse
 * @typedef {import('@civic/api-types').IssueCommentCreate} IssueCommentCreate
 * @typedef {import('@civic/api-types').IssueCommentResponse} IssueCommentResponse
 * @typedef {import('@civic/api-types').SurveyCreate} SurveyCreate
 * @typedef {import('@civic/api-types').SurveyResponse} SurveyResponse
 * @typedef {import('@civic/api-types').DisputeResponse} DisputeResponse
 * @typedef {import('@civic/api-types').BookmarkResponse} BookmarkResponse
 * @typedef {import('@civic/api-types').CustomIssueTypeResponse} CustomIssueTypeResponse
 */
import api from './client';

export const issuesApi = {
  /** @param {IssueCreate} data @returns {Promise<{ data: IssueResponse }>} */
  create: (data) => api.post('/issues', data),
  /**
   * @param {{ page?: number, size?: number, status?: string, issue_type?: string,
   *           ward?: string, priority?: string, sort?: string }} [params]
   * @returns {Promise<{ data: IssueListResponse }>}
   */
  list: (params) => api.get('/issues', { params }),
  following: (params) => api.get('/issues/following', { params }),
  /** @param {string} id @returns {Promise<{ data: IssueResponse }>} */
  get: (id) => api.get(`/issues/${id}`),
  /**
   * Citizens may only set `citizen_rating`, and only on their own resolved
   * issue. `status`/`resolution_notes` need worker or admin; anything else a
   * citizen sends is ignored without an error.
   * @param {string} id @param {IssueUpdate} data
   * @returns {Promise<{ data: IssueResponse }>}
   */
  update: (id, data) => api.patch(`/issues/${id}`, data),
  nearby: (params) => api.get('/issues/nearby', { params }),
  search: (params) => api.get('/issues/search', { params }),
  getTimeline: (id) => api.get(`/issues/${id}/timeline`),
  reopen: (id) => api.post(`/issues/${id}/reopen`),
  // Photos — multipart
  uploadPhoto: (id, formData, photoType = 'before') =>
    api.post(`/issues/${id}/photos?photo_type=${photoType}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  deletePhoto: (id, url, photo_type) =>
    api.delete(`/issues/${id}/photos`, { params: { url, photo_type } }),
  // Comments
  getComments: (id) => api.get(`/issues/${id}/comments`),
  /**
   * `is_internal` is worker/admin only. A citizen who sets it gets 201 and a
   * PUBLIC comment — the backend downgrades it silently — so do not expose the
   * control on citizen screens.
   * @returns {Promise<{ data: IssueCommentResponse }>}
   */
  addComment: (id, text, parentId = null, isInternal = false) =>
    api.post(`/issues/${id}/comments`, { body: text, ...(parentId && { parent_id: parentId }), is_internal: isInternal }),
  deleteComment: (issueId, commentId) =>
    api.delete(`/issues/${issueId}/comments/${commentId}`),
  // Upvotes
  upvote: (id) => api.post(`/issues/${id}/upvote`),
  removeUpvote: (id) => api.delete(`/issues/${id}/upvote`),
  // Flags
  flag: (id, reason, details) =>
    api.post(`/issues/${id}/flag`, { reason, details }),
  flagComment: (issueId, commentId, reason, details) =>
    api.post(`/issues/${issueId}/flag`, { reason, details, comment_id: commentId }),
  // Ward health
  wardHealth: (ward) => api.get('/issues/ward-health', { params: { ward } }),
  // Bookmarks
  bookmark: (id) => api.post(`/issues/${id}/bookmark`),
  removeBookmark: (id) => api.delete(`/issues/${id}/bookmark`),
  getBookmarks: (params) => api.get('/me/bookmarks', { params }),
  // Disputes
  createDispute: (id, reason) => api.post(`/issues/${id}/dispute`, { reason }),
  uploadDisputePhotos: (id, formData) =>
    api.post(`/issues/${id}/dispute/photos`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  getDisputes: (id) => api.get(`/issues/${id}/disputes`),
  // Satisfaction Survey
  submitSurvey: (id, data) => api.post(`/issues/${id}/survey`, data),
  getSurvey: (id) => api.get(`/issues/${id}/survey`),
  // Custom Issue Types
  getApprovedCustomTypes: () => api.get('/issues/custom-types'),
  // My complaints & surveys
  getMyComplaints: (params) => api.get('/me/complaints', { params }),
  getMySurveys: (params) => api.get('/me/surveys', { params }),
};
