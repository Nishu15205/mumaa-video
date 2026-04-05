'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Phone,
  Clock,
  Star,
  Calendar,
  Video,
  MessageSquare,
  ChevronDown,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { useAppStore } from '@/stores/app-store';
import { apiGet } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import ReviewDialog from '@/components/dashboard/ReviewDialog';
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

export default function MyCalls({ onReview }: { onReview?: (call: CallSession) => void }) {
  const { user } = useAuthStore();
  const { startCall } = useAppStore();
  const [allCalls, setAllCalls] = useState<CallSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [visibleCount, setVisibleCount] = useState(10);
  const [reviewCall, setReviewCall] = useState<CallSession | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);

  useEffect(() => {
    fetchCalls();
  }, [user?.id]);

  const fetchCalls = async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      const res = await apiGet<{ calls: any[] }>(`/api/calls?userId=${user.id}&limit=100`);
      // Flatten nested API data into flat CallSession objects
      const flatCalls = (res.calls || []).map(flattenCall);
      setAllCalls(flatCalls.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    } catch {
      // empty
    } finally {
      setLoading(false);
    }
  };

  const filteredCalls = allCalls.filter((call) => {
    switch (activeTab) {
      case 'completed': return call.status === 'COMPLETED';
      case 'upcoming': return call.status === 'ACCEPTED' || call.status === 'PENDING';
      case 'cancelled': return call.status === 'CANCELLED';
      default: return true;
    }
  });

  const visibleCalls = filteredCalls.slice(0, visibleCount);

  const getInitials = (name: string) => name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'bg-emerald-100 text-emerald-700';
      case 'ACTIVE': return 'bg-rose-100 text-rose-700';
      case 'ACCEPTED': case 'PENDING': return 'bg-amber-100 text-amber-700';
      case 'CANCELLED': return 'bg-gray-100 text-gray-600';
      case 'NO_SHOW': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  const formatDuration = (seconds: number) => {
    if (!seconds) return '--';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('en-IN', {
      hour: '2-digit', minute: '2-digit',
    });
  };

  const renderCallCard = (call: CallSession, index: number) => (
    <motion.div
      key={call.id}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
    >
      <Card className="rounded-xl border-gray-200 shadow-sm hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            {/* Avatar */}
            <Avatar className="h-12 w-12 shrink-0">
              <AvatarFallback className="bg-emerald-100 text-emerald-700 text-sm font-semibold">
                {call.nannyName ? getInitials(call.nannyName) : '??'}
              </AvatarFallback>
            </Avatar>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">{call.nannyName || 'Unknown Nanny'}</h3>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="flex items-center gap-1 text-xs text-gray-500">
                      <Calendar className="h-3 w-3" />
                      {formatDate(call.createdAt)}
                    </span>
                    <span className="text-gray-300">·</span>
                    <span className="flex items-center gap-1 text-xs text-gray-500">
                      <Clock className="h-3 w-3" />
                      {formatTime(call.createdAt)}
                    </span>
                    {call.duration > 0 && (
                      <>
                        <span className="text-gray-300">·</span>
                        <span className="text-xs text-gray-500">{formatDuration(call.duration)}</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Badge
                    variant="secondary"
                    className={cn('text-[11px] font-medium', getStatusBadge(call.status))}
                  >
                    {CALL_STATUS_LABELS[call.status] || call.status}
                  </Badge>
                  <Badge variant="outline" className="text-[11px] border-gray-200 text-gray-500">
                    {call.type}
                  </Badge>
                </div>
              </div>

              {/* Bottom row */}
              <div className="flex items-center justify-between mt-3">
                <div className="flex items-center gap-2">
                  {call.price > 0 && (
                    <span className="text-sm font-bold text-gray-700">₹{call.price.toFixed(0)}</span>
                  )}
                  {call.rating && (
                    <span className="flex items-center gap-0.5 text-xs text-amber-500">
                      <Star className="h-3 w-3 fill-amber-400" />
                      {call.rating}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {/* Join Call for active calls */}
                  {call.status === 'ACTIVE' && (
                    <Button
                      size="sm"
                      onClick={() => startCall(call)}
                      className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs gap-1 h-7"
                    >
                      <Video className="h-3 w-3" />
                      Join
                    </Button>
                  )}
                  {/* Review for completed calls without review */}
                  {call.status === 'COMPLETED' && !call.rating && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setReviewCall(call);
                        setReviewOpen(true);
                      }}
                      className="border-amber-200 text-amber-600 hover:bg-amber-50 text-xs gap-1 h-7"
                    >
                      <MessageSquare className="h-3 w-3" />
                      Review
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );

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

  const tabCounts = {
    all: allCalls.length,
    completed: allCalls.filter((c) => c.status === 'COMPLETED').length,
    upcoming: allCalls.filter((c) => c.status === 'ACCEPTED' || c.status === 'PENDING').length,
    cancelled: allCalls.filter((c) => c.status === 'CANCELLED').length,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Calls</h1>
        <p className="text-gray-500 mt-1">View and manage all your video call sessions</p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-gray-100">
          <TabsTrigger value="all" className="text-sm">
            All <span className="ml-1.5 text-xs text-gray-400">({tabCounts.all})</span>
          </TabsTrigger>
          <TabsTrigger value="completed" className="text-sm">
            Completed <span className="ml-1.5 text-xs text-gray-400">({tabCounts.completed})</span>
          </TabsTrigger>
          <TabsTrigger value="upcoming" className="text-sm">
            Upcoming <span className="ml-1.5 text-xs text-gray-400">({tabCounts.upcoming})</span>
          </TabsTrigger>
          <TabsTrigger value="cancelled" className="text-sm">
            Cancelled <span className="ml-1.5 text-xs text-gray-400">({tabCounts.cancelled})</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {visibleCalls.length === 0 ? (
            <Card className="rounded-xl border-gray-200 shadow-sm">
              <CardContent className="py-12 text-center">
                <Phone className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                <h3 className="text-sm font-medium text-gray-900 mb-1">
                  No {activeTab !== 'all' ? activeTab : ''} calls found
                </h3>
                <p className="text-xs text-gray-500">
                  {activeTab === 'all' && "You haven't made any calls yet"}
                  {activeTab === 'completed' && "No completed calls yet"}
                  {activeTab === 'upcoming' && "No upcoming calls scheduled"}
                  {activeTab === 'cancelled' && "No cancelled calls"}
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="space-y-3">
                {visibleCalls.map((call, index) => renderCallCard(call, index))}
              </div>
              {visibleCount < filteredCalls.length && (
                <div className="text-center mt-4">
                  <Button
                    variant="outline"
                    onClick={() => setVisibleCount((prev) => prev + 10)}
                    className="text-sm"
                  >
                    Load More ({filteredCalls.length - visibleCount} remaining)
                  </Button>
                </div>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>
      {/* Review Dialog */}
      <ReviewDialog
        open={reviewOpen}
        onOpenChange={setReviewOpen}
        call={reviewCall}
        onSuccess={() => fetchCalls()}
      />
    </div>
  );
}
