import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Helper: runs a query, catches errors, returns a fallback value instead of throwing
async function safeQuery<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    console.error('[analytics] Query failed, using fallback:', err);
    return fallback;
  }
}

function formatDateForGroup(date: Date, period: string): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');

  switch (period) {
    case 'daily':
      return `${y}-${m}-${d}`;
    case 'weekly': {
      const day = date.getDay();
      const diff = date.getDate() - day + (day === 0 ? -6 : 1);
      const weekStart = new Date(date);
      weekStart.setDate(diff);
      const wy = weekStart.getFullYear();
      const wm = String(weekStart.getMonth() + 1).padStart(2, '0');
      const wd = String(weekStart.getDate()).padStart(2, '0');
      return `${wy}-${wm}-${wd}`;
    }
    case 'monthly':
      return `${y}-${m}`;
    default:
      return `${y}-${m}`;
  }
}

function formatLabelForPeriod(dateStr: string, period: string): string {
  // Turn "2025-01-15" or "2025-01" into shorter display labels
  if (period === 'monthly') {
    const parts = dateStr.split('-');
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return monthNames[parseInt(parts[1], 10) - 1] || parts[1];
  }
  if (period === 'weekly') {
    const parts = dateStr.split('-');
    return `${parseInt(parts[1], 10)}/${parseInt(parts[2], 10)}`;
  }
  // daily: show "Jan 15" format
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const period = searchParams.get('period') || 'monthly';

    const now = new Date();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    const startDate = from ? new Date(from) : sixMonthsAgo;
    const endDate = to ? new Date(to + 'T23:59:59:999Z') : now;

    const dateFilter: Record<string, unknown> = {
      createdAt: { gte: startDate, lte: endDate },
    };

    // Run all queries in parallel — each one wrapped with safeQuery so individual failures don't break everything
    const [
      totalUsers,
      parentCount,
      nannyCount,
      adminCount,
      allActiveSubscriptions,
      freeSubCount,
      basicSubCount,
      proSubCount,
      totalCallsAll,
      completedCalls,
      cancelledCalls,
      activeCalls,
      pendingCalls,
      avgDurationResult,
      revenueResult,
      revenueThisMonth,
      revenueLastMonth,
      usersThisMonth,
      usersLastMonth,
      avgRating,
      topNannies,
      recentActivity,
      callHourData,
      retentionData,
      callDurationData,
    ] = await Promise.all([
      // Total users (non-admin)
      safeQuery(
        () => db.user.count({ where: { role: { in: ['PARENT', 'NANNY'] } } }),
        0
      ),

      safeQuery(() => db.user.count({ where: { role: 'PARENT' } }), 0),
      safeQuery(() => db.user.count({ where: { role: 'NANNY' } }), 0),
      safeQuery(() => db.user.count({ where: { role: 'ADMIN' } }), 0),

      // Active subscriptions
      safeQuery(() => db.subscription.count({ where: { status: 'ACTIVE' } }), 0),
      safeQuery(() => db.subscription.count({ where: { status: 'ACTIVE', plan: 'FREE' } }), 0),
      safeQuery(() => db.subscription.count({ where: { status: 'ACTIVE', plan: 'BASIC' } }), 0),
      safeQuery(() => db.subscription.count({ where: { status: 'ACTIVE', plan: 'PRO' } }), 0),

      // Call stats
      safeQuery(() => db.callSession.count(), 0),
      safeQuery(() => db.callSession.count({ where: { status: 'COMPLETED' } }), 0),
      safeQuery(() => db.callSession.count({ where: { status: 'CANCELLED' } }), 0),
      safeQuery(() => db.callSession.count({ where: { status: 'ACTIVE' } }), 0),
      safeQuery(() => db.callSession.count({ where: { status: 'PENDING' } }), 0),

      // Average call duration (completed calls)
      safeQuery(
        () =>
          db.callSession.aggregate({
            where: { status: 'COMPLETED', duration: { gt: 0 } },
            _avg: { duration: true },
          }),
        { _avg: { duration: 0 } }
      ),

      // Total revenue
      safeQuery(
        () =>
          db.callSession.aggregate({
            where: { status: 'COMPLETED' },
            _sum: { price: true },
          }),
        { _sum: { price: 0 } }
      ),

      // Revenue this month
      safeQuery(
        () =>
          db.callSession.aggregate({
            where: {
              status: 'COMPLETED',
              createdAt: {
                gte: new Date(now.getFullYear(), now.getMonth(), 1),
                lte: now,
              },
            },
            _sum: { price: true },
          }),
        { _sum: { price: 0 } }
      ),

      // Revenue last month
      safeQuery(
        () =>
          db.callSession.aggregate({
            where: {
              status: 'COMPLETED',
              createdAt: {
                gte: new Date(now.getFullYear(), now.getMonth() - 1, 1),
                lt: new Date(now.getFullYear(), now.getMonth(), 1),
              },
            },
            _sum: { price: true },
          }),
        { _sum: { price: 0 } }
      ),

      // Users this month
      safeQuery(
        () =>
          db.user.count({
            where: {
              role: { in: ['PARENT', 'NANNY'] },
              createdAt: {
                gte: new Date(now.getFullYear(), now.getMonth(), 1),
                lte: now,
              },
            },
          }),
        0
      ),

      // Users last month
      safeQuery(
        () =>
          db.user.count({
            where: {
              role: { in: ['PARENT', 'NANNY'] },
              createdAt: {
                gte: new Date(now.getFullYear(), now.getMonth() - 1, 1),
                lt: new Date(now.getFullYear(), now.getMonth(), 1),
              },
            },
          }),
        0
      ),

      // Platform average rating
      safeQuery(
        () =>
          db.callSession.aggregate({
            where: { rating: { gt: 0 } },
            _avg: { rating: true },
          }),
        { _avg: { rating: 0 } }
      ),

      // Top rated nannies
      safeQuery(
        () =>
          db.nannyProfile.findMany({
            where: { rating: { gt: 0 } },
            include: { user: { select: { name: true, email: true, createdAt: true } } },
            orderBy: { rating: 'desc' },
            take: 10,
          }),
        [] as Awaited<
          ReturnType<
            typeof db.nannyProfile.findMany
          >
        >
      ),

      // Recent activity (last 20 events)
      safeQuery(
        () =>
          db.user.findMany({
            where: { role: { in: ['PARENT', 'NANNY'] } },
            orderBy: { createdAt: 'desc' },
            take: 20,
            select: {
              id: true,
              name: true,
              role: true,
              createdAt: true,
              email: true,
            },
          }),
        [] as Awaited<ReturnType<typeof db.user.findMany>>
      ),

      // Busiest hours - calls grouped by hour
      safeQuery(
        () =>
          db.callSession.findMany({
            where: { status: 'COMPLETED', startedAt: { not: null } },
            select: { startedAt: true },
            take: 1000,
          }),
        [] as Awaited<ReturnType<typeof db.callSession.findMany>>
      ),

      // Retention: users who made calls in month 1 vs month 2
      safeQuery(
        () =>
          db.callSession.groupBy({
            by: ['parentId'],
            _min: { createdAt: true },
            _count: { id: true },
            where: { status: 'COMPLETED' },
          }),
        [] as Awaited<ReturnType<typeof db.callSession.groupBy>>
      ),

      // Call durations for distribution
      safeQuery(
        () =>
          db.callSession.findMany({
            where: { status: 'COMPLETED', duration: { gt: 0 } },
            select: { duration: true },
            take: 2000,
          }),
        [] as Awaited<ReturnType<typeof db.callSession.findMany>>
      ),
    ]);

    // Process user growth data grouped by period
    const usersInRange = await safeQuery(
      () =>
        db.user.findMany({
          where: {
            role: { in: ['PARENT', 'NANNY'] },
            createdAt: { gte: startDate, lte: endDate },
          },
          select: { createdAt: true, role: true },
        }),
      [] as Awaited<ReturnType<typeof db.user.findMany>>
    );

    const userGrowthMap = new Map<string, { parents: number; nannies: number; total: number }>();
    usersInRange.forEach((u) => {
      const key = formatDateForGroup(u.createdAt, period);
      const existing = userGrowthMap.get(key) || { parents: 0, nannies: 0, total: 0 };
      if (u.role === 'PARENT') existing.parents++;
      else if (u.role === 'NANNY') existing.nannies++;
      existing.total++;
      userGrowthMap.set(key, existing);
    });

    const userGrowthData = Array.from(userGrowthMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([periodKey, val]) => ({
        period: periodKey,
        label: formatLabelForPeriod(periodKey, period),
        parents: val.parents,
        nannies: val.nannies,
        total: val.total,
      }));

    // Process revenue over time
    const completedCallsInRange = await safeQuery(
      () =>
        db.callSession.findMany({
          where: { status: 'COMPLETED', createdAt: { gte: startDate, lte: endDate } },
          select: { createdAt: true, price: true },
        }),
      [] as Awaited<ReturnType<typeof db.callSession.findMany>>
    );

    const revenueMap = new Map<string, number>();
    completedCallsInRange.forEach((c) => {
      const key = formatDateForGroup(c.createdAt, period);
      revenueMap.set(key, (revenueMap.get(key) || 0) + (c.price || 0));
    });

    const revenueData = Array.from(revenueMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([periodKey, amount]) => ({
        period: periodKey,
        label: formatLabelForPeriod(periodKey, period),
        revenue: Math.round(amount * 100) / 100,
      }));

    // Process call volume over time
    const callsInRange = await safeQuery(
      () =>
        db.callSession.findMany({
          where: { createdAt: { gte: startDate, lte: endDate } },
          select: { createdAt: true, status: true },
        }),
      [] as Awaited<ReturnType<typeof db.callSession.findMany>>
    );

    const callVolumeMap = new Map<string, { completed: number; cancelled: number; total: number }>();
    callsInRange.forEach((c) => {
      const key = formatDateForGroup(c.createdAt, period);
      const existing = callVolumeMap.get(key) || { completed: 0, cancelled: 0, total: 0 };
      existing.total++;
      if (c.status === 'COMPLETED') existing.completed++;
      else if (c.status === 'CANCELLED') existing.cancelled++;
      callVolumeMap.set(key, existing);
    });

    const callVolumeData = Array.from(callVolumeMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([periodKey, val]) => ({
        period: periodKey,
        label: formatLabelForPeriod(periodKey, period),
        completed: val.completed,
        cancelled: val.cancelled,
        total: val.total,
      }));

    // Busiest hours processing
    const hourCount: number[] = new Array(24).fill(0);
    callHourData.forEach((c) => {
      if (c.startedAt) {
        const hour = new Date(c.startedAt).getHours();
        hourCount[hour]++;
      }
    });
    const busiestHours = hourCount.map((count, hour) => ({
      hour: `${String(hour).padStart(2, '0')}:00`,
      calls: count,
    }));

    // Call duration distribution
    const durationBuckets = [
      { range: '0-5 min', min: 0, max: 300, color: '#fca5a5' },
      { range: '5-15 min', min: 300, max: 900, color: '#f87171' },
      { range: '15-30 min', min: 900, max: 1800, color: '#ef4444' },
      { range: '30-60 min', min: 1800, max: 3600, color: '#dc2626' },
      { range: '60+ min', min: 3600, max: Infinity, color: '#b91c1c' },
    ];
    const callDurationDistribution = durationBuckets.map((bucket) => ({
      range: bucket.range,
      count: callDurationData.filter(
        (c) => c.duration >= bucket.min && c.duration < bucket.max
      ).length,
      color: bucket.color,
    }));

    // User role distribution
    const userRoleDistribution = [
      { name: 'Parents', value: parentCount, color: '#f43f5e' },
      { name: 'Nannies', value: nannyCount, color: '#10b981' },
      { name: 'Admins', value: adminCount, color: '#6366f1' },
    ].filter((d) => d.value > 0);

    // Retention metrics
    const usersWithMultipleCalls = retentionData.filter((r) => r._count.id >= 2);
    const retentionRate = retentionData.length > 0
      ? Math.round((usersWithMultipleCalls.length / retentionData.length) * 100)
      : 0;

    // Growth percentages
    const userGrowthPct = usersLastMonth > 0
      ? Math.round(((usersThisMonth - usersLastMonth) / usersLastMonth) * 100)
      : usersThisMonth > 0 ? 100 : 0;

    const revenueGrowthPct = (revenueLastMonth._sum.price || 0) > 0
      ? Math.round(
          (((revenueThisMonth._sum.price || 0) - (revenueLastMonth._sum.price || 0)) /
            (revenueLastMonth._sum.price || 0)) *
            100
        )
      : (revenueThisMonth._sum.price || 0) > 0 ? 100 : 0;

    const conversionRate = totalUsers > 0
      ? Math.round(((basicSubCount + proSubCount) / totalUsers) * 100)
      : 0;

    // Calls this month
    const callsCompletedBeforeThisMonth = await safeQuery(
      () =>
        db.callSession.count({
          where: {
            status: 'COMPLETED',
            createdAt: {
              lt: new Date(now.getFullYear(), now.getMonth(), 1),
            },
          },
        }),
      0
    );
    const callsThisMonth = completedCalls - callsCompletedBeforeThisMonth;

    return NextResponse.json({
      overview: {
        totalUsers,
        parentCount,
        nannyCount,
        adminCount,
        activeSubscriptions: allActiveSubscriptions,
        freeSubscriptions: freeSubCount,
        basicSubscriptions: basicSubCount,
        proSubscriptions: proSubCount,
        totalRevenue: revenueResult._sum.price || 0,
        revenueThisMonth: revenueThisMonth._sum.price || 0,
        revenueLastMonth: revenueLastMonth._sum.price || 0,
        revenueGrowth: revenueGrowthPct,
        userGrowth: userGrowthPct,
        conversionRate,
        avgCallDuration: avgDurationResult._avg.duration || 0,
        avgRating: avgRating._avg.rating || 0,
        callsThisMonth: Math.max(callsThisMonth, 0),
        retentionRate,
      },
      callStats: {
        total: totalCallsAll,
        completed: completedCalls,
        cancelled: cancelledCalls,
        active: activeCalls,
        pending: pendingCalls,
        noShow: Math.max(0, totalCallsAll - completedCalls - cancelledCalls - activeCalls - pendingCalls),
      },
      subscriptionDistribution: [
        { name: 'FREE', value: freeSubCount, color: '#d1d5db' },
        { name: 'BASIC', value: basicSubCount, color: '#f43f5e' },
        { name: 'PRO', value: proSubCount, color: '#10b981' },
      ],
      callDistribution: [
        { name: 'Completed', value: completedCalls, color: '#10b981' },
        { name: 'Cancelled', value: cancelledCalls, color: '#f43f5e' },
        { name: 'Active', value: activeCalls, color: '#3b82f6' },
        { name: 'Pending', value: pendingCalls, color: '#f59e0b' },
      ],
      userRoleDistribution,
      callDurationDistribution,
      userGrowthData,
      revenueData,
      callVolumeData,
      busiestHours,
      topNannies: topNannies.map((n) => ({
        id: n.id,
        name: n.user?.name ?? 'Unknown',
        email: n.user?.email ?? '',
        rating: n.rating,
        sessions: n.totalSessions,
        earnings: n.totalEarnings,
        experience: n.experience,
      })),
      recentActivity: recentActivity.map((u) => ({
        type: 'signup' as const,
        userName: u.name,
        role: u.role,
        timestamp: u.createdAt?.toISOString?.() ?? new Date().toISOString(),
      })),
    });
  } catch (error: unknown) {
    console.error('Get analytics error:', error);
    // Even in the outer catch, return 200 with empty data so the frontend never breaks
    return NextResponse.json({
      overview: {
        totalUsers: 0,
        parentCount: 0,
        nannyCount: 0,
        adminCount: 0,
        activeSubscriptions: 0,
        freeSubscriptions: 0,
        basicSubscriptions: 0,
        proSubscriptions: 0,
        totalRevenue: 0,
        revenueThisMonth: 0,
        revenueLastMonth: 0,
        revenueGrowth: 0,
        userGrowth: 0,
        conversionRate: 0,
        avgCallDuration: 0,
        avgRating: 0,
        callsThisMonth: 0,
        retentionRate: 0,
      },
      callStats: {
        total: 0,
        completed: 0,
        cancelled: 0,
        active: 0,
        pending: 0,
        noShow: 0,
      },
      subscriptionDistribution: [
        { name: 'FREE', value: 0, color: '#d1d5db' },
        { name: 'BASIC', value: 0, color: '#f43f5e' },
        { name: 'PRO', value: 0, color: '#10b981' },
      ],
      callDistribution: [
        { name: 'Completed', value: 0, color: '#10b981' },
        { name: 'Cancelled', value: 0, color: '#f43f5e' },
        { name: 'Active', value: 0, color: '#3b82f6' },
        { name: 'Pending', value: 0, color: '#f59e0b' },
      ],
      userRoleDistribution: [],
      callDurationDistribution: [],
      userGrowthData: [],
      revenueData: [],
      callVolumeData: [],
      busiestHours: Array.from({ length: 24 }, (_, h) => ({
        hour: `${String(h).padStart(2, '0')}:00`,
        calls: 0,
      })),
      topNannies: [],
      recentActivity: [],
    });
  }
}
