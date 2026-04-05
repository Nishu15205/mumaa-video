// ============================================================
// MUMAA Platform - Web Push Notification Utility
// ============================================================

import webpush from 'web-push';
import { db } from '@/lib/db';

// Types
export interface PushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export type PushNotificationType =
  | 'CALL_REQUEST'
  | 'CALL_SCHEDULED'
  | 'CALL_COMPLETED'
  | 'SUBSCRIPTION'
  | 'SYSTEM';

export interface PushNotificationPayload {
  type: PushNotificationType;
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  url?: string;
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
  data?: Record<string, unknown>;
  tag?: string;
  requireInteraction?: boolean;
}

// Check if VAPID keys are configured
const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:support@mumaa.com';

const isPushConfigured = !!(vapidPublicKey && vapidPrivateKey);

if (!isPushConfigured) {
  console.warn(
    '[Push Notifications] VAPID keys not configured. Set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY in .env to enable push notifications.'
  );
} else {
  webpush.setVapidDetails(vapidSubject, vapidPublicKey!, vapidPrivateKey!);
}

// Default icon and badge URLs
const DEFAULT_ICON = '/logo.svg';
const DEFAULT_BADGE = '/logo.svg';
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || '';

// Get VAPID public key for client-side use
export function getVapidPublicKey(): string | null {
  return vapidPublicKey || null;
}

// Send push notification to a specific subscription
export async function sendPushNotification(
  subscription: PushSubscriptionData,
  payload: PushNotificationPayload
): Promise<boolean> {
  if (!isPushConfigured) {
    console.warn('[Push] Cannot send: VAPID not configured');
    return false;
  }

  try {
    const notificationPayload: webpush.PushPayload = {
      title: payload.title,
      body: payload.body,
      icon: payload.icon || DEFAULT_ICON,
      badge: payload.badge || DEFAULT_BADGE,
      data: {
        url: payload.url || BASE_URL,
        type: payload.type,
        ...payload.data,
      },
      tag: payload.tag,
      requireInteraction: payload.requireInteraction || false,
    };

    if (payload.actions && payload.actions.length > 0) {
      notificationPayload.actions = payload.actions;
    }

    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
        },
      },
      JSON.stringify(notificationPayload),
      {
        TTL: 24 * 60 * 60, // 24 hours
        urgency: payload.type === 'CALL_REQUEST' ? 'high' : 'normal',
      }
    );

    console.log(`[Push] Sent to ${subscription.endpoint.substring(0, 50)}...`);
    return true;
  } catch (error: unknown) {
    const err = error as Error & { statusCode?: number };
    // Cleanup invalid subscriptions (410 Gone or 404 Not Found)
    if (err.statusCode === 410 || err.statusCode === 404) {
      console.warn(`[Push] Subscription expired/invalid: ${subscription.endpoint.substring(0, 50)}...`);
      try {
        await db.pushSubscription.deleteMany({
          where: { endpoint: subscription.endpoint },
        });
      } catch {
        // Ignore cleanup errors
      }
    } else {
      console.error(`[Push] Failed to send:`, err.message);
    }
    return false;
  }
}

// Send push notification to a user (all their subscriptions)
export async function sendPushToUser(
  userId: string,
  payload: PushNotificationPayload
): Promise<{ sent: number; failed: number }> {
  const subscriptions = await db.pushSubscription.findMany({
    where: { userId },
  });

  if (subscriptions.length === 0) {
    return { sent: 0, failed: 0 };
  }

  let sent = 0;
  let failed = 0;

  // Send to all subscriptions concurrently
  const results = await Promise.allSettled(
    subscriptions.map((sub) =>
      sendPushNotification(
        {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        },
        payload
      )
    )
  );

  for (const result of results) {
    if (result.status === 'fulfilled' && result.value) {
      sent++;
    } else {
      failed++;
    }
  }

  return { sent, failed };
}

// Helper: Create an incoming call notification payload
export function createIncomingCallPayload(callerName: string, callId: string): PushNotificationPayload {
  return {
    type: 'CALL_REQUEST',
    title: `Incoming Call from ${callerName}`,
    body: `${callerName} is calling you. Tap Accept to join.`,
    icon: DEFAULT_ICON,
    badge: DEFAULT_BADGE,
    url: `${BASE_URL}?call=${callId}`,
    actions: [
      { action: 'accept', title: 'Accept Call' },
      { action: 'decline', title: 'Decline' },
    ],
    data: { callId },
    tag: `call-${callId}`,
    requireInteraction: true,
  };
}

// Helper: Create a call scheduled notification payload
export function createCallScheduledPayload(
  nannyName: string,
  scheduledDate: string
): PushNotificationPayload {
  return {
    type: 'CALL_SCHEDULED',
    title: 'Call Scheduled',
    body: `Your call with ${nannyName} is scheduled for ${scheduledDate}`,
    icon: DEFAULT_ICON,
    badge: DEFAULT_BADGE,
    url: BASE_URL,
    data: { nannyName },
    tag: 'call-scheduled',
  };
}

// Helper: Create a call completed notification payload
export function createCallCompletedPayload(
  otherPartyName: string,
  duration: number
): PushNotificationPayload {
  const minutes = Math.floor(duration / 60);
  const seconds = duration % 60;
  const formattedDuration = minutes > 0
    ? `${minutes}m ${seconds}s`
    : `${seconds}s`;

  return {
    type: 'CALL_COMPLETED',
    title: 'Call Ended',
    body: `Call with ${otherPartyName} ended. Duration: ${formattedDuration}`,
    icon: DEFAULT_ICON,
    badge: DEFAULT_BADGE,
    url: BASE_URL,
    data: { otherPartyName, duration },
  };
}

// Helper: Create a subscription update notification payload
export function createSubscriptionPayload(
  planName: string,
  status: string
): PushNotificationPayload {
  return {
    type: 'SUBSCRIPTION',
    title: 'Subscription Update',
    body: `Your ${planName} subscription has been ${status.toLowerCase()}.`,
    icon: DEFAULT_ICON,
    badge: DEFAULT_BADGE,
    url: `${BASE_URL}?view=subscription`,
    data: { planName, status },
  };
}

// Helper: Create a system notification payload
export function createSystemPayload(title: string, body: string): PushNotificationPayload {
  return {
    type: 'SYSTEM',
    title: title || 'MUMAA Notification',
    body: body || 'You have a new update.',
    icon: DEFAULT_ICON,
    badge: DEFAULT_BADGE,
    url: BASE_URL,
  };
}

// Check if push is available
export function isPushAvailable(): boolean {
  return isPushConfigured;
}
