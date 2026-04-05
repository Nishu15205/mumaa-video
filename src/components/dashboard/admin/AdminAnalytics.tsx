'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Calendar,
  Download,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Users,
  Star,
  Clock,
  Phone,
  CreditCard,
  DollarSign,
  BarChart3,
  Activity,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import { apiGet } from '@/lib/api';
import { exportToCsv } from '@/lib/export-csv';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from '@/components/ui/chart';
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
  ResponsiveContainer,
} from 'recharts';
import { cn } from '@/lib/utils';

// ── Types ──────────────────────────────────────────────────────

interface AnalyticsData {
  overview: {
    totalUsers: number;
    parentCount: number;
    nannyCount: number;
    adminCount: number;
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
  userRoleDistribution: { name: string; value: number; color: string }[];
  callDurationDistribution: { range: string; count: number; color: string }[];
  userGrowthData: { period: string; label: string; parents: number; nannies: number; total: number }[];
  revenueData: { period: string; label: string; revenue: number }[];
  callVolumeData: { period: string; label: string; completed: number; cancelled: number; total: number }[];
  busiestHours: { hour: string; calls: number }[];
  topNannies: {
    id: string;
    name: string;
    email: string;
    rating: number;
    sessions: number;
    earnings: number;
    experience: number;
  }[];
  recentActivity: { type: string; userName: string; role: string; timestamp: string }[];
}

type Period = 'daily' | 'weekly' | 'monthly';
type SortKey = 'name' | 'rating' | 'sessions' | 'earnings' | 'experience';
type SortDir = 'asc' | 'desc';

// ── Chart configs ──────────────────────────────────────────────

const userGrowthConfig = {
  parents: { label: 'Parents', color: '#f43f5e' },
  nannies: { label: 'Nannies', color: '#10b981' },
  total: { label: 'Total', color: '#6366f1' },
} satisfies ChartConfig;

const callVolumeConfig = {
  completed: { label: 'Completed', color: '#10b981' },
  cancelled: { label: 'Cancelled', color: '#f43f5e' },
} satisfies ChartConfig;

const revenueConfig = {
  revenue: { label: 'Revenue', color: '#f43f5e' },
} satisfies ChartConfig;

const durationConfig = {
  count: { label: 'Calls', color: '#f43f5e' },
} satisfies ChartConfig;

// ── Component ──────────────────────────────────────────────────

export default function AdminAnalytics({ onNavigate }: { onNavigate?: (page: string) => void }) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<Period>('monthly');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('rating');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  useEffect(() => {
    fetchAnalytics();
  }, [period, fromDate, toDate]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams({ period });
      if (fromDate) params.append('from', fromDate);
      if (toDate) params.append('to', toDate);
      const res = await apiGet<AnalyticsData>(`/api/admin/analytics?${params.toString()}`);
      setData(res);
    } catch {
      setError('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  const sortedNannies = useMemo(() => {
    if (!data) return [];
    return [...data.topNannies].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      return sortDir === 'asc'
        ? (aVal as number) - (bVal as number)
        : (bVal as number) - (aVal as number);
    });
  }, [data, sortKey, sortDir]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const formatCurrency = (amount: number) =>
    `₹${Math.round(amount).toLocaleString('en-IN')}`;

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  // ── Export helpers ───────────────────────────────────────────

  const handleExportFull = () => {
    if (!data) return;
    const ov = data.overview;
    const rows = [
      { Category: 'Overview', Metric: 'Total Users', Value: ov.totalUsers },
      { Category: 'Overview', Metric: 'Parents', Value: ov.parentCount },
      { Category: 'Overview', Metric: 'Nannies', Value: ov.nannyCount },
      { Category: 'Overview', Metric: 'Total Revenue', Value: formatCurrency(ov.totalRevenue) },
      { Category: 'Overview', Metric: 'Revenue This Month', Value: formatCurrency(ov.revenueThisMonth) },
      { Category: 'Overview', Metric: 'Avg Call Duration', Value: formatDuration(ov.avgCallDuration) },
      { Category: 'Overview', Metric: 'Avg Rating', Value: ov.avgRating.toFixed(1) },
      { Category: 'Overview', Metric: 'Retention Rate', Value: `${ov.retentionRate}%` },
      { Category: 'Overview', Metric: 'Conversion Rate', Value: `${ov.conversionRate}%` },
      { Category: 'Calls', Metric: 'Total Calls', Value: data.callStats.total },
      { Category: 'Calls', Metric: 'Completed', Value: data.callStats.completed },
      { Category: 'Calls', Metric: 'Cancelled', Value: data.callStats.cancelled },
      { Category: 'Calls', Metric: 'Active', Value: data.callStats.active },
      { Category: 'Calls', Metric: 'Pending', Value: data.callStats.pending },
      { Category: 'Subscriptions', Metric: 'FREE', Value: ov.freeSubscriptions },
      { Category: 'Subscriptions', Metric: 'BASIC', Value: ov.basicSubscriptions },
      { Category: 'Subscriptions', Metric: 'PRO', Value: ov.proSubscriptions },
    ];
    exportToCsv(rows, 'mumaa-analytics-report', { Category: 'Category', Metric: 'Metric', Value: 'Value' });
  };

  const handleExportNannies = () => {
    if (!data) return;
    const rows = data.topNannies.map((n) => ({
      Name: n.name,
      Email: n.email,
      Rating: n.rating.toFixed(1),
      Sessions: n.sessions,
      Earnings: formatCurrency(n.earnings),
      'Experience (yrs)': n.experience,
    }));
    exportToCsv(rows, 'mumaa-top-nannies', {
      Name: 'Name', Email: 'Email', Rating: 'Rating', Sessions: 'Sessions',
      Earnings: 'Earnings', 'Experience (yrs)': 'Experience',
    });
  };

  const handleExportRevenue = () => {
    if (!data) return;
    const rows = data.revenueData.map((r) => ({ Period: r.label, Revenue: r.revenue }));
    exportToCsv(rows, 'mumaa-revenue-data', { Period: 'Period', Revenue: 'Revenue (₹)' });
  };

  const SortIcon = ({ column }: { column: SortKey }) => {
    if (sortKey !== column) return <ChevronUp className="h-3 w-3 text-gray-300" />;
    return sortDir === 'desc'
      ? <ChevronDown className="h-3 w-3 text-rose-500" />
      : <ChevronUp className="h-3 w-3 text-rose-500" />;
  };

  // ── Loading skeleton ─────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="flex gap-3">
          <Skeleton className="h-10 w-36" />
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-80 rounded-xl" />
          <Skeleton className="h-80 rounded-xl" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-80 rounded-xl" />
          <Skeleton className="h-80 rounded-xl" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-72 rounded-xl" />
          <Skeleton className="h-72 rounded-xl" />
          <Skeleton className="h-72 rounded-xl" />
        </div>
        <Skeleton className="h-80 rounded-xl" />
        <Skeleton className="h-72 rounded-xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <p className="text-gray-500">{error}</p>
        <Button onClick={fetchAnalytics} variant="outline" className="gap-2">
          <RefreshCw className="h-4 w-4" /> Retry
        </Button>
      </div>
    );
  }

  if (!data) return null;

  const ov = data.overview;

  // ── Summary cards data ───────────────────────────────────────

  const summaryCards = [
    {
      label: 'Total Users',
      value: ov.totalUsers.toLocaleString(),
      growth: ov.userGrowth,
      icon: <Users className="h-5 w-5" />,
      color: 'text-rose-500',
      bg: 'bg-rose-50',
      border: 'border-rose-100',
    },
    {
      label: 'Active Calls',
      value: data.callStats.active.toString(),
      sub: `${data.callStats.pending} pending`,
      icon: <Phone className="h-5 w-5" />,
      color: 'text-blue-500',
      bg: 'bg-blue-50',
      border: 'border-blue-100',
    },
    {
      label: 'Revenue (This Month)',
      value: formatCurrency(ov.revenueThisMonth),
      growth: ov.revenueGrowth,
      icon: <DollarSign className="h-5 w-5" />,
      color: 'text-emerald-500',
      bg: 'bg-emerald-50',
      border: 'border-emerald-100',
    },
    {
      label: 'Avg Rating',
      value: ov.avgRating > 0 ? `${ov.avgRating.toFixed(1)} / 5` : 'N/A',
      icon: <Star className="h-5 w-5" />,
      color: 'text-amber-500',
      bg: 'bg-amber-50',
      border: 'border-amber-100',
    },
  ];

  // ── Render ───────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onNavigate?.('dashboard')}
            className="h-8 w-8 text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Detailed Analytics</h1>
            <p className="text-gray-500 text-sm mt-0.5">Comprehensive platform insights & reports</p>
          </div>
        </div>
      </div>

      {/* Filters bar */}
      <Card className="rounded-xl border-gray-200 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-400" />
              <span className="text-sm text-gray-600 font-medium">From:</span>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-rose-200 focus:border-rose-300 bg-white"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 font-medium">To:</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-rose-200 focus:border-rose-300 bg-white"
              />
            </div>
            <Tabs
              value={period}
              onValueChange={(v) => setPeriod(v as Period)}
              className="ml-auto"
            >
              <TabsList className="h-8">
                <TabsTrigger value="daily" className="text-xs px-3 h-6">Daily</TabsTrigger>
                <TabsTrigger value="weekly" className="text-xs px-3 h-6">Weekly</TabsTrigger>
                <TabsTrigger value="monthly" className="text-xs px-3 h-6">Monthly</TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleExportFull}
                className="border-gray-200 text-gray-700 hover:bg-gray-50 gap-1.5 text-xs">
                <Download className="h-3.5 w-3.5" /> Full Report
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportNannies}
                className="border-gray-200 text-gray-700 hover:bg-gray-50 gap-1.5 text-xs">
                <Download className="h-3.5 w-3.5" /> Nannies CSV
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportRevenue}
                className="border-gray-200 text-gray-700 hover:bg-gray-50 gap-1.5 text-xs">
                <Download className="h-3.5 w-3.5" /> Revenue CSV
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Summary KPI Cards ─────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((card, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
          >
            <Card className={cn('rounded-xl border shadow-sm', card.border)}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{card.label}</p>
                  <div className={cn('p-2 rounded-lg', card.bg, card.color)}>{card.icon}</div>
                </div>
                <p className="text-2xl font-bold text-gray-900 mt-2">{card.value}</p>
                <div className="flex items-center gap-2 mt-1.5">
                  {card.growth !== undefined && card.growth !== 0 && (
                    <span className={cn(
                      'flex items-center gap-0.5 text-xs font-semibold',
                      card.growth > 0 ? 'text-emerald-600' : 'text-rose-600'
                    )}>
                      {card.growth > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                      {Math.abs(card.growth)}%
                    </span>
                  )}
                  {'sub' in card && card.sub && (
                    <span className="text-xs text-gray-400">{card.sub}</span>
                  )}
                  {card.growth !== undefined && card.growth !== 0 && (
                    <span className="text-xs text-gray-400">vs last period</span>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* ── Row 1: User Growth (Area) + Call Volume (Bar) ──────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Growth Area Chart */}
        <Card className="rounded-xl border-gray-200 shadow-sm">
          <CardHeader className="px-6 py-4 border-b border-gray-100 pb-2">
            <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-rose-500" />
              User Growth
            </CardTitle>
            <CardDescription>Parents & nannies registered over time</CardDescription>
          </CardHeader>
          <CardContent className="p-4">
            <div className="h-72">
              {data.userGrowthData.length > 0 ? (
                <ChartContainer config={userGrowthConfig} className="h-full w-full">
                  <AreaChart data={data.userGrowthData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="fillParents" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.02} />
                      </linearGradient>
                      <linearGradient id="fillNannies" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                    <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9ca3af' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9ca3af' }} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <ChartLegend content={<ChartLegendContent />} />
                    <Area type="monotone" dataKey="parents" name="Parents" stroke="#f43f5e"
                      fill="url(#fillParents)" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                    <Area type="monotone" dataKey="nannies" name="Nannies" stroke="#10b981"
                      fill="url(#fillNannies)" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                  </AreaChart>
                </ChartContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400 text-sm">No growth data</div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Call Volume Bar Chart */}
        <Card className="rounded-xl border-gray-200 shadow-sm">
          <CardHeader className="px-6 py-4 border-b border-gray-100 pb-2">
            <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <Phone className="h-4 w-4 text-blue-500" />
              Call Volume
            </CardTitle>
            <CardDescription>Completed & cancelled calls over time</CardDescription>
          </CardHeader>
          <CardContent className="p-4">
            <div className="h-72">
              {data.callVolumeData.length > 0 ? (
                <ChartContainer config={callVolumeConfig} className="h-full w-full">
                  <BarChart data={data.callVolumeData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                    <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9ca3af' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9ca3af' }} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <ChartLegend content={<ChartLegendContent />} />
                    <Bar dataKey="completed" name="Completed" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={32} />
                    <Bar dataKey="cancelled" name="Cancelled" fill="#f43f5e" radius={[4, 4, 0, 0]} maxBarSize={32} />
                  </BarChart>
                </ChartContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400 text-sm">No call data</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Row 2: Revenue (Line) + Busiest Hours (Bar) ──────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Line Chart */}
        <Card className="rounded-xl border-gray-200 shadow-sm">
          <CardHeader className="px-6 py-4 border-b border-gray-100 pb-2">
            <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-emerald-500" />
              Revenue Over Time
            </CardTitle>
            <CardDescription>Revenue from completed calls</CardDescription>
          </CardHeader>
          <CardContent className="p-4">
            <div className="h-72">
              {data.revenueData.length > 0 ? (
                <ChartContainer config={revenueConfig} className="h-full w-full">
                  <LineChart data={data.revenueData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                    <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9ca3af' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9ca3af' }} />
                    <ChartTooltip
                      content={<ChartTooltipContent formatter={(value) => formatCurrency(value as number)} />}
                    />
                    <Line type="monotone" dataKey="revenue" name="Revenue"
                      stroke="#f43f5e" strokeWidth={2.5}
                      dot={{ fill: '#f43f5e', strokeWidth: 0, r: 4 }}
                      activeDot={{ r: 6, strokeWidth: 2, stroke: '#fff' }}
                    />
                  </LineChart>
                </ChartContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400 text-sm">No revenue data</div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Busiest Hours */}
        <Card className="rounded-xl border-gray-200 shadow-sm">
          <CardHeader className="px-6 py-4 border-b border-gray-100 pb-2">
            <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-500" />
              Busiest Hours
            </CardTitle>
            <CardDescription>Call volume by hour of day</CardDescription>
          </CardHeader>
          <CardContent className="p-4">
            <div className="h-72">
              {data.busiestHours.some((h) => h.calls > 0) ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.busiestHours.filter((h) => h.calls > 0)}
                    margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                    <XAxis dataKey="hour" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af' }} interval={1} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9ca3af' }} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="calls" name="Calls" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={24} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400 text-sm">No call hour data</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Row 3: Pie Charts (Subscription, Role, Call Duration) ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Subscription Distribution */}
        <Card className="rounded-xl border-gray-200 shadow-sm">
          <CardHeader className="px-6 py-4 border-b border-gray-100 pb-2">
            <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-purple-500" />
              Subscription Plans
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="h-52">
              {data.subscriptionDistribution.some((d) => d.value > 0) ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.subscriptionDistribution}
                      cx="50%" cy="50%"
                      innerRadius={40} outerRadius={72}
                      paddingAngle={3} dataKey="value" stroke="none"
                    >
                      {data.subscriptionDistribution.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent />} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400 text-sm">No data</div>
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

        {/* User Role Distribution */}
        <Card className="rounded-xl border-gray-200 shadow-sm">
          <CardHeader className="px-6 py-4 border-b border-gray-100 pb-2">
            <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <Users className="h-4 w-4 text-rose-500" />
              User Roles
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="h-52">
              {data.userRoleDistribution.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.userRoleDistribution}
                      cx="50%" cy="50%"
                      innerRadius={40} outerRadius={72}
                      paddingAngle={3} dataKey="value" stroke="none"
                    >
                      {data.userRoleDistribution.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent />} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400 text-sm">No data</div>
              )}
            </div>
            <div className="flex justify-center gap-4 mt-2">
              {data.userRoleDistribution.map((d) => (
                <div key={d.name} className="flex items-center gap-1.5 text-xs text-gray-600">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                  {d.name} ({d.value})
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Call Duration Distribution */}
        <Card className="rounded-xl border-gray-200 shadow-sm">
          <CardHeader className="px-6 py-4 border-b border-gray-100 pb-2">
            <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-500" />
              Call Duration
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="h-52">
              {data.callDurationDistribution.some((d) => d.count > 0) ? (
                <ChartContainer config={durationConfig} className="h-full w-full">
                  <BarChart data={data.callDurationDistribution.filter((d) => d.count > 0)}
                    margin={{ top: 5, right: 5, left: -10, bottom: 0 }}
                    layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                    <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9ca3af' }} />
                    <YAxis type="category" dataKey="range" axisLine={false} tickLine={false}
                      tick={{ fontSize: 10, fill: '#6b7280' }} width={70} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="count" name="Calls" radius={[0, 6, 6, 0]} maxBarSize={20}>
                      {data.callDurationDistribution.filter((d) => d.count > 0).map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ChartContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400 text-sm">No duration data</div>
              )}
            </div>
            {ov.avgCallDuration > 0 && (
              <p className="text-center text-xs text-gray-400 mt-2">
                Avg: {formatDuration(ov.avgCallDuration)}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Row 4: Engagement Metrics + Call Status ─────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Engagement Stats */}
        <Card className="rounded-xl border-gray-200 shadow-sm">
          <CardHeader className="px-6 py-4 border-b border-gray-100 pb-2">
            <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <Activity className="h-4 w-4 text-emerald-500" />
              Engagement Metrics
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-600 font-medium">Conversion Rate</span>
                  <span className="font-semibold text-gray-900">{ov.conversionRate}%</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-rose-400 to-rose-500 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(ov.conversionRate, 100)}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-600 font-medium">Retention Rate</span>
                  <span className="font-semibold text-gray-900">{ov.retentionRate}%</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(ov.retentionRate, 100)}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-600 font-medium">Avg Rating</span>
                  <span className="font-semibold text-gray-900">{ov.avgRating > 0 ? `${ov.avgRating.toFixed(1)} / 5` : 'N/A'}</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full transition-all duration-500"
                    style={{ width: `${ov.avgRating > 0 ? (ov.avgRating / 5) * 100 : 0}%` }}
                  />
                </div>
              </div>
              <div className="pt-2 border-t border-gray-100 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Total Completed Calls</span>
                  <span className="font-medium text-gray-900">{data.callStats.completed}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Total Cancelled</span>
                  <span className="font-medium text-gray-900">{data.callStats.cancelled}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">No Shows</span>
                  <span className="font-medium text-gray-900">{data.callStats.noShow}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Avg Call Duration</span>
                  <span className="font-medium text-gray-900">{formatDuration(ov.avgCallDuration)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Platform Rating</span>
                  <span className="font-medium text-amber-600 flex items-center gap-0.5">
                    <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                    {ov.avgRating > 0 ? ov.avgRating.toFixed(1) : 'N/A'}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Call Status Distribution */}
        <Card className="rounded-xl border-gray-200 shadow-sm">
          <CardHeader className="px-6 py-4 border-b border-gray-100 pb-2">
            <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-rose-500" />
              Call Statuses
            </CardTitle>
            <CardDescription>{data.callStats.total} total calls</CardDescription>
          </CardHeader>
          <CardContent className="p-4">
            <div className="h-52">
              {data.callDistribution.some((d) => d.value > 0) ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.callDistribution}
                      cx="50%" cy="50%"
                      innerRadius={40} outerRadius={72}
                      paddingAngle={3} dataKey="value" stroke="none"
                    >
                      {data.callDistribution.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent />} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400 text-sm">No calls yet</div>
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

      {/* ── Top Nannies Table ──────────────────────────────────── */}
      <Card className="rounded-xl border-gray-200 shadow-sm">
        <CardHeader className="px-6 py-4 border-b border-gray-100 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <Star className="h-4 w-4 text-amber-500" />
              Top Rated Nannies
            </CardTitle>
            <p className="text-xs text-gray-400 mt-0.5">Click column headers to sort</p>
          </div>
          <Button variant="outline" size="sm" onClick={handleExportNannies}
            className="border-gray-200 text-gray-700 hover:bg-gray-50 gap-1.5 text-xs">
            <Download className="h-3.5 w-3.5" /> Export
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {sortedNannies.length === 0 ? (
            <div className="text-center py-10">
              <Star className="h-8 w-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No rated nannies yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr>
                    <th className="text-left py-3 px-4 font-medium text-gray-500 text-xs w-12">#</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500 text-xs cursor-pointer hover:text-gray-700 select-none"
                      onClick={() => handleSort('name')}>
                      <span className="flex items-center gap-1">Nanny <SortIcon column="name" /></span>
                    </th>
                    <th className="text-center py-3 px-3 font-medium text-gray-500 text-xs cursor-pointer hover:text-gray-700 select-none"
                      onClick={() => handleSort('rating')}>
                      <span className="flex items-center justify-center gap-1">Rating <SortIcon column="rating" /></span>
                    </th>
                    <th className="text-center py-3 px-3 font-medium text-gray-500 text-xs cursor-pointer hover:text-gray-700 select-none"
                      onClick={() => handleSort('sessions')}>
                      <span className="flex items-center justify-center gap-1">Sessions <SortIcon column="sessions" /></span>
                    </th>
                    <th className="text-center py-3 px-3 font-medium text-gray-500 text-xs cursor-pointer hover:text-gray-700 select-none"
                      onClick={() => handleSort('experience')}>
                      <span className="flex items-center justify-center gap-1">Exp (yrs) <SortIcon column="experience" /></span>
                    </th>
                    <th className="text-right py-3 px-4 font-medium text-gray-500 text-xs cursor-pointer hover:text-gray-700 select-none"
                      onClick={() => handleSort('earnings')}>
                      <span className="flex items-center justify-end gap-1">Earnings <SortIcon column="earnings" /></span>
                    </th>
                  </tr>
                </thead>
                <tbody className="max-h-96 overflow-y-auto">
                  {sortedNannies.map((nanny, idx) => (
                    <tr key={nanny.id} className="border-t border-gray-50 hover:bg-gray-50/50 transition-colors">
                      <td className="py-3 px-4 text-xs text-gray-400 font-medium">{idx + 1}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <Avatar className="h-7 w-7">
                            <AvatarFallback className="text-[10px] font-semibold bg-emerald-100 text-emerald-700">
                              {nanny.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900 truncate text-xs">{nanny.name}</p>
                            <p className="text-[10px] text-gray-400 truncate">{nanny.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <Badge variant="secondary" className="bg-amber-50 text-amber-700 text-[10px] font-semibold">
                          ★ {nanny.rating.toFixed(1)}
                        </Badge>
                      </td>
                      <td className="py-3 px-3 text-center text-xs text-gray-600">{nanny.sessions}</td>
                      <td className="py-3 px-3 text-center text-xs text-gray-600">{nanny.experience}</td>
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

      {/* ── Recent Activity ─────────────────────────────────────── */}
      <Card className="rounded-xl border-gray-200 shadow-sm">
        <CardHeader className="px-6 py-4 border-b border-gray-100">
          <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <Activity className="h-4 w-4 text-blue-500" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {data.recentActivity.length === 0 ? (
            <div className="text-center py-10">
              <Users className="h-8 w-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No activity yet</p>
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto p-3 space-y-1">
              {data.recentActivity.map((activity, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
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
  );
}
