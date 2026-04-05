'use client';

import { create } from 'zustand';

interface SocketState {
  isConnected: boolean;
  onlineUsers: string[];
}

interface SocketActions {
  setConnected: (connected: boolean) => void;
  setOnlineUsers: (users: string[]) => void;
  addOnlineUser: (userId: string) => void;
  removeOnlineUser: (userId: string) => void;
}

export const useSocketStore = create<SocketState & SocketActions>()((set) => ({
  isConnected: false,
  onlineUsers: [],

  setConnected: (isConnected) => set({ isConnected }),

  setOnlineUsers: (onlineUsers) => set({ onlineUsers }),

  addOnlineUser: (userId) =>
    set((state) => {
      if (state.onlineUsers.includes(userId)) return state;
      return { onlineUsers: [...state.onlineUsers, userId] };
    }),

  removeOnlineUser: (userId) =>
    set((state) => ({
      onlineUsers: state.onlineUsers.filter((id) => id !== userId),
    })),
}));
