// ============================================================
// MUMAA Platform — Client-side Push Notification Utilities
// ============================================================
// These helpers live outside React so they can be used from any
// client context (hooks, plain scripts, etc.).  They wrap the
// browser Push API + our backend subscribe/unsubscribe routes.
// ============================================================

// ── Types ─────────────────────────────────────────────────────

export interface PushSubscriptionObject {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export type PermissionStatus = 'default' | 'granted' | 'denied' | 'unsupported';

// ── Feature detection ────────────────────────────────────────

/**
 * Returns `true` when the current browser supports everything we
 * need: Service Workers, PushManager, and the Notification API.
 */
export function isPushSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

/**
 * Quick permission check without going through the SW.
 * Returns the current `Notification.permission` value mapped to
 * our `PermissionStatus` type, or `'unsupported'` when the API
 * is absent.
 */
export function getNotificationPermission(): PermissionStatus {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission as PermissionStatus;
}

// ── VAPID key helpers ─────────────────────────────────────────

/**
 * Convert a base64url-encoded VAPID public key into the Uint8Array
 * that `PushManager.subscribe()` expects for `applicationServerKey`.
 */
export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const output = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i += 1) {
    output[i] = rawData.charCodeAt(i);
  }
  return output;
}

/**
 * Fetch the VAPID public key from our backend.
 * Returns `null` when the server hasn't configured push.
 */
export async function fetchVapidPublicKey(): Promise<string | null> {
  try {
    const res = await fetch('/api/push/vapid-key');
    if (!res.ok) return null;
    const json = await res.json();
    return json.publicKey || null;
  } catch {
    return null;
  }
}

// ── Service Worker registration ───────────────────────────────

/**
 * Register `/sw.js` as the service worker for this origin.
 * Uses `{ scope: '/' }` so it controls the entire app.
 *
 * Returns the `ServiceWorkerRegistration` on success, `null` on
 * failure.
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null;

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });

    console.log('[Push Client] Service worker registered (scope: %s)', registration.scope);
    return registration;
  } catch (error) {
    console.error('[Push Client] Service worker registration failed:', error);
    return null;
  }
}

// ── Subscribe ─────────────────────────────────────────────────

/**
 * Full subscribe flow:
 *  1. Request notification permission from the user
 *  2. Register the service worker (if needed)
 *  3. Create a push subscription via `PushManager`
 *  4. Persist the subscription on the backend
 *
 * Requires a `userId` for the server to link the subscription.
 */
export async function subscribeToPush(
  userId: string
): Promise<{ success: boolean; error?: string }> {
  // 0. Guard: browser support
  if (!isPushSupported()) {
    return { success: false, error: 'Push notifications are not supported in this browser.' };
  }

  // 1. Request permission
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    return {
      success: false,
      error: permission === 'denied'
        ? 'Notification permission was denied. Please enable it in browser settings.'
        : 'Notification permission was dismissed.',
    };
  }

  // 2. Register / retrieve the service worker
  let registration: ServiceWorkerRegistration;
  try {
    registration = await navigator.serviceWorker.ready;
    // If ready resolves but scope is wrong, force a fresh register
    if (!registration.scope.includes(window.location.origin)) {
      registration = await registerServiceWorker() || registration;
    }
  } catch {
    registration = await registerServiceWorker() as ServiceWorkerRegistration;
  }

  if (!registration) {
    return { success: false, error: 'Failed to register the service worker.' };
  }

  // 3. Fetch VAPID public key
  const vapidKey = await fetchVapidPublicKey();
  if (!vapidKey) {
    return { success: false, error: 'Push is not configured on the server.' };
  }

  // 4. Create subscription
  let pushSubscription: PushSubscription;
  try {
    pushSubscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey),
    });
  } catch (error) {
    console.error('[Push Client] PushManager.subscribe() failed:', error);
    return { success: false, error: 'Failed to create a push subscription.' };
  }

  // 5. Serialize and send to backend
  const subJson = pushSubscription.toJSON();
  const subscriptionData: PushSubscriptionObject = {
    endpoint: pushSubscription.endpoint,
    keys: {
      p256dh: subJson.keys?.p256dh || '',
      auth: subJson.keys?.auth || '',
    },
  };

  try {
    const res = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, subscription: subscriptionData }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `Server responded with ${res.status}`);
    }

    console.log('[Push Client] Subscribed successfully');
    return { success: true };
  } catch (error) {
    console.error('[Push Client] Failed to persist subscription:', error);
    // Best-effort: unsubscribe locally so we don't end up in a weird state
    try { await pushSubscription.unsubscribe(); } catch { /* ignore */ }
    return { success: false, error: 'Failed to save subscription on the server.' };
  }
}

// ── Unsubscribe ───────────────────────────────────────────────

/**
 * Full unsubscribe flow:
 *  1. Retrieve the current push subscription from the browser
 *  2. Tell the backend to delete it
 *  3. Unsubscribe via the browser's PushManager
 */
export async function unsubscribeFromPush(
  userId: string
): Promise<{ success: boolean; error?: string }> {
  if (!isPushSupported()) {
    return { success: false, error: 'Push is not supported.' };
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      // Already unsubscribed — nothing to do
      return { success: true };
    }

    // Tell the server to forget about this subscription
    try {
      await fetch('/api/push/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, endpoint: subscription.endpoint }),
      });
    } catch {
      // If the server call fails we still try to unsubscribe locally
      console.warn('[Push Client] Could not notify server about unsubscribe');
    }

    // Remove the subscription from the browser
    await subscription.unsubscribe();
    console.log('[Push Client] Unsubscribed successfully');
    return { success: true };
  } catch (error) {
    console.error('[Push Client] Unsubscribe failed:', error);
    return { success: false, error: 'Failed to unsubscribe.' };
  }
}

// ── Convenience: check existing subscription ──────────────────

/**
 * Returns `true` when the browser already has an active push
 * subscription for this service worker.
 */
export async function hasActiveSubscription(): Promise<boolean> {
  if (!('serviceWorker' in navigator)) return false;

  try {
    const registration = await navigator.serviceWorker.ready;
    const sub = await registration.pushManager.getSubscription();
    return sub !== null;
  } catch {
    return false;
  }
}
