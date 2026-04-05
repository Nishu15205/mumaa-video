// ============================================================
// MUMAA Platform - Stripe Integration
// ============================================================

import Stripe from 'stripe';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
const STRIPE_BASIC_PRICE_ID = process.env.STRIPE_BASIC_PRICE_ID;
const STRIPE_PRO_PRICE_ID = process.env.STRIPE_PRO_PRICE_ID;
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

export const STRIPE_CONFIG = {
  basicPriceId: STRIPE_BASIC_PRICE_ID,
  proPriceId: STRIPE_PRO_PRICE_ID,
  webhookSecret: STRIPE_WEBHOOK_SECRET,
  baseUrl: BASE_URL,
} as const;

// ---------------------------------------------------------------------------
// Stripe singleton (lazy – only instantiated when keys are present)
// ---------------------------------------------------------------------------

let _stripe: Stripe | null = null;

/** Whether real Stripe keys are configured */
export const isStripeConfigured = Boolean(STRIPE_SECRET_KEY);

/**
 * Returns the configured Stripe instance.
 * Returns `null` when Stripe is not configured (mock / dev mode).
 */
export function getStripe(): Stripe | null {
  if (!isStripeConfigured) return null;
  if (!_stripe) {
    _stripe = new Stripe(STRIPE_SECRET_KEY!, {
      apiVersion: '2025-06-30.basil',
      typescript: true,
    });
  }
  return _stripe;
}

if (!isStripeConfigured) {
  console.warn(
    '[stripe] STRIPE_SECRET_KEY is not configured – running in mock / fallback mode.'
  );
}

// ---------------------------------------------------------------------------
// Plan helpers
// ---------------------------------------------------------------------------

export type PlanType = 'BASIC' | 'PRO';

export const PLAN_PRICES_INR: Record<PlanType, number> = {
  BASIC: 499,
  PRO: 999,
};

export const PLAN_PRICE_IDS: Record<PlanType, string | undefined> = {
  BASIC: STRIPE_BASIC_PRICE_ID,
  PRO: STRIPE_PRO_PRICE_ID,
};

export const PLAN_LABELS: Record<PlanType, string> = {
  BASIC: 'Basic',
  PRO: 'Pro',
};

export const TRIAL_DAYS = 7;

// ---------------------------------------------------------------------------
// Helper functions
// ---------------------------------------------------------------------------

export interface CreateCheckoutSessionParams {
  userId: string;
  userEmail: string;
  plan: PlanType;
  customerStripeId?: string | null;
}

/**
 * Create a Stripe Checkout Session for a subscription.
 * Falls back to `null` when Stripe is not configured.
 */
export async function createCheckoutSession(
  params: CreateCheckoutSessionParams
): Promise<Stripe.Checkout.Session | null> {
  const stripe = getStripe();
  if (!stripe) return null;

  const { userId, userEmail, plan, customerStripeId } = params;
  const priceId = PLAN_PRICE_IDS[plan];

  if (!priceId) {
    throw new Error(`No Stripe price ID configured for plan: ${plan}`);
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    customer: customerStripeId || undefined,
    customer_email: customerStripeId ? undefined : userEmail,
    line_items: [{ price: priceId, quantity: 1 }],
    subscription_data: {
      trial_period_days: TRIAL_DAYS,
      metadata: { userId, plan },
    },
    success_url: `${BASE_URL}/api/payments/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${BASE_URL}?cancelled=true`,
    metadata: { userId, plan },
  });

  return session;
}

export interface CreatePortalSessionParams {
  customerId: string;
  returnUrl: string;
}

/**
 * Create a Stripe Customer Portal session.
 * Falls back to `null` when Stripe is not configured.
 */
export async function createPortalSession(
  params: CreatePortalSessionParams
): Promise<Stripe.BillingPortal.Session | null> {
  const stripe = getStripe();
  if (!stripe) return null;

  const session = await stripe.billingPortal.sessions.create({
    customer: params.customerId,
    return_url: params.returnUrl,
  });

  return session;
}

export interface WebhookVerificationParams {
  payload: string | Buffer;
  signature: string;
}

/**
 * Verify a Stripe webhook signature and return the parsed event.
 * Returns `null` when Stripe is not configured.
 */
export function verifyWebhookSignature(
  params: WebhookVerificationParams
): Stripe.Event | null {
  const stripe = getStripe();
  if (!stripe || !STRIPE_WEBHOOK_SECRET) return null;

  const event = stripe.webhooks.constructEvent(
    params.payload,
    params.signature,
    STRIPE_WEBHOOK_SECRET
  );

  return event;
}
