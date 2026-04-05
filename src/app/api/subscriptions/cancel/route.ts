import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { isStripeConfigured, getStripe } from '@/lib/stripe';

/**
 * POST /api/subscriptions/cancel
 *
 * Cancels the user's active subscription.
 * When Stripe is configured, also cancels the subscription on Stripe's side.
 * Falls back to local-only cancellation when Stripe is not configured.
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

    const subscription = await db.subscription.findFirst({
      where: {
        userId,
        status: 'ACTIVE',
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!subscription) {
      return NextResponse.json(
        { error: 'No active subscription found' },
        { status: 404 }
      );
    }

    // ------------------------------------------------------------------
    // Cancel on Stripe if configured
    // ------------------------------------------------------------------
    if (isStripeConfigured) {
      const stripe = getStripe();

      // Try to find Stripe subscription ID from notifications
      const latestNotification = await db.notification.findFirst({
        where: { userId, type: 'SUBSCRIPTION' },
        orderBy: { createdAt: 'desc' },
      });

      let stripeSubscriptionId: string | null = null;
      if (latestNotification?.data) {
        try {
          const data = JSON.parse(latestNotification.data);
          stripeSubscriptionId = data.stripeSubscriptionId ?? null;
        } catch {
          // ignore parse error
        }
      }

      // Also try from any notification's data field
      if (!stripeSubscriptionId) {
        const allNotifs = await db.notification.findMany({
          where: { userId, type: 'SUBSCRIPTION' },
          orderBy: { createdAt: 'desc' },
          take: 5,
        });

        for (const n of allNotifs) {
          if (n.data) {
            try {
              const d = JSON.parse(n.data);
              if (d.stripeSubscriptionId) {
                stripeSubscriptionId = d.stripeSubscriptionId;
                break;
              }
            } catch {
              continue;
            }
          }
        }
      }

      if (stripe && stripeSubscriptionId) {
        try {
          await stripe.subscriptions.cancel(stripeSubscriptionId);
          console.log(
            `[cancel] Cancelled Stripe subscription ${stripeSubscriptionId} for user ${userId}`
          );
        } catch (err) {
          console.warn(
            `[cancel] Could not cancel Stripe subscription (may already be cancelled):`,
            err
          );
        }
      }
    }

    // ------------------------------------------------------------------
    // Cancel locally regardless of Stripe status
    // ------------------------------------------------------------------
    const updatedSubscription = await db.subscription.update({
      where: { id: subscription.id },
      data: { status: 'CANCELLED' },
    });

    // Create notification
    await db.notification.create({
      data: {
        userId,
        type: 'SUBSCRIPTION',
        title: 'Subscription Cancelled',
        message: `Your ${subscription.plan} subscription has been cancelled. You can continue using the free plan.`,
        data: JSON.stringify({
          cancelledPlan: subscription.plan,
          mode: isStripeConfigured ? 'stripe' : 'mock',
        }),
      },
    });

    // Create a new FREE subscription
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 7);

    const freeSubscription = await db.subscription.create({
      data: {
        userId,
        plan: 'FREE',
        status: 'ACTIVE',
        isTrial: true,
        trialEndsAt,
      },
    });

    return NextResponse.json({
      subscription: updatedSubscription,
      newSubscription: freeSubscription,
      message: 'Subscription cancelled. You are now on the free plan.',
    });
  } catch (error: unknown) {
    console.error('Cancel subscription error:', error);
    const message =
      error instanceof Error ? error.message : 'Something went wrong';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
