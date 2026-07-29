/**
 * Authentication endpoints.
 *
 * Typed against `@civic/api-types`, generated from the backend's OpenAPI
 * document — a schema change on the server surfaces here rather than as
 * `undefined` at a call site.
 *
 * @typedef {import('@civic/api-types').TokenResponse} TokenResponse
 * @typedef {import('@civic/api-types').UserResponse} UserResponse
 * @typedef {import('@civic/api-types').SendOTPResponse} SendOTPResponse
 * @typedef {import('@civic/api-types').RegisterRequest} RegisterRequest
 * @typedef {import('@civic/api-types').UpdateProfileRequest} UpdateProfileRequest
 * @typedef {import('@civic/api-types').AuthProvidersResponse} AuthProvidersResponse
 */
import api from './client';

export const authApi = {
  sendOtp: (phone) => api.post('/auth/send-otp', { phone }),
  /** @returns {Promise<{ data: TokenResponse }>} */
  verifyOtp: (phone, code) => api.post('/auth/verify-otp', { phone, code }),
  googleSignIn: (id_token) => api.post('/auth/google', { id_token }),
  sendAadharOtp: (aadhaar_number) => api.post('/auth/aadhar/send-otp', { aadhaar_number }),
  verifyAadhar: (aadhaar_number, code) => api.post('/auth/aadhar/verify', { aadhaar_number, code }),
  getProviders: () => api.get('/auth/providers'),
  refresh: (refresh_token) => api.post('/auth/refresh', { refresh_token }),
  logout: (refresh_token) => api.post('/auth/logout', { refresh_token }),
  /** @returns {Promise<{ data: UserResponse }>} */
  getMe: () => api.get('/auth/me'),
  /**
   * `ward_id` is a citizen's home ward. Every other role gets a 403 — it is
   * the column admin authority derives from. `taluka_id`/`district_id` are not
   * accepted from any caller.
   * @param {UpdateProfileRequest} data
   * @returns {Promise<{ data: UserResponse }>}
   */
  updateProfile: (data) => api.put('/auth/profile', data),
  sendChangePhoneOtp: (new_phone) => api.post('/auth/phone/change/send-otp', { new_phone }),
  verifyChangePhone: (new_phone, code) => api.post('/auth/phone/change/verify', { new_phone, code }),
  deleteAccount: () => api.delete('/auth/account'),
  exportMyData: () => api.get('/auth/me/export'),
  uploadProfilePhoto: (formData) =>
    api.post('/auth/profile/photo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  // Citizen registration (phone + name + email + password)
  register: (data) => api.post('/auth/register', data),
  loginWithPassword: (identifier, password) =>
    api.post('/auth/login', { identifier, password }),
  forgotPassword: (identifier) =>
    api.post('/auth/forgot-password', { identifier }),
  resetPassword: (phone, code, new_password, confirm_password) =>
    api.post('/auth/reset-password', { phone, code, new_password, confirm_password }),
  changePassword: (current_password, new_password, confirm_password) =>
    api.post('/auth/change-password', { current_password, new_password, confirm_password }),
};
