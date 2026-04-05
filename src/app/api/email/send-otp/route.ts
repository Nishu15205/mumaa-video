import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { emailService } from '@/lib/email';

// Rate limiting: simple in-memory tracker per email (max 1 OTP per minute)
const otpRateLimit = new Map<string, number>();
const OTP_RATE_WINDOW_MS = 60 * 1000; // 1 minute

/**
 * POST /api/email/send-otp
 *
 * Generate and send a 6-digit OTP to an email address.
 * Body: { email, purpose } — purpose: 'signup', 'reset-password', 'login'
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, purpose } = body as {
      email: string;
      purpose: string;
    };

    // Validate fields
    if (!email || !purpose) {
      return NextResponse.json(
        { error: 'email and purpose are required' },
        { status: 400 }
      );
    }

    const emailLower = email.toLowerCase().trim();

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailLower)) {
      return NextResponse.json(
        { error: 'Invalid email address format' },
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

    // Rate limiting check
    const rateKey = `${emailLower}:${purpose}`;
    const lastSent = otpRateLimit.get(rateKey) || 0;
    if (Date.now() - lastSent < OTP_RATE_WINDOW_MS) {
      return NextResponse.json(
        { error: 'Please wait before requesting another OTP' },
        { status: 429 }
      );
    }

    // Check for existing valid OTP
    if (emailService.hasActiveOTP(emailLower, purpose)) {
      return NextResponse.json(
        { error: 'An active OTP already exists. Please wait for it to expire or check your email.' },
        { status: 429 }
      );
    }

    // Look up user by email to get their name (optional — use "User" as fallback)
    let userName = 'User';
    try {
      const user = await db.user.findUnique({
        where: { email: emailLower },
        select: { name: true },
      });
      if (user?.name) {
        userName = user.name;
      }
    } catch {
      // User may not exist yet (e.g., signup flow), use fallback name
    }

    // Generate and store OTP
    const otp = emailService.generateOTP(emailLower, purpose);

    // Update rate limit tracker
    otpRateLimit.set(rateKey, Date.now());

    // Determine purpose description for email
    const purposeDescriptions: Record<string, string> = {
      signup: 'verify your email address',
      'reset-password': 'reset your password',
      login: 'verify your login',
    };

    // Send OTP email
    const result = await emailService.sendOTPEmail(emailLower, userName, {
      otp,
      purpose: purposeDescriptions[purpose] || purpose,
      expiryMinutes: 5,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to send OTP email' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'OTP sent successfully',
      // In production, never return the OTP in the response
      // For dev/testing convenience, we include it (guarded by env)
      ...(process.env.NODE_ENV !== 'production' && { otp }),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[/api/email/send-otp] Error:', message);
    return NextResponse.json(
      { error: 'Failed to send OTP' },
      { status: 500 }
    );
  }
}
