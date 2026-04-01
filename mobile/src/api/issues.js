import api from './client';

export const issuesApi = {
  create: (data) => api.post('/issues', data),
  list: (params) => api.get('/issues', { params }),
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
  deletePhoto: (id, url) =>
    api.delete(`/issues/${id}/photos`, { data: { photo_url: url } }),
  // Comments
  getComments: (id) => api.get(`/issues/${id}/comments`),
  addComment: (id, text) =>
    api.post(`/issues/${id}/comments`, { content: text }),
  // Upvotes
  upvote: (id) => api.post(`/issues/${id}/upvote`),
  removeUpvote: (id) => api.delete(`/issues/${id}/upvote`),
  // Flags
  flag: (id, reason, description) =>
    api.post(`/issues/${id}/flag`, { reason, description }),
  // Ward health
  wardHealth: () => api.get('/issues/ward-health'),
};
