import api from './client';

export const authApi = {
  sendOtp: (phone) => api.post('/auth/send-otp', { phone }),
  verifyOtp: (phone, code) => api.post('/auth/verify-otp', { phone, code }),
  googleSignIn: (id_token) => api.post('/auth/google', { id_token }),
  refresh: (refresh_token) => api.post('/auth/refresh', { refresh_token }),
  logout: (refresh_token) => api.post('/auth/logout', { refresh_token }),
  getMe: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/profile', data),
  deleteAccount: () => api.delete('/auth/account'),
};
