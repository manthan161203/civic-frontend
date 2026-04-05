import { create } from 'zustand';
import * as SecureStore from '../utils/secureStoreShim';
import { authApi } from '../api/auth';

// Attempt to register native FCM device token and save it to the backend (best-effort).
// Safe to call repeatedly — getDevicePushTokenAsync returns the same token if unchanged.
export async function registerPushToken() {
  try {
    const Notifications = await import('expo-notifications');
    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;
    if (existing !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') return;

    // Use native FCM device token (required for firebase_admin direct sends)
    const tokenData = await Notifications.getDevicePushTokenAsync();
    const fcmToken = tokenData.data;
    if (fcmToken) {
      await authApi.updateProfile({ fcm_token: fcmToken });
    }
  } catch {
    // Push notifications are best-effort — never block login
  }
}

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
      // Re-register push token on every app start — handles token rotation after reinstall
      registerPushToken();
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
      // Register push token after successful login (best-effort)
      registerPushToken();
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
