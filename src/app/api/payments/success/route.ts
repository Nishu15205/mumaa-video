import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { isStripeConfigured, getStripe, type PlanType, PLAN_LABELS } from '@/lib/stripe';

/**
 * GET /api/payments/success?session_id=xxx
 *
 * Handles the redirect after a successful Stripe checkout.
 * Verifies the session and returns subscription details.
 */
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

    // ------------------------------------------------------------------
    // Real Stripe verification
    // ------------------------------------------------------------------
    if (isStripeConfigured) {
      const stripe = getStripe();
      if (!stripe) {
        return NextResponse.json(
          { error: 'Stripe client not initialized' },
          { status: 500 }
        );
      }

      const session = await stripe.checkout.sessions.retrieve(sessionId);

      if (session.status !== 'complete') {
        return NextResponse.json(
          { error: 'Checkout session not completed', sessionStatus: session.status },
          { status: 400 }
        );
      }

      const plan = (session.metadata?.plan ?? 'BASIC') as PlanType;
      const userId = session.metadata?.userId;

      // Find the user's subscription in our DB
      let dbSubscription: any = null;
      if (userId) {
        dbSubscription = await db.subscription.findFirst({
          where: { userId },
          orderBy: { createdAt: 'desc' },
        });
      }

      return NextResponse.json({
        success: true,
        plan,
        sessionId,
        stripeSubscriptionId: session.subscription,
        stripeCustomerId: session.customer,
        dbSubscription,
        message: `Welcome to MUMAA! Your ${PLAN_LABELS[plan]} plan is now active. Enjoy your free trial!`,
      });
    }

    // ------------------------------------------------------------------
    // Mock verification (fallback)
    // ------------------------------------------------------------------
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
      plan,
      sessionId,
      message: `Welcome to MUMAA! Your ${plan} plan is now active with mock billing.`,
    });
  } catch (error: unknown) {
    console.error('Payment success verification error:', error);
    const message =
      error instanceof Error ? error.message : 'Verification failed';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
