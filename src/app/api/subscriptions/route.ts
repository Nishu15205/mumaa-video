import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    const subscription = await db.subscription.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    if (!subscription) {
      return NextResponse.json(
        { error: 'No subscription found' },
        { status: 404 }
      );
    }

    // Check if trial has expired
    if (subscription.isTrial && subscription.trialEndsAt) {
      const now = new Date();
      if (now > subscription.trialEndsAt && subscription.plan === 'FREE') {
        await db.subscription.update({
          where: { id: subscription.id },
          data: { status: 'EXPIRED' },
        });
        subscription.status = 'EXPIRED';
      }
    }

    // Check if billing period has ended
    if (subscription.currentPeriodEnds) {
      const now = new Date();
      if (now > subscription.currentPeriodEnds && subscription.status === 'ACTIVE') {
        await db.subscription.update({
          where: { id: subscription.id },
          data: { status: 'EXPIRED' },
        });
        subscription.status = 'EXPIRED';
      }
    }

    return NextResponse.json({ subscription });
  } catch (error: any) {
    console.error('Get subscription error:', error);
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    );
  }
}
