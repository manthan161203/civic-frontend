import { create } from 'zustand';
import { notificationsApi } from '../api/notifications';

export const useNotificationStore = create((set) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,

  fetchNotifications: async () => {
    set({ isLoading: true });
    try {
      const [listRes, countRes] = await Promise.all([
        notificationsApi.list({ page: 1, size: 50 }),
        notificationsApi.count(),
      ]);
      const items = listRes.data.items || listRes.data;
      set({ notifications: items, unreadCount: countRes.data.unread ?? 0, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  markAllRead: async () => {
    try {
      await notificationsApi.readAll();
      set((state) => ({
        notifications: state.notifications.map((n) => ({ ...n, is_read: true })),
        unreadCount: 0,
      }));
    } catch {}
  },

  markOneRead: async (id) => {
    try {
      await notificationsApi.readOne(id);
      set((state) => ({
        notifications: state.notifications.map((n) =>
          n.id === id ? { ...n, is_read: true } : n
        ),
        unreadCount: Math.max(0, state.unreadCount - 1),
      }));
    } catch {}
  },

  deleteOne: async (id) => {
    try {
      await notificationsApi.deleteOne(id);
      set((state) => {
        const n = state.notifications.find((n) => n.id === id);
        return {
          notifications: state.notifications.filter((n) => n.id !== id),
          unreadCount: n && !n.is_read ? Math.max(0, state.unreadCount - 1) : state.unreadCount,
        };
      });
    } catch {}
  },

  deleteAll: async () => {
    try {
      await notificationsApi.deleteAll();
      set({ notifications: [], unreadCount: 0 });
    } catch {}
  },
}));
