// ============================================================
// MUMAA Platform Constants
// ============================================================

import type { PricingPlan } from '@/types';

export const PRICING_PLANS: PricingPlan[] = [
  {
    id: 'FREE',
    name: 'Free',
    price: 0,
    trialDays: 0,
    popular: false,
    features: [
      '1 instant call per day',
      '2 scheduled calls per week',
      '15-minute max call duration',
      'Basic support',
      'Standard video quality',
    ],
  },
  {
    id: 'BASIC',
    name: 'Basic',
    price: 499,
    trialDays: 7,
    popular: true,
    features: [
      '4 instant calls per day',
      'Unlimited scheduled calls',
      '15-minute max call duration',
      'Priority support',
      'Call recording',
      'HD video quality',
      '7-day free trial',
    ],
  },
  {
    id: 'PRO',
    name: 'Pro',
    price: 999,
    trialDays: 7,
    popular: false,
    features: [
      'Unlimited instant calls',
      'Unlimited scheduled calls',
      '60-minute max call duration',
      '24/7 priority support',
      'Call recording',
      'Full HD video quality',
      'Family group calls',
      '7-day free trial',
    ],
  },
];

export const CALL_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pending',
  ACCEPTED: 'Accepted',
  ACTIVE: 'Active',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  NO_SHOW: 'No Show',
};

export const NOTIFICATION_TYPE_LABELS: Record<string, string> = {
  CALL_REQUEST: 'Call Request',
  CALL_SCHEDULED: 'Call Scheduled',
  CALL_COMPLETED: 'Call Completed',
  SUBSCRIPTION: 'Subscription',
  SYSTEM: 'System',
};

export const ROLE_LABELS: Record<string, string> = {
  PARENT: 'Parent',
  NANNY: 'Nanny',
  ADMIN: 'Admin',
};

export const MAX_CALL_DURATION: Record<string, number> = {
  FREE: 15 * 60,    // 15 minutes in seconds
  BASIC: 15 * 60,   // 15 minutes in seconds
  PRO: 60 * 60,     // 60 minutes in seconds
};

export const INSTANT_CALL_LIMITS: Record<string, number> = {
  FREE: 1,
  BASIC: 4,
  PRO: Infinity,
};

export const SCHEDULED_CALL_LIMITS: Record<string, number> = {
  FREE: 2,          // per week
  BASIC: Infinity,
  PRO: Infinity,
};

// 30 days in ms — used for 1-month free trial for newly approved nannies
export const NANNY_FREE_TRIAL_DAYS = 30;
