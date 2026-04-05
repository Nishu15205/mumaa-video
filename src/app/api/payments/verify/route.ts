import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { db } from '@/lib/db';
import { isStripeConfigured, getStripe } from '@/lib/stripe';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('session_id');

    if (!sessionId) {
      return NextResponse.json(
        { error: 'session_id is required' },
        { status: 400 }
      );
    }

    // Real Stripe verification
    if (isStripeConfigured) {
      const stripe = getStripe();
      if (!stripe) {
        return NextResponse.json(
          { error: 'Stripe client not initialized' },
          { status: 500 }
        );
      }

      const session = await stripe.checkout.sessions.retrieve(sessionId, {
        expand: ['subscription', 'customer'],
      });

      const sub = session.subscription as Stripe.Subscription | null;
      const isPaymentComplete =
        session.payment_status === 'paid' ||
        session.status === 'complete';

      const plan = session.metadata?.plan ?? 'BASIC';
      const userId = session.metadata?.userId;

      let dbSubscription: Record<string, unknown> | null = null;
      if (userId) {
        dbSubscription = await db.subscription.findFirst({
          where: { userId },
          orderBy: { createdAt: 'desc' },
        });
      }

      return NextResponse.json({
        success: true,
        sessionId: session.id,
        paymentStatus: session.payment_status,
        sessionStatus: session.status,
        plan,
        isPaymentComplete,
        stripeSubscriptionId: session.subscription,
        stripeCustomerId: session.customer,
        subscriptionStatus: sub?.status ?? null,
        isTrial: sub?.status === 'trialing',
        trialEnd: sub?.trial_end
          ? new Date(sub.trial_end * 1000).toISOString()
          : null,
        currentPeriodEnd: sub?.current_period_end
          ? new Date(sub.current_period_end * 1000).toISOString()
          : null,
        dbSubscription,
      });
    }

    // Mock verification (fallback)
    const isValid = sessionId.startsWith('cs_mock_');

    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid session' },
        { status: 400 }
      );
    }

    const plan = sessionId.includes('basic') || sessionId.includes('BASIC') ? 'BASIC' : 'PRO';

    return NextResponse.json({
      success: true,
      sessionId,
      paymentStatus: 'paid',
      sessionStatus: 'complete',
      plan,
      isPaymentComplete: true,
      isTrial: true,
      mode: 'mock',
    });
  } catch (error: unknown) {
    console.error('Payment verify error:', error);
    const message =
      error instanceof Error ? error.message : 'Verification failed';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
