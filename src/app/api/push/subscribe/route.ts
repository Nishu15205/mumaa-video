import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getVapidPublicKey, sendPushNotification, isPushAvailable } from '@/lib/push';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, subscription } = body;

    // Validate inputs
    if (!userId || typeof userId !== 'string') {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    if (
      !subscription ||
      typeof subscription.endpoint !== 'string' ||
      !subscription.keys ||
      typeof subscription.keys.p256dh !== 'string' ||
      typeof subscription.keys.auth !== 'string'
    ) {
      return NextResponse.json(
        { error: 'Invalid subscription format. Expected: { endpoint, keys: { p256dh, auth } }' },
        { status: 400 }
      );
    }

    // Check if push is configured
    if (!isPushAvailable()) {
      return NextResponse.json(
        { error: 'Push notifications are not configured on this server' },
        { status: 503 }
      );
    }

    // Upsert subscription (replace if same endpoint exists for same user)
    // First delete any existing subscription for this endpoint
    await db.pushSubscription.deleteMany({
      where: { endpoint: subscription.endpoint },
    });

    // Create new subscription
    await db.pushSubscription.create({
      data: {
        userId,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      },
    });

    // Send a welcome notification
    try {
      await sendPushNotification(subscription, {
        type: 'SYSTEM',
        title: 'Notifications Enabled',
        body: 'You will now receive push notifications from MUMAA.',
        url: '/',
        tag: 'push-enabled',
      });
    } catch {
      // Ignore welcome notification failures
    }

    return NextResponse.json({
      success: true,
      message: 'Push subscription saved',
      publicKey: getVapidPublicKey(),
    });
  } catch (error) {
    console.error('[Push Subscribe] Error:', error);
    return NextResponse.json(
      { error: 'Failed to save push subscription' },
      { status: 500 }
    );
  }
}
