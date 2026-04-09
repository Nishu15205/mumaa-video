'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { useAppStore } from '@/stores/app-store';
import { useNotificationStore } from '@/stores/notification-store';
import { apiGet } from '@/lib/api';
import { toast } from 'sonner';

import LandingPage from '@/components/landing/LandingPage';
import LoginForm from '@/components/auth/LoginForm';
import SignupForm from '@/components/auth/SignupForm';
import ForgotPasswordForm from '@/components/auth/ForgotPasswordForm';
import { PricingPage } from '@/components/pricing/PricingPage';
import DashboardLayout from '@/components/dashboard/DashboardLayout';

import ParentDashboard from '@/components/dashboard/parent/ParentDashboard';
import FindNannies from '@/components/dashboard/parent/FindNannies';
import MyCalls from '@/components/dashboard/parent/MyCalls';
import ScheduleCall from '@/components/dashboard/parent/ScheduleCall';
import SubscriptionPage from '@/components/dashboard/parent/SubscriptionPage';

import NannyDashboard from '@/components/dashboard/nanny/NannyDashboard';
import NannyCalls from '@/components/dashboard/nanny/NannyCalls';
import NannyEarnings from '@/components/dashboard/nanny/NannyEarnings';
import NannyBankDetails from '@/components/dashboard/nanny/NannyBankDetails';

import AdminDashboard from '@/components/dashboard/admin/AdminDashboard';
import AdminAnalytics from '@/components/dashboard/admin/AdminAnalytics';
import AdminUsers from '@/components/dashboard/admin/AdminUsers';
import AdminCalls from '@/components/dashboard/admin/AdminCalls';
import AdminApplications from '@/components/dashboard/admin/AdminApplications';
import AdminPayments from '@/components/dashboard/admin/AdminPayments';

import Settings from '@/components/dashboard/Settings';
import { VideoCallScreen } from '@/components/videocall/VideoCallScreen';
import { IncomingCallDialog } from '@/components/videocall/IncomingCallDialog';
import { requestNotificationPermission } from '@/lib/ringtone';
import LegalPages from '@/components/common/LegalPages';
import ApplyAsNanny from '@/components/common/ApplyAsNanny';
import NannySetup from '@/components/common/NannySetup';

// Error boundary to catch video call crashes gracefully
class VideoCallErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[MUMAA] VideoCall ErrorBoundary caught:', error, errorInfo);
  }
  handleReset = () => {
    const { endCall } = useAppStore.getState();
    endCall();
    this.setState({ hasError: false, error: null });
  };
  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 z-[90] bg-gray-950 flex items-center justify-center p-6">
          <div className="bg-gray-900 rounded-3xl p-8 shadow-2xl border border-gray-800 text-center max-w-md w-full">
            <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Call Error</h2>
            <p className="text-gray-400 text-sm mb-6">
              Something went wrong with the video call. This may be due to network restrictions in the current environment.
            </p>
            <button
              onClick={this.handleReset}
              className="w-full bg-rose-500 hover:bg-rose-600 text-white rounded-xl h-11 font-medium transition-colors"
            >
              Go Back to Dashboard
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="flex flex-col items-center gap-4">
        <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center animate-pulse">
          <svg className="h-7 w-7 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
        </div>
        <p className="text-gray-500 text-sm font-medium">Loading Mumaa...</p>
      </div>
    </div>
  );
}

function ParentDashboardRouter({ activePage, onNavigate }: { activePage: string; onNavigate: (page: string) => void }) {
  switch (activePage) {
    case 'find':
      return <FindNannies />;
    case 'calls':
      return <MyCalls />;
    case 'schedule':
      return <ScheduleCall />;
    case 'subscription':
      return <SubscriptionPage />;
    case 'settings':
      return <Settings />;
    default:
      return <ParentDashboard onNavigate={onNavigate} />;
  }
}

function NannyDashboardRouter({ activePage, onNavigate }: { activePage: string; onNavigate?: (page: string) => void }) {
  switch (activePage) {
    case 'calls':
      return <NannyCalls />;
    case 'availability':
      return <NannyDashboard />;
    case 'earnings':
      return <NannyEarnings />;
    case 'bank':
      return <NannyBankDetails />;
    case 'settings':
      return <Settings />;
    default:
      return <NannyDashboard onNavigate={onNavigate} />;
  }
}

function AdminDashboardRouter({ activePage, onNavigate }: { activePage: string; onNavigate: (page: string) => void }) {
  switch (activePage) {
    case 'users':
      return <AdminUsers />;
    case 'calls':
      return <AdminCalls />;
    case 'analytics':
      return <AdminAnalytics />;
    case 'applications':
      return <AdminApplications />;
    case 'payments':
      return <AdminPayments />;
    default:
      return <AdminDashboard onNavigate={onNavigate} />;
  }
}

export default function Home() {
  const { user, isAuthenticated, isLoading, setUser, setSubscription } = useAuthStore();
  const { currentView, showVideoCall, incomingCall, setActiveTab, setCurrentView } = useAppStore();
  const { addNotification } = useNotificationStore();
  const [dashboardPage, setDashboardPage] = useState('dashboard');
  const [mounted, setMounted] = useState(false);

  // Mark as mounted and ensure loading is false after hydration
  useEffect(() => {
    // Immediately mark mounted
    setMounted(true);
    // Immediately force loading false - the store will rehydrate from localStorage
    useAuthStore.setState({ isLoading: false });
    // Pre-request notification permission for incoming call alerts
    requestNotificationPermission();
  }, []);

  // Sync activeTab with dashboardPage
  useEffect(() => {
    setActiveTab(dashboardPage);
  }, [dashboardPage, setActiveTab]);

  // Restore session on mount
  useEffect(() => {
    if (!user || isLoading) return;

    apiGet<{ user: any; subscription?: any }>(`/api/auth/me?userId=${user.id}`)
      .then((data) => {
        if (data.user) {
          setUser(data.user);
          if (data.subscription) {
            setSubscription(data.subscription);
          }
        }
      })
      .catch(() => {
        // Session expired, stay with local data
      });

    apiGet<{ notifications: any[] }>(`/api/notifications?userId=${user.id}`)
      .then((data) => {
        if (data.notifications) {
          data.notifications.forEach((n: any) => {
            addNotification(n);
          });
        }
      })
      .catch(() => {});
  }, [user?.id]);

  // Redirect based on auth state
  useEffect(() => {
    if (isLoading) return;
    if (isAuthenticated && user) {
      if (currentView === 'landing' || currentView === 'login' || currentView === 'signup') {
        const view = user.role === 'ADMIN' ? 'admin-dashboard' : user.role === 'NANNY' ? 'nanny-dashboard' : 'parent-dashboard';
        setCurrentView(view);
      }
    } else if (!isAuthenticated) {
      if (currentView !== 'landing' && currentView !== 'login' && currentView !== 'signup' && currentView !== 'forgot-password' && currentView !== 'nanny-setup' && currentView !== 'pricing' && currentView !== 'terms' && currentView !== 'privacy' && currentView !== 'about' && currentView !== 'apply-nanny') {
        setCurrentView('landing');
      }
    }
  }, [isAuthenticated, user, isLoading, currentView, setCurrentView]);

  const handlePageChange = useCallback((page: string) => {
    setDashboardPage(page);
    // Scroll main content to top
    const mainEl = document.querySelector('main');
    if (mainEl) mainEl.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Socket.IO — single shared connection stored in app-store for reuse by VideoCallScreen etc.
  useEffect(() => {
    if (!isAuthenticated || !user?.id || !user?.role) return;

    let disconnected = false;

    const initSocket = async () => {
      try {
        const { io } = await import('socket.io-client');
        if (disconnected) return;

        // Fetch runtime config from server (env vars without NEXT_PUBLIC_ prefix)
        let socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || '';
        if (!socketUrl) {
          try {
            const cfg = await fetch('/api/config');
            if (cfg.ok) {
              const data = await cfg.json();
              socketUrl = data.socketUrl || '';
            }
          } catch {
            // fallback: empty string (development proxy)
          }
        }
        console.log('[Socket] Connecting to:', socketUrl || '(same origin - dev proxy)');
        const isCrossOrigin = socketUrl && socketUrl !== '' && !socketUrl.startsWith('/');
        const socket = io(socketUrl, {
          path: '/socket.io',
          transports: isCrossOrigin ? ['websocket', 'polling'] : ['polling', 'websocket'],
          upgrade: true,
          reconnection: true,
          reconnectionAttempts: 20,
          reconnectionDelay: 1000,
          reconnectionDelayMax: 5000,
          timeout: 20000,
          // Route to socket-service via gateway when Next.js rewrite is not available
          ...(socketUrl ? {} : { query: { XTransformPort: '3003' } }),
        });

        socket.on('connect', () => {
          console.log('[Socket] Connected:', socket.id);
          socket.emit('auth', { userId: user.id, role: user.role });
          useAppStore.getState().setSocketAuthenticated(true);
        });

        socket.on('connect_error', (err) => {
          console.error('[Socket] Connection error:', err.message);
          useAppStore.getState().setSocketAuthenticated(false);
        });

        socket.on('disconnect', (reason) => {
          console.warn('[Socket] Disconnected:', reason);
          useAppStore.getState().setSocketAuthenticated(false);
        });

        socket.on('incoming-call', (data: any) => {
          console.log('[Socket] Incoming call from:', data.callerName, data.callId);
          useAppStore.getState().setIncomingCall({
            callId: data.callId,
            callerId: data.callerId,
            callerName: data.callerName,
            callerAvatar: data.callerAvatar || null,
            type: data.callType || 'INSTANT',
            callRoomId: data.callRoomId || null,
          });
        });

        socket.on('call-accepted', (data: any) => {
          const store = useAppStore.getState();
          if (store.currentCall && store.currentCall.id === data.callId) {
            const otherName = user.role === 'PARENT'
              ? (store.currentCall.nannyName || 'Nanny')
              : (store.currentCall.parentName || 'Parent');
            // Only show toast — do NOT start WebRTC yet (wait for call-joined)
            toast.success(`${otherName} accepted!`, {
              description: 'Waiting for connection...',
            });
          }
        });

        // ─── CRITICAL: Parent starts WebRTC ONLY after call-joined ───
        // call-joined is emitted by nanny AFTER socket reconnects on mobile
        // This ensures the WebRTC offer doesn't get lost
        socket.on('call-joined', (data: any) => {
          const store = useAppStore.getState();
          if (store.currentCall && store.currentCall.id === data.callId) {
            const otherName = user.role === 'PARENT'
              ? (store.currentCall.nannyName || 'Nanny')
              : (store.currentCall.parentName || 'Parent');

            if (store.waitingForNanny) {
              store.setWaitingForNanny(false);
              toast.success(`${otherName} is ready!`, {
                description: 'Starting video call...',
              });
            }
          }
        });

        socket.on('call-rejected', (data: any) => {
          const store = useAppStore.getState();
          if (store.currentCall && store.currentCall.id === data.callId) {
            const otherName = user.role === 'PARENT'
              ? (store.currentCall.nannyName || 'Nanny')
              : (store.currentCall.parentName || 'Parent');
            store.setWaitingForNanny(false);
            store.endCall();
            toast.error(`${otherName} declined`, {
              description: 'The call was declined.',
            });
          }
        });

        socket.on('call-ended', (data: any) => {
          const store = useAppStore.getState();
          if (store.currentCall && (!data?.callId || store.currentCall.id === data.callId)) {
            store.endCall();
            toast.info('Call Ended', {
              description: 'The other person has ended the call.',
            });
          }
        });

        socket.on('new-notification', (data: any) => {
          addNotification(data.notification);
        });

        // Store in shared state so VideoCallScreen / IncomingCallDialog can reuse it
        useAppStore.getState().setSocket(socket);
      } catch {
        // Socket not available, continue without real-time features
      }
    };

    initSocket();

    return () => {
      disconnected = true;
      const storeSocket = useAppStore.getState().socket;
      if (storeSocket) {
        storeSocket.disconnect();
        useAppStore.getState().setSocket(null);
      }
    };
  }, [isAuthenticated, user?.id, user?.role]);

  if (!mounted) {
    return <LoadingScreen />;
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Video Call Overlay with Error Boundary - renders on top of everything */}
      <VideoCallErrorBoundary>
        {showVideoCall && <VideoCallScreen />}
      </VideoCallErrorBoundary>

      {/* Incoming Call Dialog */}
      <IncomingCallDialog call={incomingCall} />

      {/* Main Content */}
      {!showVideoCall && (
        <>
          {/* Public Pages */}
          {(!isAuthenticated || currentView === 'landing' || currentView === 'login' || currentView === 'signup' || currentView === 'forgot-password' || currentView === 'nanny-setup' || currentView === 'pricing' || currentView === 'terms' || currentView === 'privacy' || currentView === 'about' || currentView === 'apply-nanny') && (
            <div>
              {currentView === 'landing' && <LandingPage />}
              {currentView === 'login' && (
                <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-rose-50 via-white to-pink-50 px-4">
                  <LoginForm />
                </div>
              )}
              {currentView === 'signup' && (
                <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-rose-50 via-white to-pink-50 px-4 py-8">
                  <SignupForm />
                </div>
              )}
              {currentView === 'forgot-password' && (
                <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-rose-50 via-white to-pink-50 px-4">
                  <ForgotPasswordForm />
                </div>
              )}
              {currentView === 'pricing' && (
                <div className="min-h-screen bg-white">
                  <PricingPage />
                </div>
              )}
              {(currentView === 'terms' || currentView === 'privacy' || currentView === 'about') && (
                <LegalPages
                  page={currentView as 'terms' | 'privacy' | 'about'}
                  onBack={() => setCurrentView('landing')}
                />
              )}
              {currentView === 'apply-nanny' && <ApplyAsNanny />}
              {currentView === 'nanny-setup' && (
                <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-violet-50 via-white to-pink-50 px-4">
                  <NannySetup />
                </div>
              )}
            </div>
          )}

          {/* Dashboard */}
          {isAuthenticated && user && (
            <div className="h-screen">
              <DashboardLayout activePage={dashboardPage} onPageChange={handlePageChange}>
                {user.role === 'PARENT' && <ParentDashboardRouter activePage={dashboardPage} onNavigate={handlePageChange} />}
                {user.role === 'NANNY' && <NannyDashboardRouter activePage={dashboardPage} onNavigate={handlePageChange} />}
                {user.role === 'ADMIN' && <AdminDashboardRouter activePage={dashboardPage} onNavigate={handlePageChange} />}
              </DashboardLayout>
            </div>
          )}
        </>
      )}
    </div>
  );
}
