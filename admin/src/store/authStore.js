'use client';
import { create } from 'zustand';
import { authApi } from '../api/index';
import { tokens } from '../api/http';
import { isAdminUser } from '../api/permissions';

/**
 * @typedef {import('@civic/api-types').UserResponse} UserResponse
 */

export const useAuthStore = create((set, get) => ({
  /** @type {UserResponse | null} */
  user: null,
  isAuthenticated: false,
  isLoading: true,
  /** Set when a signed-in non-admin is turned away, so login can explain why. */
  deniedReason: /** @type {string | null} */ (null),

  /** Restore a session from storage on first mount. */
  init: async () => {
    if (!tokens.getAccess()) {
      set({ isLoading: false });
      return;
    }
    try {
      const { data } = await authApi.getMe();

      // Allowlist, not a substring test. The previous check was
      // `role?.includes('admin') && role !== 'admin'`, which passed every
      // `*_admin` by luck of naming — a role called `admin_assistant` would
      // have been let straight in.
      if (!isAdminUser(data)) {
        tokens.clear();
        set({
          isLoading: false,
          isAuthenticated: false,
          user: null,
          deniedReason: 'This account is not an administrator.',
        });
        return;
      }

      set({ user: data, isAuthenticated: true, isLoading: false, deniedReason: null });
    } catch {
      // Either an expired session the transport could not refresh, or a network
      // problem. Either way there is nothing to restore.
      tokens.clear();
      set({ isLoading: false, isAuthenticated: false, user: null });
    }
  },

  /**
   * @param {string} access_token
   * @param {string} refresh_token
   * @param {UserResponse} user
   */
  setSession: (access_token, refresh_token, user) => {
    tokens.set(access_token, refresh_token);
    set({ user, isAuthenticated: true, isLoading: false, deniedReason: null });
  },

  /** @param {Partial<UserResponse>} data */
  updateUser: (data) => set((state) => ({ user: { ...state.user, ...data } })),

  /**
   * Drop local state without calling the server.
   *
   * The transport calls this (via `onSessionEnded`) when a refresh fails, at
   * which point there is no valid token left to authenticate a logout with.
   */
  clearSession: () => {
    tokens.clear();
    set({ user: null, isAuthenticated: false, isLoading: false });
  },

  logout: async () => {
    const refresh = tokens.getRefresh();
    if (refresh) await authApi.logout(refresh).catch(() => {});
    get().clearSession();
  },
}));
