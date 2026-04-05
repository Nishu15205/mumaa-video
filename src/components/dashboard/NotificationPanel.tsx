'use client';

import { useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  Phone,
  Calendar,
  CheckCircle,
  CreditCard,
  Info,
  CheckCheck,
  BellOff,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { useNotificationStore } from '@/stores/notification-store';
import { apiGet, apiPut } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import type { AppNotification, NotificationType } from '@/types';

function getNotificationIcon(type: NotificationType) {
  switch (type) {
    case 'CALL_REQUEST':
      return <Phone className="h-4 w-4 text-rose-500" />;
    case 'CALL_SCHEDULED':
      return <Calendar className="h-4 w-4 text-amber-500" />;
    case 'CALL_COMPLETED':
      return <CheckCircle className="h-4 w-4 text-emerald-500" />;
    case 'SUBSCRIPTION':
      return <CreditCard className="h-4 w-4 text-purple-500" />;
    case 'SYSTEM':
    default:
      return <Info className="h-4 w-4 text-gray-400" />;
  }
}

function getNotificationBg(type: NotificationType, isRead: boolean) {
  if (isRead) return 'bg-gray-50';
  switch (type) {
    case 'CALL_REQUEST':
      return 'bg-rose-50';
    case 'CALL_SCHEDULED':
      return 'bg-amber-50';
    case 'CALL_COMPLETED':
      return 'bg-emerald-50';
    case 'SUBSCRIPTION':
      return 'bg-purple-50';
    default:
      return 'bg-gray-100';
  }
}

function getTimeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) return 'Just now';
  if (diffMin < 60) return `${diffMin} min ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
  });
}

export default function NotificationPanel() {
  const { user } = useAuthStore();
  const {
    notifications,
    unreadCount,
    isOpen,
    setOpen,
    markAsRead,
    markAllAsRead,
    setNotifications,
  } = useNotificationStore();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchNotifications = useCallback(async () => {
    if (!user?.id) return;
    try {
      const res = await apiGet<{ notifications: AppNotification[]; unreadCount: number }>(
        `/api/notifications?userId=${user.id}`
      );
      setNotifications(res.notifications || []);
    } catch {
      // silent fail for background refresh
    }
  }, [user, setNotifications]);

  // Fetch on first open and set up 30s interval
  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen, fetchNotifications]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(fetchNotifications, 30000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchNotifications]);

  const handleMarkAllRead = async () => {
    if (!user?.id) return;
    try {
      await apiPut('/api/notifications/read-all', { userId: user.id });
      markAllAsRead();
    } catch {
      // silent
    }
  };

  const handleMarkOneRead = async (notification: AppNotification) => {
    if (notification.isRead) return;
    try {
      await apiPut(`/api/notifications/${notification.id}/read`);
      markAsRead(notification.id);
    } catch {
      // silent
    }
  };

  return (
    <>
      {/* Trigger Button */}
      <Button
        variant="ghost"
        size="icon"
        className="relative h-9 w-9"
        onClick={() => setOpen(!isOpen)}
      >
        <Bell className="h-5 w-5 text-gray-500" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-5 w-5 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </Button>

      {/* Dropdown Panel */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop to close on outside click */}
            <div
              className="fixed inset-0 z-[60]"
              onClick={() => setOpen(false)}
            />

            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-200 z-[70] overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <Bell className="h-4 w-4 text-rose-500" />
                  <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
                  {unreadCount > 0 && (
                    <Badge className="bg-rose-100 text-rose-700 text-[10px] px-1.5 py-0 h-5 font-medium">
                      {unreadCount} new
                    </Badge>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-xs text-rose-500 hover:text-rose-600 font-medium flex items-center gap-1 transition-colors"
                  >
                    <CheckCheck className="h-3.5 w-3.5" />
                    Mark all read
                  </button>
                )}
              </div>

              {/* Notification list */}
              <ScrollArea className="max-h-80">
                {notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 px-4">
                    <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                      <BellOff className="h-6 w-6 text-gray-300" />
                    </div>
                    <p className="text-sm font-medium text-gray-500">No notifications yet</p>
                    <p className="text-xs text-gray-400 mt-1">
                      We&apos;ll let you know when something arrives
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {notifications.map((notification) => (
                      <button
                        key={notification.id}
                        onClick={() => handleMarkOneRead(notification)}
                        className={cn(
                          'w-full text-left px-4 py-3 transition-colors hover:bg-gray-50/80',
                          !notification.isRead && 'border-l-[3px] border-l-rose-400 bg-rose-50/40',
                          notification.isRead && 'opacity-70'
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 shrink-0">
                            {getNotificationIcon(notification.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p
                              className={cn(
                                'text-sm leading-snug',
                                !notification.isRead
                                  ? 'font-semibold text-gray-900'
                                  : 'text-gray-600'
                              )}
                            >
                              {notification.title}
                            </p>
                            <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                              {notification.message}
                            </p>
                            <p className="text-[11px] text-gray-400 mt-1">
                              {getTimeAgo(notification.createdAt)}
                            </p>
                          </div>
                          {!notification.isRead && (
                            <span className="h-2 w-2 rounded-full bg-rose-500 mt-2 shrink-0" />
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </ScrollArea>

              {/* Footer */}
              {notifications.length > 0 && (
                <>
                  <Separator />
                  <div className="px-4 py-2 bg-gray-50">
                    <button
                      onClick={() => {
                        setOpen(false);
                      }}
                      className="text-xs text-gray-500 hover:text-gray-700 text-center w-full block font-medium transition-colors"
                    >
                      Close
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
