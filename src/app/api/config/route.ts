import { NextResponse } from 'next/server';

/**
 * Runtime config endpoint — returns socket URL and TURN credentials
 * from SERVER-SIDE env vars (no NEXT_PUBLIC_ prefix needed).
 *
 * This solves the Next.js build-time embedding issue where NEXT_PUBLIC_*
 * vars are empty if not set during `next build`.
 */
export async function GET() {
  return NextResponse.json({
    socketUrl: process.env.SOCKET_API_URL || process.env.NEXT_PUBLIC_SOCKET_URL || '',
    turnUrl: process.env.TURN_URL || process.env.NEXT_PUBLIC_TURN_URL || '',
    turnUsername: process.env.TURN_USERNAME || process.env.NEXT_PUBLIC_TURN_USERNAME || '',
    turnCredential: process.env.TURN_CREDENTIAL || process.env.NEXT_PUBLIC_TURN_CREDENTIAL || '',
  });
}
