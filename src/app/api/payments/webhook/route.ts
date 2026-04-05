import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { db } from '@/lib/db';
import { isStripeConfigured, getStripe, type PlanType, PLAN_LABELS, TRIAL_DAYS } from '@/lib/stripe';

// ---------------------------------------------------------------------------
// Stripe webhook handler
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  try {
    if (!isStripeConfigured) {
      return NextResponse.json(
        { error: 'Stripe webhooks are not configured' },
        { status: 503 }
      );
    }

    const stripe = getStripe();
    if (!stripe) {
      return NextResponse.json(
        { error: 'Stripe client not initialized' },
        { status: 500 }
      );
    }

    const body = await req.text();
    const signature = req.headers.get('stripe-signature');

    if (!signature) {
      return NextResponse.json(
        { error: 'Missing stripe-signature header' },
        { status: 400 }
      );
    }

    // Verify webhook signature
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      return NextResponse.json(
        { error: 'Webhook secret not configured' },
        { status: 500 }
      );
    }

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Signature verification failed';
      console.error(`[webhook] Signature verification failed: ${message}`);
      return NextResponse.json({ error: message }, { status: 400 });
    }

    console.log(`[webhook] Received event: ${event.type}`);

    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event);
        break;
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event);
        break;
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event);
        break;
      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event);
        break;
      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event);
        break;
      default:
        console.log(`[webhook] Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error: unknown) {
    console.error('[webhook] Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// Event handlers
// ---------------------------------------------------------------------------

function mapStripeStatus(stripeStatus: string): string {
  switch (stripeStatus) {
    case 'active':
    case 'trialing':
      return 'ACTIVE';
    case 'canceled':
    case 'unpaid':
      return 'CANCELLED';
    case 'past_due':
      return 'ACTIVE'; // Keep active but warn
    default:
      return 'EXPIRED';
  }
}

async function handleCheckoutCompleted(event: Stripe.Event) {
  const session = event.data.object as Stripe.Checkout.Session;
  const { userId, plan: planStr } = session.metadata ?? {};

  if (!userId || !planStr) {
    console.warn('[webhook] Missing userId or plan in checkout metadata');
    return;
  }

  const plan = planStr as PlanType;

  // Expire existing subscriptions
  await db.subscription.updateMany({
    where: { userId, status: 'ACTIVE' },
    data: { status: 'EXPIRED' },
  });

  // Create new subscription
  const currentPeriodEnds = new Date();
  currentPeriodEnds.setDate(currentPeriodEnds.getDate() + TRIAL_DAYS + 30);

  const trialEndsAt = new Date();
  trialEndsAt.setDate(trialEndsAt.getDate() + TRIAL_DAYS);

  await db.subscription.create({
    data: {
      userId,
      plan,
      status: 'ACTIVE',
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
      title: 'Subscription Started!',
      message: `Welcome to MUMAA! Your ${PLAN_LABELS[plan]} plan free trial (${TRIAL_DAYS} days) has started.`,
      data: JSON.stringify({
        plan,
        stripeSessionId: session.id,
        isTrial: true,
      }),
    },
  });

  console.log(`[webhook] Checkout completed for user ${userId}, plan ${plan}`);
}

async function handleSubscriptionUpdated(event: Stripe.Event) {
  const subscription = event.data.object as unknown as Record<string, string>;
  const { userId, plan: planStr } = (subscription.metadata ?? {}) as Record<string, string>;

  if (!userId) {
    console.warn('[webhook] No userId in subscription metadata');
    return;
  }

  const plan = (planStr ?? 'BASIC') as PlanType;
  const stripeStatus = subscription.status;
  const dbStatus = mapStripeStatus(stripeStatus);

  const existingSubscription = await db.subscription.findFirst({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });

  if (existingSubscription) {
    const currentPeriodEnd = subscription.current_period_end;
    const trialEnd = subscription.trial_end;

    await db.subscription.update({
      where: { id: existingSubscription.id },
      data: {
        status: dbStatus,
        plan,
        isTrial: stripeStatus === 'trialing',
        currentPeriodEnds: currentPeriodEnd ? new Date(Number(currentPeriodEnd) * 1000) : undefined,
        trialEndsAt: trialEnd ? new Date(Number(trialEnd) * 1000) : undefined,
      },
    });
  }

  console.log(`[webhook] Subscription updated for user ${userId}: ${stripeStatus} → ${dbStatus}`);
}

async function handleSubscriptionDeleted(event: Stripe.Event) {
  const subscription = event.data.object as unknown as Record<string, string>;
  const { userId } = (subscription.metadata ?? {}) as Record<string, string>;

  if (!userId) {
    console.warn('[webhook] No userId in subscription metadata');
    return;
  }

  await db.subscription.updateMany({
    where: { userId, status: 'ACTIVE' },
    data: { status: 'CANCELLED' },
  });

  await db.notification.create({
    data: {
      userId,
      type: 'SUBSCRIPTION',
      title: 'Subscription Cancelled',
      message: 'Your subscription has been cancelled. You can still use the platform with limited features.',
      data: JSON.stringify({ cancelledAt: new Date().toISOString() }),
    },
  });

  console.log(`[webhook] Subscription cancelled for user ${userId}`);
}

async function handleInvoicePaymentSucceeded(event: Stripe.Event) {
  const invoice = event.data.object as unknown as Record<string, any>;
  const customerId = typeof invoice.customer === 'string'
    ? invoice.customer
    : invoice.customer?.id;

  if (!customerId) {
    console.warn('[webhook] No customer ID in invoice');
    return;
  }

  const subscriptionId = invoice.subscription as string | null;
  if (!subscriptionId) return;

  const stripe = getStripe();
  if (!stripe) return;

  try {
    const stripeSubscription = await stripe.subscriptions.retrieve(subscriptionId);
    const userId = stripeSubscription.metadata?.userId;

    if (userId) {
      await db.notification.create({
        data: {
          userId,
          type: 'SUBSCRIPTION',
          title: 'Payment Received',
          message: `Your payment of ₹${((invoice.amount_paid || 0) / 100).toFixed(2)} has been received. Thank you!`,
          data: JSON.stringify({
            invoiceId: invoice.id,
            amount: invoice.amount_paid,
            currency: invoice.currency,
          }),
        },
      });
    }
  } catch {
    console.warn('[webhook] Could not retrieve subscription for invoice');
  }

  console.log(`[webhook] Invoice payment succeeded for customer ${customerId}`);
}

async function handleInvoicePaymentFailed(event: Stripe.Event) {
  const invoice = event.data.object as unknown as Record<string, any>;
  const subscriptionId = invoice.subscription as string | null;
  if (!subscriptionId) return;

  const stripe = getStripe();
  if (!stripe) return;

  try {
    const stripeSubscription = await stripe.subscriptions.retrieve(subscriptionId);
    const userId = stripeSubscription.metadata?.userId;

    if (userId) {
      await db.notification.create({
        data: {
          userId,
          type: 'SUBSCRIPTION',
          title: 'Payment Failed',
          message: 'We could not process your payment. Please update your payment method to avoid service interruption.',
          data: JSON.stringify({
            invoiceId: invoice.id,
            amount: invoice.amount_due,
          }),
        },
      });
    }
  } catch {
    console.warn('[webhook] Could not retrieve subscription for failed invoice');
  }

  console.log(`[webhook] Invoice payment failed`);
}
