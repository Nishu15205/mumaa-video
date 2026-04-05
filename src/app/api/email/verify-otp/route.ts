import { NextRequest, NextResponse } from 'next/server';
import { emailService } from '@/lib/email';

/**
 * POST /api/email/verify-otp
 *
 * Verify a 6-digit OTP for a given email and purpose.
 * Body: { email, otp, purpose }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, otp, purpose } = body as {
      email: string;
      otp: string;
      purpose: string;
    };

    // Validate fields
    if (!email || !otp || !purpose) {
      return NextResponse.json(
        { error: 'email, otp, and purpose are required' },
        { status: 400 }
      );
    }

    const emailLower = email.toLowerCase().trim();

    // Validate OTP format (6 digits)
    if (!/^\d{6}$/.test(otp)) {
      return NextResponse.json(
        { error: 'OTP must be a 6-digit number' },
        { status: 400 }
      );
    }

    // Validate purpose
    const validPurposes = ['signup', 'reset-password', 'login'];
    if (!validPurposes.includes(purpose)) {
      return NextResponse.json(
        { error: `Invalid purpose. Must be one of: ${validPurposes.join(', ')}` },
        { status: 400 }
      );
    }

    // Verify OTP
    const isValid = emailService.verifyOTP(emailLower, otp, purpose);

    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid or expired OTP' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      verified: true,
      message: 'OTP verified successfully',
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[/api/email/verify-otp] Error:', message);
    return NextResponse.json(
      { error: 'OTP verification failed' },
      { status: 500 }
    );
  }
}
