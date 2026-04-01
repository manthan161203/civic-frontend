import { create } from 'zustand';
import { notificationsApi } from '../api/notifications';

export const useNotificationStore = create((set) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,

  fetchNotifications: async () => {
    set({ isLoading: true });
    try {
      const { data } = await notificationsApi.list({ page: 1, size: 50 });
      const items = data.items || data;
      const unread = items.filter((n) => !n.is_read).length;
      set({ notifications: items, unreadCount: unread, isLoading: false });
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
}));
