'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  CreditCard,
  Phone,
  DollarSign,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Star,
  Clock,
  BarChart3,
  Download,
} from 'lucide-react';
import { apiGet } from '@/lib/api';
import { exportToCsv } from '@/lib/export-csv';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

interface AnalyticsData {
  overview: {
    totalUsers: number;
    parentCount: number;
    nannyCount: number;
    activeSubscriptions: number;
    freeSubscriptions: number;
    basicSubscriptions: number;
    proSubscriptions: number;
    totalRevenue: number;
    revenueThisMonth: number;
    revenueLastMonth: number;
    revenueGrowth: number;
    userGrowth: number;
    conversionRate: number;
    avgCallDuration: number;
    avgRating: number;
    callsThisMonth: number;
    retentionRate: number;
  };
  callStats: {
    total: number;
    completed: number;
    cancelled: number;
    active: number;
    pending: number;
    noShow: number;
  };
  subscriptionDistribution: { name: string; value: number; color: string }[];
  callDistribution: { name: string; value: number; color: string }[];
  userGrowthData: { period: string; parents: number; nannies: number; total: number }[];
  revenueData: { period: string; revenue: number }[];
  callVolumeData: { period: string; completed: number; cancelled: number; total: number }[];
  busiestHours: { hour: string; calls: number }[];
  topNannies: { id: string; name: string; email: string; rating: number; sessions: number; earnings: number; experience: number }[];
  recentActivity: { type: string; userName: string; role: string; timestamp: string }[];
}

const COLORS = {
  rose: '#f43f5e',
  emerald: '#10b981',
  amber: '#f59e0b',
  blue: '#3b82f6',
  purple: '#8b5cf6',
  gray: '#9ca3af',
};

export default function AdminDashboard({ onNavigate }: { onNavigate?: (page: string) => void }) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiGet<AnalyticsData>('/api/admin/analytics?period=monthly');
      setData(res);
    } catch {
      setError('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) =>
    `₹${Math.round(amount).toLocaleString('en-IN')}`;

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  const handleExport = () => {
    if (!data) return;
    const rows = [
      ...data.topNannies.map((n) => ({
        Name: n.name,
        Email: n.email,
        Rating: n.rating.toFixed(1),
        Sessions: n.sessions,
        Earnings: formatCurrency(n.earnings),
        Experience: `${n.experience} yrs`,
      })),
    ];
    exportToCsv(rows, 'mumaa-nannies-report', {
      Name: 'Name',
      Email: 'Email',
      Rating: 'Rating',
      Sessions: 'Sessions',
      Earnings: 'Earnings',
      Experience: 'Experience',
    });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-48 mb-1" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-80 rounded-xl" />
          <Skeleton className="h-80 rounded-xl" />
        </div>
        <Skeleton className="h-72 rounded-xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <p className="text-gray-500">{error}</p>
        <Button onClick={fetchAnalytics} variant="outline" className="gap-2">
          <TrendingUp className="h-4 w-4" /> Retry
        </Button>
      </div>
    );
  }

  if (!data) return null;

  const ov = data.overview;

  const statCards = [
    {
      label: 'Total Users',
      value: ov.totalUsers,
      sub: `${ov.parentCount} parents · ${ov.nannyCount} nannies`,
      icon: <Users className="h-5 w-5" />,
      growth: ov.userGrowth,
      color: 'from-rose-50 to-pink-50',
      iconColor: 'text-rose-500',
    },
    {
      label: 'Active Subscriptions',
      value: ov.activeSubscriptions,
      sub: `${ov.conversionRate}% conversion rate`,
      icon: <CreditCard className="h-5 w-5" />,
      growth: ov.conversionRate,
      color: 'from-emerald-50 to-teal-50',
      iconColor: 'text-emerald-500',
    },
    {
      label: 'Total Revenue',
      value: formatCurrency(ov.totalRevenue),
      sub: `${ov.revenueGrowth >= 0 ? '+' : ''}${ov.revenueGrowth}% vs last month`,
      icon: <DollarSign className="h-5 w-5" />,
      growth: ov.revenueGrowth,
      color: 'from-purple-50 to-violet-50',
      iconColor: 'text-purple-500',
    },
    {
      label: 'Avg Call Duration',
      value: formatDuration(ov.avgCallDuration),
      sub: 'Across all completed calls',
      icon: <Clock className="h-5 w-5" />,
      color: 'from-amber-50 to-orange-50',
      iconColor: 'text-amber-500',
    },
    {
      label: 'Calls This Month',
      value: ov.callsThisMonth,
      sub: `${data.callStats.active} active now`,
      icon: <Phone className="h-5 w-5" />,
      color: 'from-blue-50 to-sky-50',
      iconColor: 'text-blue-500',
    },
    {
      label: 'Platform Rating',
      value: ov.avgRating > 0 ? ov.avgRating.toFixed(1) : 'N/A',
      sub: ov.avgRating > 0 ? `${ov.retentionRate}% retention rate` : 'No ratings yet',
      icon: <Star className="h-5 w-5" />,
      color: 'from-yellow-50 to-amber-50',
      iconColor: 'text-yellow-500',
    },
  ];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-white rounded-lg shadow-lg border border-gray-100 p-3 text-xs">
        <p className="font-medium text-gray-700 mb-1">{label}</p>
        {payload.map((entry: any, idx: number) => (
          <p key={idx} style={{ color: entry.color }} className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: entry.color }} />
            {entry.name}: {entry.name === 'revenue' || entry.name === 'Earnings'
              ? formatCurrency(entry.value)
              : entry.value}
          </p>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Overview</h1>
          <p className="text-gray-500 mt-1">Platform analytics and management dashboard</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleExport}
            className="border-gray-200 text-gray-700 hover:bg-gray-50 gap-2"
          >
            <Download className="h-4 w-4" />
            Export Report
          </Button>
          <Button
            variant="outline"
            onClick={() => onNavigate?.('analytics')}
            className="border-rose-200 text-rose-600 hover:bg-rose-50 gap-2"
          >
            <BarChart3 className="h-4 w-4" />
            Detailed Analytics
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map((card, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.06 }}
          >
            <Card className={cn('border-0 shadow-sm bg-gradient-to-br rounded-xl', card.color)}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-500 font-medium">{card.label}</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1 truncate">{card.value}</p>
                    <div className="flex items-center gap-1 mt-1">
                      {card.growth !== undefined && card.growth !== 0 && (
                        <span className={cn(
                          'text-xs font-medium flex items-center gap-0.5',
                          card.growth > 0 ? 'text-emerald-600' : 'text-rose-600'
                        )}>
                          {card.growth > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                          {Math.abs(card.growth)}%
                        </span>
                      )}
                      <p className="text-xs text-gray-400">{card.sub}</p>
                    </div>
                  </div>
                  <div className={cn('p-2.5 rounded-lg bg-white/70 shrink-0', card.iconColor)}>
                    {card.icon}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Quick links */}
      <div className="flex flex-wrap gap-3">
        <Button
          variant="outline"
          onClick={() => onNavigate?.('users')}
          className="border-gray-200 text-gray-700 hover:bg-gray-50 gap-2"
        >
          <Users className="h-4 w-4" />
          Manage Users
          <ArrowRight className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="outline"
          onClick={() => onNavigate?.('calls')}
          className="border-gray-200 text-gray-700 hover:bg-gray-50 gap-2"
        >
          <Phone className="h-4 w-4" />
          View All Calls
          <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* User Growth Chart */}
        <div className="lg:col-span-2">
          <Card className="rounded-xl border-gray-200 shadow-sm">
            <CardHeader className="px-6 py-4 border-b border-gray-100 pb-2">
              <CardTitle className="text-base font-semibold text-gray-900">User Growth</CardTitle>
              <p className="text-xs text-gray-400">Parents & nannies over time</p>
            </CardHeader>
            <CardContent className="p-4">
              <div className="h-64">
                {data.userGrowthData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data.userGrowthData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis
                        dataKey="period"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 11, fill: '#9ca3af' }}
                      />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9ca3af' }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend
                        wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }}
                        iconType="circle"
                        iconSize={8}
                      />
                      <Line
                        type="monotone"
                        dataKey="parents"
                        name="Parents"
                        stroke={COLORS.rose}
                        strokeWidth={2.5}
                        dot={{ fill: COLORS.rose, strokeWidth: 0, r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="nannies"
                        name="Nannies"
                        stroke={COLORS.emerald}
                        strokeWidth={2.5}
                        dot={{ fill: COLORS.emerald, strokeWidth: 0, r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="total"
                        name="Total"
                        stroke={COLORS.blue}
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                    No growth data available
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Subscription Breakdown */}
        <div>
          <Card className="rounded-xl border-gray-200 shadow-sm h-full">
            <CardHeader className="px-6 py-4 border-b border-gray-100 pb-2">
              <CardTitle className="text-base font-semibold text-gray-900">Subscriptions</CardTitle>
              <p className="text-xs text-gray-400">Plan distribution</p>
            </CardHeader>
            <CardContent className="p-4">
              <div className="h-52">
                {data.subscriptionDistribution.some((d) => d.value > 0) ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data.subscriptionDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={75}
                        paddingAngle={3}
                        dataKey="value"
                        stroke="none"
                      >
                        {data.subscriptionDistribution.map((entry, index) => (
                          <Cell key={index} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          borderRadius: '8px',
                          border: '1px solid #e5e7eb',
                          fontSize: '12px',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                    No data
                  </div>
                )}
              </div>
              <div className="flex justify-center gap-4 mt-2">
                {data.subscriptionDistribution.map((d) => (
                  <div key={d.name} className="flex items-center gap-1.5 text-xs text-gray-600">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                    {d.name} ({d.value})
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Chart */}
        <div className="lg:col-span-2">
          <Card className="rounded-xl border-gray-200 shadow-sm">
            <CardHeader className="px-6 py-4 border-b border-gray-100 pb-2">
              <CardTitle className="text-base font-semibold text-gray-900">Revenue</CardTitle>
              <p className="text-xs text-gray-400">Monthly revenue from completed calls</p>
            </CardHeader>
            <CardContent className="p-4">
              <div className="h-64">
                {data.revenueData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.revenueData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis
                        dataKey="period"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 11, fill: '#9ca3af' }}
                      />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9ca3af' }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar
                        dataKey="revenue"
                        name="revenue"
                        fill={COLORS.rose}
                        radius={[6, 6, 0, 0]}
                        maxBarSize={48}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                    No revenue data yet
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Call Status Distribution */}
        <div>
          <Card className="rounded-xl border-gray-200 shadow-sm h-full">
            <CardHeader className="px-6 py-4 border-b border-gray-100 pb-2">
              <CardTitle className="text-base font-semibold text-gray-900">Call Statuses</CardTitle>
              <p className="text-xs text-gray-400">{data.callStats.total} total calls</p>
            </CardHeader>
            <CardContent className="p-4">
              <div className="h-52">
                {data.callDistribution.some((d) => d.value > 0) ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data.callDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={75}
                        paddingAngle={3}
                        dataKey="value"
                        stroke="none"
                      >
                        {data.callDistribution.map((entry, index) => (
                          <Cell key={index} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          borderRadius: '8px',
                          border: '1px solid #e5e7eb',
                          fontSize: '12px',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                    No calls yet
                  </div>
                )}
              </div>
              <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 mt-2">
                {data.callDistribution.filter((d) => d.value > 0).map((d) => (
                  <div key={d.name} className="flex items-center gap-1.5 text-xs text-gray-600">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                    {d.name} ({d.value})
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Nannies */}
        <Card className="rounded-xl border-gray-200 shadow-sm">
          <CardHeader className="px-6 py-4 border-b border-gray-100 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold text-gray-900">Top Nannies</CardTitle>
              <p className="text-xs text-gray-400 mt-0.5">By rating and earnings</p>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {data.topNannies.length === 0 ? (
              <div className="text-center py-10">
                <Star className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No nannies rated yet</p>
              </div>
            ) : (
              <div className="max-h-96 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="text-left py-3 px-4 font-medium text-gray-500 text-xs">Nanny</th>
                      <th className="text-center py-3 px-3 font-medium text-gray-500 text-xs">Rating</th>
                      <th className="text-center py-3 px-3 font-medium text-gray-500 text-xs">Sessions</th>
                      <th className="text-right py-3 px-4 font-medium text-gray-500 text-xs">Earnings</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.topNannies.slice(0, 7).map((nanny) => (
                      <tr key={nanny.id} className="border-t border-gray-50 hover:bg-gray-50/50 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <Avatar className="h-7 w-7">
                              <AvatarFallback className="text-[10px] font-semibold bg-emerald-100 text-emerald-700">
                                {nanny.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="font-medium text-gray-900 truncate text-xs">{nanny.name}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <Badge variant="secondary" className="bg-amber-50 text-amber-700 text-[10px] font-semibold">
                            ★ {nanny.rating.toFixed(1)}
                          </Badge>
                        </td>
                        <td className="py-3 px-3 text-center text-xs text-gray-600">{nanny.sessions}</td>
                        <td className="py-3 px-4 text-right text-xs font-medium text-gray-900">
                          {formatCurrency(nanny.earnings)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="rounded-xl border-gray-200 shadow-sm">
          <CardHeader className="px-6 py-4 border-b border-gray-100 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold text-gray-900">Recent Activity</CardTitle>
              <p className="text-xs text-gray-400 mt-0.5">Latest platform events</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onNavigate?.('users')}
              className="text-rose-500 hover:text-rose-600 text-xs"
            >
              View all
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {data.recentActivity.length === 0 ? (
              <div className="text-center py-10">
                <Users className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No activity yet</p>
              </div>
            ) : (
              <div className="max-h-96 overflow-y-auto p-3 space-y-2">
                {data.recentActivity.slice(0, 10).map((activity, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="mt-0.5 w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
                      <Users className="h-3.5 w-3.5 text-rose-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-900">
                        <span className="font-semibold">{activity.userName}</span>
                        <span className="text-gray-500"> signed up as </span>
                        <Badge variant="secondary" className={cn(
                          'text-[10px] mx-1',
                          activity.role === 'PARENT' ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
                        )}>
                          {activity.role === 'PARENT' ? 'Parent' : 'Nanny'}
                        </Badge>
                      </p>
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        {new Date(activity.timestamp).toLocaleDateString('en-IN', {
                          day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
