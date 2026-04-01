import api from './client';

export const authApi = {
  sendOtp: (phone) => api.post('/auth/send-otp', { phone }),
  verifyOtp: (phone, code) => api.post('/auth/verify-otp', { phone, code }),
  googleSignIn: (id_token) => api.post('/auth/google', { id_token }),
  sendAadharOtp: (aadhaar_number) => api.post('/auth/aadhar/send-otp', { aadhaar_number }),
  verifyAadhar: (aadhaar_number, code) => api.post('/auth/aadhar/verify', { aadhaar_number, code }),
  getProviders: () => api.get('/auth/providers'),
  refresh: (refresh_token) => api.post('/auth/refresh', { refresh_token }),
  logout: (refresh_token) => api.post('/auth/logout', { refresh_token }),
  getMe: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/profile', data),
  sendChangePhoneOtp: (new_phone) => api.post('/auth/phone/change/send-otp', { new_phone }),
  verifyChangePhone: (new_phone, code) => api.post('/auth/phone/change/verify', { new_phone, code }),
  deleteAccount: () => api.delete('/auth/account'),
  uploadProfilePhoto: (formData) =>
    api.post('/auth/profile/photo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
};
