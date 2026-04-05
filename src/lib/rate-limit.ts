import { RateLimiterMemory, RateLimiterRes } from 'rate-limiter-flexible';
import { NextRequest } from 'next/server';

// ============================================================
// Rate Limiting Configuration
// ============================================================

/**
 * Rate limit type categories with different thresholds.
 * Each type maps to a specific number of requests per minute per key (IP or userId).
 */
export type RateLimitType = 'auth' | 'search' | 'general' | 'payment' | 'upload';

interface RateLimitConfig {
  points: number;        // Max requests per window
  duration: number;      // Window duration in seconds
  blockDuration?: number; // Seconds to block after hitting limit (default: duration)
}

const RATE_LIMIT_CONFIGS: Record<RateLimitType, RateLimitConfig> = {
  auth: {
    points: 5,
    duration: 60, // 5 requests per minute
    blockDuration: 120, // Block for 2 minutes after hitting limit
  },
  search: {
    points: 30,
    duration: 60, // 30 requests per minute
    blockDuration: 30,
  },
  general: {
    points: 60,
    duration: 60, // 60 requests per minute
    blockDuration: 15,
  },
  payment: {
    points: 10,
    duration: 60, // 10 requests per minute
    blockDuration: 120,
  },
  upload: {
    points: 5,
    duration: 60, // 5 requests per minute
    blockDuration: 120,
  },
};

// Create separate rate limiters for each type
const rateLimiters: Record<RateLimitType, RateLimiterMemory> = {
  auth: new RateLimiterMemory({
    points: RATE_LIMIT_CONFIGS.auth.points,
    duration: RATE_LIMIT_CONFIGS.auth.duration,
    blockDuration: RATE_LIMIT_CONFIGS.auth.blockDuration,
  }),
  search: new RateLimiterMemory({
    points: RATE_LIMIT_CONFIGS.search.points,
    duration: RATE_LIMIT_CONFIGS.search.duration,
    blockDuration: RATE_LIMIT_CONFIGS.search.blockDuration,
  }),
  general: new RateLimiterMemory({
    points: RATE_LIMIT_CONFIGS.general.points,
    duration: RATE_LIMIT_CONFIGS.general.duration,
    blockDuration: RATE_LIMIT_CONFIGS.general.blockDuration,
  }),
  payment: new RateLimiterMemory({
    points: RATE_LIMIT_CONFIGS.payment.points,
    duration: RATE_LIMIT_CONFIGS.payment.duration,
    blockDuration: RATE_LIMIT_CONFIGS.payment.blockDuration,
  }),
  upload: new RateLimiterMemory({
    points: RATE_LIMIT_CONFIGS.upload.points,
    duration: RATE_LIMIT_CONFIGS.upload.duration,
    blockDuration: RATE_LIMIT_CONFIGS.upload.blockDuration,
  }),
};

// ============================================================
// IP Extraction
// ============================================================

/**
 * Extract the client IP address from the request.
 * Checks common proxy headers first (X-Forwarded-For, X-Real-IP),
 * then falls back to the remote address.
 */
function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    // x-forwarded-for can contain multiple IPs; the first one is the original client
    const ips = forwarded.split(',').map(ip => ip.trim());
    return ips[0] || 'unknown';
  }

  const realIp = req.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  // In Next.js, the IP is available via request headers from the platform
  return 'unknown';
}

// ============================================================
// User ID Extraction
// ============================================================

/**
 * Extract userId from the Authorization header if available.
 * Supports "Bearer <token>" format where the token is the userId (for our simple auth).
 * Returns null if no valid userId is found.
 */
function getUserId(req: NextRequest): string | null {
  const authHeader = req.headers.get('authorization');
  if (!authHeader) return null;

  // For our simple auth system, the userId might be passed directly
  // or we could parse it from a JWT. For now, we extract it as-is.
  // In a production system, you'd decode the JWT to get the userId.
  try {
    if (authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      // If the token looks like a UUID, use it as userId
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token)) {
        return token;
      }
    }
  } catch {
    // Ignore parsing errors
  }

  return null;
}

// ============================================================
// Build Rate Limit Key
// ============================================================

/**
 * Build a composite rate limit key.
 * Uses userId if available (more precise), otherwise falls back to IP.
 */
function buildRateLimitKey(req: NextRequest): { key: string; identifier: string } {
  const userId = getUserId(req);
  const ip = getClientIp(req);

  if (userId) {
    return {
      key: `user:${userId}`,
      identifier: userId,
    };
  }

  return {
    key: `ip:${ip}`,
    identifier: ip,
  };
}

// ============================================================
// Rate Limit Check
// ============================================================

export interface RateLimitResult {
  success: boolean;
  headers: Record<string, string>;
  retryAfterMs?: number;
  remainingPoints?: number;
}

/**
 * Check rate limit for a given request and endpoint type.
 *
 * @param req - The NextRequest object
 * @param type - The rate limit type category
 * @returns RateLimitResult with success status and headers to include in response
 */
export async function checkRateLimit(
  req: NextRequest,
  type: RateLimitType
): Promise<RateLimitResult> {
  const limiter = rateLimiters[type];
  const config = RATE_LIMIT_CONFIGS[type];
  const { key, identifier } = buildRateLimitKey(req);

  try {
    const result: RateLimiterRes = await limiter.consume(key);

    const headers: Record<string, string> = {
      'X-RateLimit-Limit': String(config.points),
      'X-RateLimit-Remaining': String(result.remainingPoints),
      'X-RateLimit-Reset': String(Math.ceil(result.msBeforeNext / 1000) + Date.now() / 1000),
    };

    return {
      success: true,
      headers,
      remainingPoints: result.remainingPoints,
    };
  } catch (error: unknown) {
    // RateLimiterRes is thrown when limit is exceeded
    if (error && typeof error === 'object' && 'msBeforeNext' in error) {
      const rateLimitRes = error as RateLimiterRes;

      console.warn(
        `[Rate Limit] Exceeded for ${type} endpoint. ` +
        `Identifier: ${identifier}, ` +
        `Key: ${key}, ` +
        `MS before next: ${rateLimitRes.msBeforeNext}`
      );

      const headers: Record<string, string> = {
        'X-RateLimit-Limit': String(config.points),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': String(Math.ceil(rateLimitRes.msBeforeNext / 1000) + Date.now() / 1000),
        'Retry-After': String(Math.ceil(rateLimitRes.msBeforeNext / 1000)),
      };

      return {
        success: false,
        headers,
        retryAfterMs: rateLimitRes.msBeforeNext,
        remainingPoints: 0,
      };
    }

    // If the error is not a RateLimiterRes, log it but allow the request through
    console.error(`[Rate Limit] Unexpected error checking rate limit:`, error);

    const headers: Record<string, string> = {
      'X-RateLimit-Limit': String(config.points),
      'X-RateLimit-Remaining': String(config.points),
      'X-RateLimit-Reset': String(config.duration + Date.now() / 1000),
    };

    return {
      success: true,
      headers,
      remainingPoints: config.points,
    };
  }
}

// ============================================================
// Utility: Check if a route should be rate limited
// ============================================================

/**
 * Paths that should be exempt from rate limiting (health checks, static, etc.)
 */
const EXEMPT_PATHS = ['/api/health', '/_next', '/favicon.ico'];

/**
 * Check if a given path is exempt from rate limiting.
 */
export function isExemptFromRateLimit(pathname: string): boolean {
  return EXEMPT_PATHS.some(exemptPath => pathname.startsWith(exemptPath));
}
