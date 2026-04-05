import api from './client';

export const issuesApi = {
  create: (data) => api.post('/issues', data),
  list: (params) => api.get('/issues', { params }),
  following: (params) => api.get('/issues/following', { params }),
  get: (id) => api.get(`/issues/${id}`),
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
};
