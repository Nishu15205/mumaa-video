'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Phone,
  Calendar,
  Star,
  CreditCard,
  ArrowRight,
  Video,
  Clock,
  TrendingUp,
  UserCheck,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { apiGet } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { CallSession, Subscription } from '@/types';
import { CALL_STATUS_LABELS } from '@/lib/constants';

interface ParentStats {
  totalCalls: number;
  upcomingSessions: number;
  favoriteNannies: number;
}

export default function ParentDashboard({ onNavigate }: { onNavigate?: (page: string) => void }) {
  const { user, subscription } = useAuthStore();
  const [stats, setStats] = useState<ParentStats>({ totalCalls: 0, upcomingSessions: 0, favoriteNannies: 0 });
  const [recentCalls, setRecentCalls] = useState<CallSession[]>([]);
  const [upcomingCalls, setUpcomingCalls] = useState<CallSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, [user?.id]);

  const fetchDashboardData = async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      const [callsRes] = await Promise.all([
        apiGet<{ calls: CallSession[] }>(`/api/calls?userId=${user.id}&limit=10`),
      ]);
      const callsData = callsRes.calls || [];
      setRecentCalls(callsData.slice(0, 5));
      setUpcomingCalls(callsData.filter((c: CallSession) => c.status === 'ACCEPTED' || c.status === 'PENDING'));
      setStats({
        totalCalls: callsData.filter((c: CallSession) => c.status === 'COMPLETED').length,
        upcomingSessions: callsData.filter((c: CallSession) => c.status === 'ACCEPTED' || c.status === 'PENDING').length,
        favoriteNannies: 3,
      });
    } catch {
      // Dashboard will show empty state
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name: string) => name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'bg-emerald-100 text-emerald-700';
      case 'ACTIVE': return 'bg-rose-100 text-rose-700';
      case 'ACCEPTED': case 'PENDING': return 'bg-amber-100 text-amber-700';
      case 'CANCELLED': return 'bg-gray-100 text-gray-600';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const formatDuration = (seconds: number) => {
    if (!seconds) return '--';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const statCards = [
    {
      label: 'Total Calls',
      value: stats.totalCalls,
      icon: <Phone className="h-5 w-5" />,
      trend: '+12%',
      color: 'from-rose-50 to-pink-50',
      iconColor: 'text-rose-500',
      border: 'border-rose-100',
    },
    {
      label: 'Upcoming Sessions',
      value: stats.upcomingSessions,
      icon: <Calendar className="h-5 w-5" />,
      trend: null,
      color: 'from-amber-50 to-orange-50',
      iconColor: 'text-amber-500',
      border: 'border-amber-100',
    },
    {
      label: 'Favorite Nannies',
      value: stats.favoriteNannies,
      icon: <Star className="h-5 w-5" />,
      trend: null,
      color: 'from-emerald-50 to-teal-50',
      iconColor: 'text-emerald-500',
      border: 'border-emerald-100',
    },
    {
      label: 'Subscription',
      value: subscription?.plan || 'Free',
      icon: <CreditCard className="h-5 w-5" />,
      trend: subscription?.status === 'ACTIVE' ? 'Active' : 'Expired',
      color: 'from-purple-50 to-violet-50',
      iconColor: 'text-purple-500',
      border: 'border-purple-100',
    },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-48 mb-1" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {user?.name?.split(' ')[0]} 👋
        </h1>
        <p className="text-gray-500 mt-1">Here&apos;s what&apos;s happening with your nanny calls today.</p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.08 }}
          >
            <Card className={cn('border-0 shadow-sm bg-gradient-to-br', card.color, 'rounded-xl')}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-gray-500 font-medium">{card.label}</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {card.label === 'Subscription' ? card.value : card.value}
                    </p>
                  </div>
                  <div className={cn('p-2.5 rounded-lg bg-white/70', card.iconColor)}>
                    {card.icon}
                  </div>
                </div>
                {card.trend && (
                  <div className="flex items-center gap-1 mt-2">
                    <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                    <span className="text-xs text-emerald-600 font-medium">{card.trend} this month</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3">
        <Button
          onClick={() => onNavigate?.('find')}
          className="bg-rose-500 hover:bg-rose-600 text-white gap-2"
        >
          <UserCheck className="h-4 w-4" />
          Find a Nanny Now
        </Button>
        <Button
          variant="outline"
          onClick={() => onNavigate?.('schedule')}
          className="border-rose-200 text-rose-600 hover:bg-rose-50 gap-2"
        >
          <Calendar className="h-4 w-4" />
          Schedule a Call
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Calls */}
        <div className="lg:col-span-2">
          <Card className="rounded-xl border-gray-200 shadow-sm">
            <div className="px-6 py-4 flex items-center justify-between border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Recent Calls</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onNavigate?.('calls')}
                className="text-rose-500 hover:text-rose-600 text-sm gap-1"
              >
                View all <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>
            <div className="p-4">
              {recentCalls.length === 0 ? (
                <div className="text-center py-8">
                  <Phone className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">No calls yet</p>
                  <Button
                    variant="link"
                    onClick={() => onNavigate?.('find')}
                    className="text-rose-500 mt-1"
                  >
                    Find a nanny to get started
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentCalls.map((call) => (
                    <div
                      key={call.id}
                      className="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <Avatar className="h-10 w-10 shrink-0">
                        <AvatarFallback className="bg-emerald-100 text-emerald-700 text-sm">
                          {call.nannyName ? getInitials(call.nannyName) : '??'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {call.nannyName || 'Unknown Nanny'}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Clock className="h-3 w-3 text-gray-400" />
                          <span className="text-xs text-gray-500">
                            {formatDate(call.createdAt)}
                          </span>
                          {call.duration > 0 && (
                            <>
                              <span className="text-gray-300">·</span>
                              <span className="text-xs text-gray-500">{formatDuration(call.duration)}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className={cn('text-[11px]', getStatusBadge(call.status))}>
                          {CALL_STATUS_LABELS[call.status] || call.status}
                        </Badge>
                        {call.price > 0 && (
                          <span className="text-sm font-semibold text-gray-700">₹{call.price.toFixed(0)}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Upcoming Calls */}
        <div>
          <Card className="rounded-xl border-gray-200 shadow-sm">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Upcoming Calls</h2>
            </div>
            <div className="p-4">
              {upcomingCalls.length === 0 ? (
                <div className="text-center py-6">
                  <Calendar className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">No upcoming calls</p>
                  <Button
                    variant="link"
                    onClick={() => onNavigate?.('schedule')}
                    className="text-rose-500 mt-1"
                  >
                    Schedule one now
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {upcomingCalls.map((call) => (
                    <div
                      key={call.id}
                      className="p-3 rounded-lg border border-amber-100 bg-amber-50/50"
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-emerald-100 text-emerald-700 text-xs">
                            {call.nannyName ? getInitials(call.nannyName) : '??'}
                          </AvatarFallback>
                        </Avatar>
                        <p className="text-sm font-medium text-gray-900">{call.nannyName}</p>
                      </div>
                      {call.scheduledAt && (
                        <div className="flex items-center gap-1.5 text-xs text-amber-700">
                          <Clock className="h-3 w-3" />
                          {new Date(call.scheduledAt).toLocaleString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      )}
                      {call.type === 'INSTANT' && (
                        <Badge variant="secondary" className="mt-2 text-[10px] bg-rose-100 text-rose-600">
                          Instant Call
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
