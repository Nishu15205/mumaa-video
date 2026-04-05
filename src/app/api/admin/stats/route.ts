import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const [
      totalUsers,
      totalNannies,
      totalParents,
      totalCalls,
      activeCalls,
      completedCalls,
      totalRevenue,
    ] = await Promise.all([
      db.user.count({ where: { role: { in: ['PARENT', 'NANNY'] } } }),
      db.user.count({ where: { role: 'NANNY' } }),
      db.user.count({ where: { role: 'PARENT' } }),
      db.callSession.count(),
      db.callSession.count({ where: { status: 'ACTIVE' } }),
      db.callSession.count({ where: { status: 'COMPLETED' } }),
      db.callSession.aggregate({
        where: { status: 'COMPLETED' },
        _sum: { price: true },
      }),
    ]);

    const activeSubscriptions = await db.subscription.count({
      where: { status: 'ACTIVE' },
    });

    return NextResponse.json({
      stats: {
        totalUsers,
        totalNannies,
        totalParents,
        totalCalls,
        activeCalls,
        completedCalls,
        totalRevenue: totalRevenue._sum.price || 0,
        activeSubscriptions,
      },
    });
  } catch (error: any) {
    console.error('Get admin stats error:', error);
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    );
  }
}
