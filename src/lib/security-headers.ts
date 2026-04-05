// ============================================================
// Security Headers Utility
// ============================================================

/**
 * Returns a standard set of security headers for API responses.
 * These headers help protect against common web vulnerabilities.
 */
export function getSecurityHeaders(): Record<string, string> {
  return {
    'X-Content-Type-Options': 'nosniff',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Content-Security-Policy':
      "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
      "style-src 'self' 'unsafe-inline'; " +
      "img-src 'self' data: blob: https:; " +
      "font-src 'self' data:; " +
      "connect-src 'self' ws: wss: https:; " +
      "base-uri 'self'; " +
      "form-action 'self'",
    'Permissions-Policy':
      'camera=(self), microphone=(self), geolocation=(), payment=()',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  };
}

/**
 * Returns CORS headers for API responses.
 * These headers control cross-origin access to the API.
 */
export function getCorsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGINS || '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers':
      'Content-Type, Authorization, X-Requested-With, Accept, Origin',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400', // 24 hours preflight cache
  };
}

/**
 * Returns all standard API response headers (security + CORS).
 */
export function getStandardHeaders(): Record<string, string> {
  return {
    ...getSecurityHeaders(),
    ...getCorsHeaders(),
  };
}
