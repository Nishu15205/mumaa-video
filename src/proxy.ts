import { NextRequest, NextResponse } from 'next/server';
import { getSecurityHeaders, getCorsHeaders } from '@/lib/security-headers';
import { isExemptFromRateLimit } from '@/lib/rate-limit';

/**
 * Global Next.js middleware.
 *
 * - Adds security headers to all responses
 * - Handles CORS preflight requests
 * - Does NOT block any requests (rate limiting is applied per-route)
 */
export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Handle CORS preflight (OPTIONS) requests
  if (req.method === 'OPTIONS') {
    const corsHeaders = getCorsHeaders();
    return new NextResponse(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  // Build response with security headers
  const securityHeaders = getSecurityHeaders();
  const response = NextResponse.next();

  // Apply security headers
  for (const [key, value] of Object.entries(securityHeaders)) {
    response.headers.set(key, value);
  }

  // Apply CORS headers to API routes
  if (pathname.startsWith('/api/')) {
    const corsHeaders = getCorsHeaders();
    for (const [key, value] of Object.entries(corsHeaders)) {
      response.headers.set(key, value);
    }
  }

  return response;
}

/**
 * Configure which routes the middleware runs on.
 * We apply it to all routes except _next (static) and public assets.
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico, sitemap.xml, robots.txt
     * - public folder assets
     */
    '/((?!_next/static|_next/image|favicon\\.ico|sitemap\\.xml|robots\\.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
