'use client';
import { create } from 'zustand';
import { authApi } from '../api/index';

export const useAuthStore = create((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  init: async () => {
    const token = localStorage.getItem('access_token');
    if (!token) { set({ isLoading: false }); return; }
    try {
      const { data } = await authApi.getMe();
      if (!data.role?.includes('admin') && data.role !== 'admin') {
        throw new Error('Not an admin');
      }
      set({ user: data, isAuthenticated: true, isLoading: false });
    } catch {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      set({ isLoading: false, isAuthenticated: false, user: null });
    }
  },

  setSession: (access_token, refresh_token, user) => {
    localStorage.setItem('access_token', access_token);
    localStorage.setItem('refresh_token', refresh_token);
    set({ user, isAuthenticated: true, isLoading: false });
  },

  updateUser: (data) => set((state) => ({ user: { ...state.user, ...data } })),

  logout: async () => {
    const refresh = localStorage.getItem('refresh_token');
    if (refresh) await authApi.logout(refresh).catch(() => {});
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    set({ user: null, isAuthenticated: false, isLoading: false });
  },
}));
