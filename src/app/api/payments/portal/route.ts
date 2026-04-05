import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { isStripeConfigured, createPortalSession, STRIPE_CONFIG } from '@/lib/stripe';

/**
 * POST /api/payments/portal
 *
 * Creates a Stripe Customer Portal session so the user can manage their
 * subscription, update payment methods, and view invoices.
 *
 * Body: { userId: string }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    if (!isStripeConfigured) {
      return NextResponse.json(
        { error: 'Stripe is not configured. Portal is available in production only.' },
        { status: 503 }
      );
    }

    // Find the user
    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Find user's Stripe customer ID from their notifications (stored during checkout)
    const latestNotification = await db.notification.findFirst({
      where: {
        userId,
        type: 'SUBSCRIPTION',
      },
      orderBy: { createdAt: 'desc' },
    });

    let stripeCustomerId: string | null = null;

    if (latestNotification?.data) {
      try {
        const notifData = JSON.parse(latestNotification.data);
        stripeCustomerId = notifData.stripeCustomerId ?? null;
      } catch {
        // Data was not valid JSON, ignore
      }
    }

    if (!stripeCustomerId) {
      return NextResponse.json(
        {
          error:
            'No Stripe customer found for this user. Please subscribe to a plan first.',
        },
        { status: 404 }
      );
    }

    const returnUrl = STRIPE_CONFIG.baseUrl;

    const portalSession = await createPortalSession({
      customerId: stripeCustomerId,
      returnUrl,
    });

    if (!portalSession) {
      return NextResponse.json(
        { error: 'Failed to create portal session' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      url: portalSession.url,
    });
  } catch (error: unknown) {
    console.error('Portal session error:', error);
    const message =
      error instanceof Error ? error.message : 'Failed to create portal session';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
