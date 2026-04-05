import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';

// POST /api/nanny-setup — Check application status & set password
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, action, newPassword } = body;

    if (!email || !email.trim()) {
      return NextResponse.json({ error: 'Email is required.' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Find application by email
    const application = await db.nannyApplication.findFirst({
      where: { email: cleanEmail },
      include: { approvedUser: true },
    });

    if (!application) {
      return NextResponse.json({
        status: 'NOT_FOUND',
        message: 'No application found with this email address.',
      });
    }

    // If action is "check" — just return status
    if (action === 'check') {
      return NextResponse.json({
        status: application.status,
        name: application.name,
        appliedAt: application.createdAt,
        rejectReason: application.rejectReason,
        isApproved: application.status === 'APPROVED',
        hasAccount: !!application.approvedUserId,
      });
    }

    // If action is "set-password" — set the password for an approved nanny
    if (action === 'set-password') {
      if (application.status !== 'APPROVED') {
        return NextResponse.json(
          { error: `Your application is ${application.status.toLowerCase()}. You can only set a password after approval.` },
          { status: 400 },
        );
      }

      if (!application.approvedUserId) {
        return NextResponse.json(
          { error: 'Your account has not been created yet. Please try again later.' },
          { status: 400 },
        );
      }

      if (!newPassword || newPassword.length < 6) {
        return NextResponse.json(
          { error: 'Password must be at least 6 characters long.' },
          { status: 400 },
        );
      }

      const hashedPassword = await bcrypt.hash(newPassword, 12);

      await db.user.update({
        where: { id: application.approvedUserId },
        data: { password: hashedPassword },
      });

      return NextResponse.json({
        success: true,
        message: 'Password set successfully! You can now login with your email and new password.',
      });
    }

    return NextResponse.json({ error: 'Invalid action.' }, { status: 400 });
  } catch (error: unknown) {
    console.error('[Nanny Setup]', error);
    const message =
      error instanceof Error ? error.message : 'Something went wrong.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
