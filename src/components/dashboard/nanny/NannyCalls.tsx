'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Phone,
  PhoneOff,
  Clock,
  Calendar,
  Video,
  DollarSign,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { useAppStore } from '@/stores/app-store';
import { apiGet, apiPut } from '@/lib/api';
import { playNotificationBeep } from '@/lib/ringtone';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { CallSession } from '@/types';
import { CALL_STATUS_LABELS } from '@/lib/constants';

/**
 * Safely flatten a nested call from the API into a flat CallSession.
 * API returns: { parent: { name, avatar }, nanny: { name, avatar }, ... }
 * We need:     { parentName, parentAvatar, nannyName, nannyAvatar, ... }
 */
function flattenCall(raw: any): CallSession {
  return {
    id: raw.id,
    parentId: raw.parentId,
    nannyId: raw.nannyId,
    parentName: raw.parent?.name || raw.parentName || 'Parent',
    nannyName: raw.nanny?.name || raw.nannyName || 'Nanny',
    parentAvatar: raw.parent?.avatar || raw.parentAvatar || null,
    nannyAvatar: raw.nanny?.avatar || raw.nannyAvatar || null,
    type: raw.type,
    status: raw.status,
    scheduledAt: raw.scheduledAt,
    startedAt: raw.startedAt,
    endedAt: raw.endedAt,
    duration: raw.duration || 0,
    price: raw.price || 0,
    notes: raw.notes,
    callRoomId: raw.callRoomId,
    rating: raw.rating,
    reviewComment: raw.reviewComment,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

export default function NannyCalls() {
  const { user } = useAuthStore();
  const { startCall, setWaitingForNanny } = useAppStore();
  const [allCalls, setAllCalls] = useState<CallSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('incoming');
  const [visibleCount, setVisibleCount] = useState(10);
  const prevIncomingCountRef = useRef(0);

  const fetchCalls = useCallback(async () => {
    if (!user?.id) return;
    try {
      const res = await apiGet<{ calls: any[] }>(`/api/calls?userId=${user.id}&limit=100`);
      // Flatten nested API data into flat CallSession objects
      const flatCalls = (res.calls || []).map(flattenCall);
      setAllCalls(flatCalls.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    } catch (err) {
      console.error('Failed to fetch calls:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Fetch calls on mount and auto-refresh every 5 seconds to catch incoming calls
  useEffect(() => {
    setLoading(true);
    fetchCalls();
    const interval = setInterval(fetchCalls, 5000);
    return () => clearInterval(interval);
  }, [fetchCalls]);

  const incomingCalls = allCalls.filter((c) => c.status === 'PENDING' && c.type === 'INSTANT');
  const scheduledCalls = allCalls.filter(
    (c) => c.type === 'SCHEDULED' && (c.status === 'ACCEPTED' || c.status === 'PENDING')
  );
  const completedCalls = allCalls.filter((c) => c.status === 'COMPLETED');

  // Show toast and play sound when a new incoming call appears via polling
  useEffect(() => {
    if (incomingCalls.length > prevIncomingCountRef.current && prevIncomingCountRef.current >= 0) {
      const newCall = incomingCalls[0];
      playNotificationBeep();
      toast('📞 Incoming Call!', {
        description: `${newCall.parentName} wants to connect`,
        duration: 8000,
      });
      setActiveTab('incoming');
    }
    prevIncomingCountRef.current = incomingCalls.length;
  }, [incomingCalls.length]);

  const handleAccept = async (call: CallSession) => {
    try {
      await apiPut(`/api/calls/${call.id}/status`, { status: 'ACCEPTED' });

      // CRITICAL: Nanny must NEVER be in waiting state.
      // Ensure waitingForNanny is false BEFORE starting the call.
      setWaitingForNanny(false);

      // Notify parent via the shared socket (already connected & authenticated!)
      const sharedSocket = useAppStore.getState().socket
      if (sharedSocket?.connected) {
        sharedSocket.emit('call-accepted', {
          callId: call.id,
          toUserId: call.parentId,
          roomName: call.callRoomId || null,
        })
      }

      toast.success('Call accepted! Joining video call...');
      fetchCalls();

      // Auto-join the video call after accepting
      setTimeout(() => {
        // Emit call-joined so parent knows nanny is ready for WebRTC
        const sock = useAppStore.getState().socket
        if (sock?.connected) {
          sock.emit('call-joined', {
            callId: call.id,
            toUserId: call.parentId,
          })
        }
        startCall(call);
      }, 800);
    } catch {
      toast.error('Failed to accept call');
    }
  };

  const handleJoinCall = (call: CallSession) => {
    // Nanny must never be in waiting state
    setWaitingForNanny(false);

    // Emit call-joined so parent knows nanny is ready for WebRTC
    const sock = useAppStore.getState().socket
    if (sock?.connected) {
      sock.emit('call-joined', {
        callId: call.id,
        toUserId: call.parentId,
      })
    }

    startCall(call);
  };

  const handleDecline = async (call: CallSession) => {
    try {
      await apiPut(`/api/calls/${call.id}/status`, { status: 'CANCELLED' });

      // Notify parent via the shared socket
      const sharedSocket = useAppStore.getState().socket
      if (sharedSocket?.connected) {
        sharedSocket.emit('call-rejected', {
          callId: call.id,
          toUserId: call.parentId,
        })
      }

      toast.info('Call declined');
      fetchCalls();
    } catch {
      toast.error('Failed to decline call');
    }
  };

  const getInitials = (name: string) => name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'bg-emerald-100 text-emerald-700';
      case 'ACTIVE': return 'bg-rose-100 text-rose-700';
      case 'ACCEPTED': return 'bg-emerald-100 text-emerald-700';
      case 'PENDING': return 'bg-amber-100 text-amber-700';
      case 'CANCELLED': return 'bg-gray-100 text-gray-600';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  const formatDuration = (seconds: number) => {
    if (!seconds) return '--';
    const mins = Math.floor(seconds / 60);
    return `${mins}m`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-36" />
        <div className="flex gap-2">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-10 w-24" />)}
        </div>
        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
      </div>
    );
  }

  const renderIncomingCall = (call: CallSession) => (
    <motion.div
      key={call.id}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="border-2 border-rose-200 rounded-xl p-5 bg-gradient-to-br from-rose-50 to-pink-50"
    >
      <div className="flex items-center gap-4 mb-4">
        {/* Ringing animation */}
        <div className="relative">
          <Avatar className="h-14 w-14">
            <AvatarFallback className="bg-rose-100 text-rose-700 text-lg font-bold">
              {call.parentName ? getInitials(call.parentName) : '??'}
            </AvatarFallback>
          </Avatar>
          <span className="absolute inset-0 rounded-full border-2 border-rose-400 animate-ping opacity-30" />
          <span className="absolute inset-0 rounded-full border-2 border-rose-400 animate-pulse" />
        </div>
        <div>
          <p className="font-semibold text-gray-900 text-lg">{call.parentName}</p>
          <p className="text-sm text-rose-600 font-medium flex items-center gap-1.5">
            <Phone className="h-4 w-4" />
            Wants to connect now
          </p>
        </div>
      </div>
      <div className="flex gap-3">
        <Button
          onClick={() => handleAccept(call)}
          className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white h-11 gap-2"
        >
          <Phone className="h-5 w-5" />
          Accept
        </Button>
        <Button
          onClick={() => handleDecline(call)}
          variant="outline"
          className="flex-1 border-red-200 text-red-600 hover:bg-red-50 h-11 gap-2"
        >
          <PhoneOff className="h-5 w-5" />
          Decline
        </Button>
      </div>
    </motion.div>
  );

  const renderCallCard = (call: CallSession, index: number) => (
    <motion.div
      key={call.id}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
    >
      <Card className="rounded-xl border-gray-200 shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-rose-100 text-rose-700 text-sm">
                {call.parentName ? getInitials(call.parentName) : '??'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900">{call.parentName}</p>
              <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500">
                <Calendar className="h-3 w-3" />
                {formatDate(call.createdAt)}
                {call.duration > 0 && (
                  <>
                    <span className="text-gray-300">·</span>
                    <Clock className="h-3 w-3" />
                    {formatDuration(call.duration)}
                  </>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {call.price > 0 && (
                <span className="text-sm font-bold text-gray-700">₹{call.price.toFixed(0)}</span>
              )}
              <Badge variant="secondary" className={cn('text-[11px]', getStatusBadge(call.status))}>
                {CALL_STATUS_LABELS[call.status] || call.status}
              </Badge>
              {call.status === 'ACCEPTED' && (
                <Button
                  size="sm"
                  onClick={() => handleJoinCall(call)}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs gap-1 h-7"
                >
                  <Video className="h-3 w-3" />
                  Join
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Calls</h1>
        <p className="text-gray-500 mt-1">Manage incoming requests and your call history</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-gray-100">
          <TabsTrigger value="incoming" className="text-sm">
            Incoming
            {incomingCalls.length > 0 && (
              <span className="ml-1.5 bg-rose-500 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5">
                {incomingCalls.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="scheduled" className="text-sm">
            Scheduled
          </TabsTrigger>
          <TabsTrigger value="completed" className="text-sm">
            Completed
          </TabsTrigger>
          <TabsTrigger value="all" className="text-sm">
            All
          </TabsTrigger>
        </TabsList>

        <TabsContent value="incoming" className="mt-4">
          {incomingCalls.length === 0 ? (
            <Card className="rounded-xl border-gray-200 shadow-sm">
              <CardContent className="py-12 text-center">
                <Phone className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500">No incoming calls right now</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {incomingCalls.map(renderIncomingCall)}
            </div>
          )}
        </TabsContent>

        <TabsContent value="scheduled" className="mt-4">
          {scheduledCalls.length === 0 ? (
            <Card className="rounded-xl border-gray-200 shadow-sm">
              <CardContent className="py-12 text-center">
                <Calendar className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500">No scheduled calls</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {scheduledCalls.map((call, i) => renderCallCard(call, i))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="completed" className="mt-4">
          {completedCalls.length === 0 ? (
            <Card className="rounded-xl border-gray-200 shadow-sm">
              <CardContent className="py-12 text-center">
                <Phone className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500">No completed calls yet</p>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="space-y-3">
                {completedCalls.slice(0, visibleCount).map((call, i) => renderCallCard(call, i))}
              </div>
              {visibleCount < completedCalls.length && (
                <div className="text-center mt-4">
                  <Button
                    variant="outline"
                    onClick={() => setVisibleCount((p) => p + 10)}
                    className="text-sm"
                  >
                    Load More
                  </Button>
                </div>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="all" className="mt-4">
          {allCalls.length === 0 ? (
            <Card className="rounded-xl border-gray-200 shadow-sm">
              <CardContent className="py-12 text-center">
                <Phone className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500">No calls yet</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {allCalls.slice(0, visibleCount).map((call, i) => renderCallCard(call, i))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
