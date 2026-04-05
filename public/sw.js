// ============================================================
// MUMAA Platform - Service Worker for Push Notifications
// ============================================================

const CACHE_NAME = 'mumaa-push-v2';

// Default icon paths (rose/pink MUMAA branding)
const MUMAA_ICON = '/logo.svg';
const MUMAA_BADGE = '/logo.svg';

// Install — activate immediately, don't wait for old SW to die
self.addEventListener('install', (event) => {
  console.log('[MUMAA SW] Installing...');
  event.waitUntil(self.skipWaiting());
});

// Activate — clean stale caches and claim every open tab
self.addEventListener('activate', (event) => {
  console.log('[MUMAA SW] Activating...');
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(
          names
            .filter((n) => n.startsWith('mumaa-') && n !== CACHE_NAME)
            .map((n) => caches.delete(n))
        )
      )
      .then(() => self.clients.claim())
  );
});

// Push — show a notification with rich content
self.addEventListener('push', (event) => {
  // Ignore push events with no data (some browsers fire a blank one)
  if (!event.data) {
    event.waitUntil(
      self.registration.showNotification('MUMAA', {
        body: 'You have a new notification.',
        icon: MUMAA_ICON,
        badge: MUMAA_BADGE,
      })
    );
    return;
  }

  let payload;

  try {
    payload = event.data.json();
  } catch {
    // Server sent plain text instead of JSON — use it as the body
    const text = event.data.text();
    payload = {
      title: 'MUMAA',
      body: text || 'You have a new notification.',
    };
  }

  const isCall = payload.type === 'CALL_REQUEST';

  const options = {
    body: payload.body || '',
    icon: payload.icon || MUMAA_ICON,
    badge: payload.badge || MUMAA_BADGE,
    image: payload.image || undefined,
    tag: payload.tag || 'mumaa-notification',
    data: {
      ...payload.data,
      url: payload.data?.url || '/',
      type: payload.type || 'SYSTEM',
    },
    requireInteraction: payload.requireInteraction || false,
    // Urgent vibration for incoming calls; gentle tap for everything else
    vibrate: isCall ? [300, 150, 300, 150, 300] : [100],
    actions: payload.actions || undefined,
    // Add a subtle rose tint via renotify (new notification replaces old one with same tag)
    renotify: true,
  };

  // Incoming calls get special treatment
  if (isCall) {
    options.actions = [
      { action: 'accept', title: 'Accept Call' },
      { action: 'decline', title: 'Decline' },
    ];
    options.requireInteraction = true;
    // Ensure call notifications always show even if one with same tag exists
    options.tag = payload.tag || `call-${payload.data?.callId || Date.now()}`;
  }

  const title = payload.title || 'MUMAA Notification';

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Notification click — focus existing window, open a new one, or handle actions
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const data = event.notification.data || {};
  const url = data.url || '/';

  // Handle in-app action buttons (accept / decline)
  if (event.action === 'accept' || event.action === 'decline') {
    handleCallAction(event.action, data);
    return;
  }

  // Default click — focus the app or open a new tab
  event.waitUntil(
    openOrFocus(url)
  );
});

// Notification close (user swiped it away)
self.addEventListener('notificationclose', (event) => {
  const data = event.notification.data || {};

  // If a call notification was dismissed, let the app know so it can clean up
  if (data.type === 'CALL_REQUEST' && data.callId) {
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        client.postMessage({
          type: 'PUSH_CALL_DISMISSED',
          callId: data.callId,
        });
      }
    });
  }
});

// Allow the main thread to tell this SW to skip waiting
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// ── Helpers ────────────────────────────────────────────────────

/**
 * Try to focus an existing MUMAA tab; if none exist, open a new one.
 */
function openOrFocus(url) {
  return self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
    // Prefer a client that is already on the same origin
    for (const client of clients) {
      if (client.url.includes(self.location.origin) && 'focus' in client) {
        return client.focus();
      }
    }

    // No suitable window — open one
    if (self.clients.openWindow) {
      return self.clients.openWindow(url);
    }

    return null;
  });
}

/**
 * Handle accept/decline call actions from notification buttons.
 * Posts a message to the app window and opens it if needed.
 */
function handleCallAction(action, data) {
  const callId = data.callId;
  const url = callId ? `/?call=${callId}&action=${action}` : '/';

  self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
    let found = false;

    for (const client of clients) {
      if (client.url.includes(self.location.origin) && 'focus' in client) {
        // Let the app handle the action in-band
        client.postMessage({
          type: 'PUSH_CALL_ACTION',
          action,
          callId,
        });
        client.focus();
        found = true;
        break;
      }
    }

    // No open window — open one with action params in the URL
    if (!found && self.clients.openWindow) {
      return self.clients.openWindow(url);
    }

    return null;
  });
}
