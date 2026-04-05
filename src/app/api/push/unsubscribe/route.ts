import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, endpoint } = body;

    // Validate inputs
    if (!userId || typeof userId !== 'string') {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    if (!endpoint || typeof endpoint !== 'string') {
      return NextResponse.json(
        { error: 'endpoint is required' },
        { status: 400 }
      );
    }

    // Delete the subscription
    const result = await db.pushSubscription.deleteMany({
      where: {
        userId,
        endpoint,
      },
    });

    return NextResponse.json({
      success: true,
      message: result.count > 0 ? 'Push subscription removed' : 'No matching subscription found',
      removed: result.count,
    });
  } catch (error) {
    console.error('[Push Unsubscribe] Error:', error);
    return NextResponse.json(
      { error: 'Failed to remove push subscription' },
      { status: 500 }
    );
  }
}
