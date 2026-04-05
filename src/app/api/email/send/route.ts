import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { emailService } from '@/lib/email';
import type { EmailType } from '@/lib/email';

/**
 * POST /api/email/send
 *
 * Send an email of a given type to a user.
 * Body: { userId, type, data }
 *
 * Looks up the user by userId, then dispatches to the appropriate email method.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, type, data = {} } = body as {
      userId: string;
      type: EmailType;
      data: Record<string, unknown>;
    };

    // Validate required fields
    if (!userId || !type) {
      return NextResponse.json(
        { error: 'userId and type are required' },
        { status: 400 }
      );
    }

    const validTypes: EmailType[] = ['welcome', 'otp', 'password-reset', 'call-reminder', 'subscription'];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: `Invalid email type. Must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      );
    }

    // Look up user
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, role: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    if (!user.email) {
      return NextResponse.json(
        { error: 'User has no email address' },
        { status: 400 }
      );
    }

    // Send the email
    const result = await emailService.sendEmail({
      to: user.email,
      userName: user.name,
      type,
      data,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to send email' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      messageId: result.messageId,
      message: `Email of type "${type}" sent to ${user.email}`,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[/api/email/send] Error:', message);
    return NextResponse.json(
      { error: 'Failed to send email' },
      { status: 500 }
    );
  }
}
