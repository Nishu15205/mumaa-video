/**
 * Resolve the Socket.IO service URL for server-side HTTP API calls (e.g., /emit).
 *
 * Render's `fromService.hostport` may include an internal Docker port like `:10000`.
 * The external URL may or may not need this port depending on the deployment config.
 *
 * This utility tries the URL as-is first, then falls back to without the port.
 */

let cachedSocketUrl: string | null = null;
let socketUrlVerified = false;

function getBaseSocketUrl(): string {
  if (cachedSocketUrl) return cachedSocketUrl;

  const url = process.env.SOCKET_API_URL
    || process.env.NEXT_PUBLIC_SOCKET_URL
    || `http://localhost:${process.env.SOCKET_API_PORT || 3003}`;

  cachedSocketUrl = url.replace(/\/+$/, '');
  return cachedSocketUrl;
}

/**
 * Emit a socket event to a specific user via the Socket.IO HTTP API.
 * Returns { success: true, delivered: boolean } or { success: false, error: string }.
 */
export async function emitToUser(
  toUserId: string,
  event: string,
  data: Record<string, any>,
  timeoutMs: number = 5000
): Promise<{ success: boolean; delivered?: boolean; reason?: string; error?: string }> {
  const baseUrl = getBaseSocketUrl();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  const payload = { toUserId, event, data };

  // Try 1: With the configured URL as-is
  try {
    const res = await fetch(`${baseUrl}/emit`, {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json', 'Connection': 'close' },
      body: JSON.stringify(payload),
    });
    const result = await res.json();

    if (!socketUrlVerified) {
      // This URL works — cache it
      socketUrlVerified = true;
      console.log(`[SocketAPI] Verified URL: ${baseUrl}/emit`);
    }

    return {
      success: true,
      delivered: result.delivered === true,
      reason: result.reason,
    };
  } catch (primaryErr) {
    // Try 2: Without port (Render external URL doesn't need internal Docker port)
    const urlNoPort = baseUrl.replace(/:\d+$/, '');
    if (urlNoPort !== baseUrl) {
      try {
        const res = await fetch(`${urlNoPort}/emit`, {
          method: 'POST',
          signal: controller.signal,
          headers: { 'Content-Type': 'application/json', 'Connection': 'close' },
          body: JSON.stringify(payload),
        });
        const result = await res.json();

        // This URL works — cache it for future calls
        cachedSocketUrl = urlNoPort;
        socketUrlVerified = true;
        console.log(`[SocketAPI] Fallback URL works, cached: ${urlNoPort}/emit`);

        return {
          success: true,
          delivered: result.delivered === true,
          reason: result.reason,
        };
      } catch {
        // Both failed
      }
    }

    clearTimeout(timeout);
    return {
      success: false,
      error: `Socket service unreachable: ${baseUrl}`,
    };
  } finally {
    clearTimeout(timeout);
  }
}
