import { create } from 'zustand';
import * as SecureStore from '../utils/secureStoreShim';
import { authApi } from '../api/auth';

export const useAuthStore = create((set, get) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,

  // Called on app start — restore session from secure storage
  initSession: async () => {
    try {
      const token = await SecureStore.getItemAsync('access_token');
      if (!token) {
        set({ isLoading: false });
        return;
      }
      const { data } = await authApi.getMe();
      set({ user: data, isAuthenticated: true, isLoading: false });
    } catch {
      await SecureStore.deleteItemAsync('access_token');
      await SecureStore.deleteItemAsync('refresh_token');
      set({ isLoading: false, isAuthenticated: false, user: null });
    }
  },

  // Save tokens and fetch profile after login
  setSession: async (access_token, refresh_token) => {
    await SecureStore.setItemAsync('access_token', access_token);
    await SecureStore.setItemAsync('refresh_token', refresh_token);
    try {
      const { data } = await authApi.getMe();
      set({ user: data, isAuthenticated: true });
    } catch {
      set({ isAuthenticated: true });
    }
  },

  updateUser: (updates) =>
    set((state) => ({ user: { ...state.user, ...updates } })),

  clearSession: async () => {
    await SecureStore.deleteItemAsync('access_token');
    await SecureStore.deleteItemAsync('refresh_token');
    set({ user: null, isAuthenticated: false });
  },

  logout: async () => {
    try {
      const refresh_token = await SecureStore.getItemAsync('refresh_token');
      if (refresh_token) await authApi.logout(refresh_token);
    } catch {}
    await get().clearSession();
  },
}));
