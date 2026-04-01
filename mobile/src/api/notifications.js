import api from './client';

export const notificationsApi = {
  list: (params) => api.get('/me/notifications', { params }),
  readAll: () => api.post('/me/notifications/read-all'),
  readOne: (id) => api.post(`/me/notifications/${id}/read`),
  deleteOne: (id) => api.delete(`/me/notifications/${id}`),
  deleteAll: () => api.delete('/me/notifications'),
};
