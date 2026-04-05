import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { checkRateLimit } from '@/lib/rate-limit';
import {
  isStripeConfigured,
  createCheckoutSession,
  PLAN_PRICES_INR,
  TRIAL_DAYS,
  type PlanType,
} from '@/lib/stripe';

const VALID_PLANS = ['BASIC', 'PRO'] as const;

export async function POST(req: NextRequest) {
  try {
    // Rate limiting check (payment: 10 req/min per IP)
    const { success, headers } = await checkRateLimit(req, 'payment');
    if (!success) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429, headers }
      );
    }

    const body = await req.json();
    const { userId, plan, amount } = body;

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

    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + TRIAL_DAYS);

    const currentPeriodEnds = new Date();
    currentPeriodEnds.setDate(currentPeriodEnds.getDate() + TRIAL_DAYS + 30);

    // ------------------------------------------------------------------
    // Real Stripe integration (when keys are configured)
    // ------------------------------------------------------------------
    if (isStripeConfigured) {
      const session = await createCheckoutSession({
        userId,
        userEmail: user.email,
        plan: plan as PlanType,
        customerStripeId: null, // Will be created by Stripe if new customer
      });

      if (!session) {
        return NextResponse.json(
          { error: 'Failed to create Stripe checkout session' },
          { status: 500 }
        );
      }

      // Create a PENDING subscription – will be activated by the webhook
      const subscription = await db.subscription.create({
        data: {
          userId,
          plan,
          status: 'ACTIVE', // Activated immediately for trial
          isTrial: true,
          trialEndsAt,
          currentPeriodEnds,
        },
      });

      // Create notification
      await db.notification.create({
        data: {
          userId,
          type: 'SUBSCRIPTION',
          title: 'Subscription Started',
          message: `Welcome! Your ${plan} plan checkout has been initiated. Complete payment on Stripe to activate your 7-day free trial.`,
          data: JSON.stringify({
            plan,
            sessionId: session.id,
            price: amount || PLAN_PRICES_INR[plan as PlanType],
            stripePaymentIntentId: session.payment_intent as string | null,
            stripeCustomerId: session.customer as string | null,
            mode: 'stripe',
          }),
        },
      });

      return NextResponse.json(
        {
          sessionId: session.id,
          url: session.url,
          subscription,
          stripe_payment_intent_id: session.payment_intent,
          stripe_customer_id: session.customer,
        },
        { status: 200, headers }
      );
    }

    // ------------------------------------------------------------------
    // Mock fallback (no Stripe keys configured)
    // ------------------------------------------------------------------
    const sessionId = `cs_mock_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const subscription = await db.subscription.create({
      data: {
        userId,
        plan,
        status: 'ACTIVE',
        isTrial: true,
        trialEndsAt,
        currentPeriodEnds,
      },
    });

    await db.notification.create({
      data: {
        userId,
        type: 'SUBSCRIPTION',
        title: 'Subscription Started',
        message: `Welcome! Your ${plan} plan free trial has started. You have ${TRIAL_DAYS} days of free access.`,
        data: JSON.stringify({
          plan,
          sessionId,
          price: amount || PLAN_PRICES_INR[plan as PlanType],
          mode: 'mock',
        }),
      },
    });

    return NextResponse.json(
      {
        sessionId,
        url: `/api/payments/success?session_id=${sessionId}`,
        subscription,
      },
      { status: 200, headers }
    );
  } catch (error: unknown) {
    console.error('Checkout error:', error);
    const message =
      error instanceof Error ? error.message : 'Payment processing failed';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
