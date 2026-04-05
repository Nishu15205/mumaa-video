'use client';

import { create } from 'zustand';
import type { AppNotification } from '@/types';

interface NotificationState {
  notifications: AppNotification[];
  unreadCount: number;
  isOpen: boolean;
}

interface NotificationActions {
  setNotifications: (notifications: AppNotification[]) => void;
  addNotification: (notification: AppNotification) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  removeNotification: (id: string) => void;
  togglePanel: () => void;
  setOpen: (open: boolean) => void;
}

export const useNotificationStore = create<NotificationState & NotificationActions>()(
  (set) => ({
    notifications: [],
    unreadCount: 0,
    isOpen: false,

    setNotifications: (notifications) =>
      set({
        notifications,
        unreadCount: notifications.filter((n) => !n.isRead).length,
      }),

    addNotification: (notification) =>
      set((state) => {
        const exists = state.notifications.some((n) => n.id === notification.id);
        if (exists) return state;
        const notifications = [notification, ...state.notifications];
        return {
          notifications,
          unreadCount: state.unreadCount + 1,
        };
      }),

    markAsRead: (id) =>
      set((state) => {
        const notifications = state.notifications.map((n) =>
          n.id === id ? { ...n, isRead: true } : n
        );
        return {
          notifications,
          unreadCount: notifications.filter((n) => !n.isRead).length,
        };
      }),

    markAllAsRead: () =>
      set((state) => ({
        notifications: state.notifications.map((n) => ({ ...n, isRead: true })),
        unreadCount: 0,
      })),

    removeNotification: (id) =>
      set((state) => {
        const notification = state.notifications.find((n) => n.id === id);
        const notifications = state.notifications.filter((n) => n.id !== id);
        return {
          notifications,
          unreadCount: notification && !notification.isRead
            ? state.unreadCount - 1
            : state.unreadCount,
        };
      }),

    togglePanel: () =>
      set((state) => ({ isOpen: !state.isOpen })),

    setOpen: (isOpen) => set({ isOpen }),
  })
);
