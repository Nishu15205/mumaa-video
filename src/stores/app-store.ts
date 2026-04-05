'use client';

import { create } from 'zustand';
import type { AppView, CallSession, IncomingCall } from '@/types';

interface AppState {
  currentView: AppView;
  sidebarOpen: boolean;
  activeTab: string;
  showVideoCall: boolean;
  currentCall: CallSession | null;
  incomingCall: IncomingCall | null;
  waitingForNanny: boolean;
  /** Shared Socket.IO connection — created once in page.tsx, reused everywhere */
  socket: any | null;
  /** Whether the socket has been authenticated with the server */
  socketAuthenticated: boolean;
  /** Pre-acquired local media stream (camera + mic) — set before entering call on mobile */
  localStream: MediaStream | null;
}

interface AppActions {
  setCurrentView: (view: AppView) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setActiveTab: (tab: string) => void;
  startCall: (call: CallSession, stream?: MediaStream | null) => void;
  endCall: () => void;
  setIncomingCall: (call: IncomingCall | null) => void;
  setWaitingForNanny: (waiting: boolean) => void;
  setSocket: (socket: any) => void;
  setSocketAuthenticated: (auth: boolean) => void;
  setLocalStream: (stream: MediaStream | null) => void;
}

export const useAppStore = create<AppState & AppActions>()((set, get) => ({
  currentView: 'landing',
  sidebarOpen: true,
  activeTab: 'overview',
  showVideoCall: false,
  currentCall: null,
  incomingCall: null,
  waitingForNanny: false,
  socket: null,
  socketAuthenticated: false,
  localStream: null,

  setCurrentView: (currentView) => set({ currentView }),

  toggleSidebar: () =>
    set((state) => ({ sidebarOpen: !state.sidebarOpen })),

  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),

  setActiveTab: (activeTab) => set({ activeTab }),

  startCall: (call, stream) =>
    set({
      currentCall: call,
      showVideoCall: true,
      incomingCall: null,
      ...(stream ? { localStream: stream } : {}),
    }),

  endCall: () => {
    // Stop all tracks in the pre-acquired stream
    const { localStream } = get();
    if (localStream) {
      localStream.getTracks().forEach((t) => t.stop());
    }
    set({
      currentCall: null,
      showVideoCall: false,
      waitingForNanny: false,
      localStream: null,
    });
  },

  setIncomingCall: (incomingCall) => set({ incomingCall }),

  setWaitingForNanny: (waiting) => set({ waitingForNanny: waiting }),

  setSocket: (socket) => set({ socket }),

  setSocketAuthenticated: (socketAuthenticated) => set({ socketAuthenticated }),

  setLocalStream: (localStream) => set({ localStream }),
}));
