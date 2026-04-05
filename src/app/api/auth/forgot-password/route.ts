import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { checkRateLimit } from '@/lib/rate-limit';

// Simple in-memory OTP store for demo purposes
// In production, this would use a database table or Redis with TTL
const otpStore = new Map<string, { otp: string; expiresAt: number }>();

export async function POST(req: NextRequest) {
  try {
    // Rate limiting check (auth: 5 req/min per IP)
    const { success, headers } = await checkRateLimit(req, 'auth');
    if (!success) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429, headers }
      );
    }

    const body = await req.json();
    const { email } = body;

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    const user = await db.user.findUnique({
      where: { email },
    });

    // Always return success to prevent email enumeration
    // But only send OTP if user exists
    if (user) {
      // Generate 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();

      // Store OTP with 10-minute expiry
      otpStore.set(email.toLowerCase(), {
        otp,
        expiresAt: Date.now() + 10 * 60 * 1000,
      });

      // In production, send OTP via email service here
      // For demo, return the OTP in the response
      return NextResponse.json({
        message: 'OTP sent to your email',
        otp, // Demo only - in production, remove this
      }, { headers });
    }

    // Still return success for non-existent emails (security best practice)
    return NextResponse.json({
      message: 'If an account exists with this email, an OTP has been sent',
      otp: null,
    });
  } catch (error: any) {
    console.error('Forgot password error:', error);
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    );
  }
}

// Helper to verify OTP (used by reset-password route)
export function verifyOtp(email: string, otp: string): boolean {
  const record = otpStore.get(email.toLowerCase());
  if (!record) return false;
  if (Date.now() > record.expiresAt) {
    otpStore.delete(email.toLowerCase());
    return false;
  }
  return record.otp === otp;
}

// Helper to clear OTP after successful reset
export function clearOtp(email: string): void {
  otpStore.delete(email.toLowerCase());
}
