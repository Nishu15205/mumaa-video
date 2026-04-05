import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { isStripeConfigured, getStripe, type PlanType, PLAN_PRICE_IDS, PLAN_LABELS, TRIAL_DAYS } from '@/lib/stripe';

const VALID_PLANS = ['BASIC', 'PRO'] as const;
const PLAN_PRICES_INR: Record<string, number> = {
  BASIC: 499,
  PRO: 999,
};

/**
 * POST /api/subscriptions/upgrade
 *
 * Upgrades an existing subscription. When Stripe is configured, creates a new
 * Stripe Checkout Session for the upgraded plan. Falls back to mock behavior
 * when Stripe is not configured.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, plan } = body;

    if (!userId || !plan) {
      return NextResponse.json(
        { error: 'userId and plan are required' },
        { status: 400 }
      );
    }

    if (!VALID_PLANS.includes(plan)) {
      return NextResponse.json(
        { error: 'Plan must be BASIC or PRO' },
        { status: 400 }
      );
    }

    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Expire any existing active subscriptions
    await db.subscription.updateMany({
      where: {
        userId,
        status: 'ACTIVE',
      },
      data: { status: 'EXPIRED' },
    });

    const currentPeriodEnds = new Date();
    currentPeriodEnds.setDate(currentPeriodEnds.getDate() + 30);

    // ------------------------------------------------------------------
    // Real Stripe upgrade
    // ------------------------------------------------------------------
    if (isStripeConfigured) {
      const stripe = getStripe();
      if (!stripe) {
        return NextResponse.json(
          { error: 'Stripe client not initialized' },
          { status: 500 }
        );
      }

      const priceId = PLAN_PRICE_IDS[plan as PlanType];
      if (!priceId) {
        return NextResponse.json(
          { error: `No Stripe price ID configured for plan: ${plan}` },
          { status: 400 }
        );
      }

      // Find existing Stripe customer ID from notifications
      const latestNotification = await db.notification.findFirst({
        where: { userId, type: 'SUBSCRIPTION' },
        orderBy: { createdAt: 'desc' },
      });

      let stripeCustomerId: string | null = null;
      if (latestNotification?.data) {
        try {
          const data = JSON.parse(latestNotification.data);
          stripeCustomerId = data.stripeCustomerId ?? null;
        } catch {
          // ignore parse error
        }
      }

      // Create checkout session for upgrade
      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        payment_method_types: ['card'],
        customer: stripeCustomerId || undefined,
        customer_email: stripeCustomerId ? undefined : user.email,
        line_items: [{ price: priceId, quantity: 1 }],
        subscription_data: {
          trial_period_days: TRIAL_DAYS,
          metadata: { userId, plan },
        },
        success_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/payments/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}?cancelled=true`,
        metadata: { userId, plan, upgrade: 'true' },
      });

      const subscription = await db.subscription.create({
        data: {
          userId,
          plan,
          status: 'ACTIVE',
          isTrial: true,
          trialEndsAt: new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000),
          currentPeriodEnds,
        },
      });

      await db.notification.create({
        data: {
          userId,
          type: 'SUBSCRIPTION',
          title: 'Subscription Upgraded',
          message: `Your subscription has been upgraded to ${PLAN_LABELS[plan as PlanType]}. Complete payment on Stripe to activate.`,
          data: JSON.stringify({
            plan,
            price: PLAN_PRICES_INR[plan],
            sessionId: session.id,
            stripeCustomerId: session.customer,
            stripePaymentIntentId: session.payment_intent,
            upgrade: true,
            mode: 'stripe',
          }),
        },
      });

      return NextResponse.json(
        {
          sessionId: session.id,
          url: session.url,
          subscription,
          message: `Redirecting to Stripe to complete your ${plan} plan upgrade.`,
          stripe_payment_intent_id: session.payment_intent,
          stripe_customer_id: session.customer,
        },
        { status: 201 }
      );
    }

    // ------------------------------------------------------------------
    // Mock upgrade fallback
    // ------------------------------------------------------------------
    const subscription = await db.subscription.create({
      data: {
        userId,
        plan,
        status: 'ACTIVE',
        isTrial: false,
        currentPeriodEnds,
      },
    });

    await db.notification.create({
      data: {
        userId,
        type: 'SUBSCRIPTION',
        title: 'Subscription Upgraded',
        message: `Your subscription has been upgraded to the ${plan} plan at ₹${PLAN_PRICES_INR[plan]}/month.`,
        data: JSON.stringify({ plan, price: PLAN_PRICES_INR[plan], mode: 'mock' }),
      },
    });

    return NextResponse.json(
      {
        subscription,
        message: `Successfully upgraded to ${plan} plan`,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error('Upgrade subscription error:', error);
    const message =
      error instanceof Error ? error.message : 'Something went wrong';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
