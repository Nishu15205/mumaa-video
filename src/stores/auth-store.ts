'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, Subscription } from '@/types';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  subscription: Subscription | null;
}

interface AuthActions {
  setUser: (user: User | null) => void;
  setSubscription: (subscription: Subscription | null) => void;
  logout: () => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState & AuthActions>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      subscription: null,

      setUser: (user) =>
        set({
          user,
          isAuthenticated: !!user,
          isLoading: false,
        }),

      setSubscription: (subscription) =>
        set({ subscription }),

      logout: () =>
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          subscription: null,
        }),

      setLoading: (isLoading) =>
        set({ isLoading }),
    }),
    {
      name: 'mumaa-auth',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        subscription: state.subscription,
      }),
      onRehydrateStorage: () => {
        return (_state, error) => {
          if (!error) {
            useAuthStore.setState({ isLoading: false });
          }
        };
      },
    }
  )
);
