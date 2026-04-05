'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Phone,
  Star,
  DollarSign,
  TrendingUp,
  Calendar,
  ToggleRight,
  ToggleLeft,
  Clock,
  BarChart3,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { apiGet, apiPut } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import type { NannyProfile, CallSession } from '@/types';
import { CALL_STATUS_LABELS } from '@/lib/constants';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

export default function NannyDashboard({ onNavigate }: { onNavigate?: (page: string) => void }) {
  const { user } = useAuthStore();
  const [profile, setProfile] = useState<NannyProfile | null>(null);
  const [recentCalls, setRecentCalls] = useState<CallSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [earningsData, setEarningsData] = useState<{ day: string; earnings: number }[]>([]);

  useEffect(() => {
    fetchData();
  }, [user?.id]);

  const fetchData = async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      const [profileRes, callsRes] = await Promise.all([
        apiGet<{ nanny: NannyProfile; reviews: unknown[] }>(`/api/nannies/${user.id}`),
        apiGet<{ calls: CallSession[] }>(`/api/calls?userId=${user.id}&limit=10`),
      ]);
      setProfile(profileRes.nanny);
      setRecentCalls((callsRes.calls || []).slice(0, 5));

      // Build weekly earnings from actual completed calls (last 7 days)
      const allCalls = callsRes.calls || [];
      const completedCalls = allCalls.filter((c) => c.status === 'COMPLETED');
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const weeklyData: { day: string; earnings: number }[] = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dayStr = date.toISOString().split('T')[0];
        const dayLabel = days[date.getDay()];
        const dayEarnings = completedCalls
          .filter((c) => c.endedAt && c.endedAt.startsWith(dayStr))
          .reduce((sum, c) => sum + (c.price || 0), 0);
        weeklyData.push({ day: dayLabel, earnings: Math.round(dayEarnings) });
      }
      setEarningsData(weeklyData);
    } catch {
      // empty
    } finally {
      setLoading(false);
    }
  };

  const toggleAvailability = async () => {
    if (!user?.id) return;
    try {
      setToggling(true);
      await apiPut('/api/nannies/availability', {
        userId: user.id,
        isAvailable: !profile?.isAvailable,
      });
      setProfile((prev) => prev ? { ...prev, isAvailable: !prev.isAvailable } : prev);
    } catch {
      // empty
    } finally {
      setToggling(false);
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

  const todayCalls = recentCalls.filter((c) => {
    const today = new Date().toDateString();
    return new Date(c.createdAt).toDateString() === today;
  }).length;

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-48 mb-1" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  const statCards = [
    {
      label: "Today's Sessions",
      value: todayCalls,
      icon: <Phone className="h-5 w-5" />,
      color: 'from-rose-50 to-pink-50',
      iconColor: 'text-rose-500',
      border: 'border-rose-100',
    },
    {
      label: 'Total Earnings',
      value: `₹${profile?.totalEarnings?.toLocaleString('en-IN') || '0'}`,
      icon: <DollarSign className="h-5 w-5" />,
      trend: '+18%',
      color: 'from-emerald-50 to-teal-50',
      iconColor: 'text-emerald-500',
      border: 'border-emerald-100',
    },
    {
      label: 'Average Rating',
      value: profile?.rating?.toFixed(1) || '0.0',
      icon: <Star className="h-5 w-5" />,
      color: 'from-amber-50 to-orange-50',
      iconColor: 'text-amber-500',
      border: 'border-amber-100',
    },
    {
      label: 'Total Reviews',
      value: profile?.totalSessions || 0,
      icon: <BarChart3 className="h-5 w-5" />,
      color: 'from-purple-50 to-violet-50',
      iconColor: 'text-purple-500',
      border: 'border-purple-100',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome back, {user?.name?.split(' ')[0]} 👋
          </h1>
          <p className="text-gray-500 mt-1">Here&apos;s your nanny dashboard overview</p>
        </div>
      </div>

      {/* Availability Toggle */}
      <Card className={cn(
        'rounded-xl border shadow-sm p-4',
        profile?.isAvailable ? 'border-emerald-200 bg-emerald-50/50' : 'border-gray-200 bg-gray-50'
      )}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {profile?.isAvailable ? (
              <ToggleRight className="h-8 w-8 text-emerald-500" />
            ) : (
              <ToggleLeft className="h-8 w-8 text-gray-400" />
            )}
            <div>
              <p className="font-semibold text-gray-900">
                {profile?.isAvailable ? 'You are Available' : 'You are Unavailable'}
              </p>
              <p className="text-sm text-gray-500">
                {profile?.isAvailable
                  ? 'Parents can see you and call you'
                  : 'Toggle on to start receiving calls'}
              </p>
            </div>
          </div>
          <Switch
            checked={profile?.isAvailable || false}
            onCheckedChange={toggleAvailability}
            disabled={toggling}
            className="data-[state=checked]:bg-emerald-500"
          />
        </div>
      </Card>

      {/* Stats */}
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
                    <p className="text-2xl font-bold text-gray-900 mt-1">{card.value}</p>
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Earnings Chart */}
        <div className="lg:col-span-2">
          <Card className="rounded-xl border-gray-200 shadow-sm">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Weekly Earnings</h2>
            </div>
            <CardContent className="p-4">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={earningsData} barSize={32}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9ca3af' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9ca3af' }} tickFormatter={(v) => `₹${v}`} />
                    <Tooltip
                      contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
                      formatter={(value: number) => [`₹${value}`, 'Earnings']}
                    />
                    <Bar dataKey="earnings" fill="#f43f5e" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Calls */}
        <div>
          <Card className="rounded-xl border-gray-200 shadow-sm">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">Recent Calls</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onNavigate?.('calls')}
                className="text-rose-500 hover:text-rose-600 text-xs"
              >
                View all
              </Button>
            </div>
            <div className="p-3">
              {recentCalls.length === 0 ? (
                <div className="text-center py-6">
                  <Phone className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-xs text-gray-500">No calls yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {recentCalls.map((call) => (
                    <div key={call.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-50">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-rose-100 text-rose-700 text-xs">
                          {call.parentName ? getInitials(call.parentName) : '??'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-900 truncate">{call.parentName}</p>
                        <p className="text-[10px] text-gray-400">
                          {new Date(call.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        </p>
                      </div>
                      <Badge variant="secondary" className={cn('text-[10px]', getStatusBadge(call.status))}>
                        {CALL_STATUS_LABELS[call.status] || call.status}
                      </Badge>
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
