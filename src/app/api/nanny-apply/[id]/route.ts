import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';

// Helper: extract user ID from Authorization header
function getAuthUserId(req: NextRequest): string | null {
  const auth = req.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  return auth.replace('Bearer ', '').trim() || null;
}

// PUT /api/nanny-apply/[id] — Admin approves or rejects an application
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    // ── Validate application exists ─────────────────────────────────
    const application = await db.nannyApplication.findUnique({ where: { id } });
    if (!application) {
      return NextResponse.json(
        { error: 'Application not found.' },
        { status: 404 },
      );
    }

    if (application.status !== 'PENDING') {
      return NextResponse.json(
        { error: `This application has already been ${application.status.toLowerCase()}.` },
        { status: 400 },
      );
    }

    // ── Parse body ──────────────────────────────────────────────────
    const body = await req.json();
    const { action, adminId: bodyAdminId, rejectReason, reason } = body;

    // Allow adminId from body or Authorization header
    const adminId = bodyAdminId || getAuthUserId(req);

    if (!action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Action must be "approve" or "reject".' },
        { status: 400 },
      );
    }

    if (!adminId) {
      return NextResponse.json(
        { error: 'Admin ID is required.' },
        { status: 400 },
      );
    }

    // ── Verify admin ────────────────────────────────────────────────
    const admin = await db.user.findUnique({ where: { id: adminId } });
    if (!admin || admin.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized. Only admins can review applications.' },
        { status: 403 },
      );
    }

    // ── REJECT ──────────────────────────────────────────────────────
    if (action === 'reject') {
      const updated = await db.nannyApplication.update({
        where: { id },
        data: {
          status: 'REJECTED',
          reviewedBy: adminId,
          reviewedAt: new Date(),
          rejectReason: (typeof rejectReason === 'string' && rejectReason.trim())
            ? rejectReason.trim()
            : (typeof reason === 'string' && reason.trim())
              ? reason.trim()
              : null,
        },
      });

      return NextResponse.json({
        application: updated,
        message: 'Application has been rejected.',
      });
    }

    // ── APPROVE ─────────────────────────────────────────────────────

    // Check if a user with this email already exists (edge-case guard)
    const existingUser = await db.user.findUnique({
      where: { email: application.email },
    });
    if (existingUser) {
      return NextResponse.json(
        { error: 'A user with this email already exists. Cannot approve the application.' },
        { status: 409 },
      );
    }

    // 1) Create User with role NANNY with a simple readable password
    // Generate a 6-digit code that the admin can share with the nanny
    const tempPassword = `Mumaa@${String(Math.floor(1000 + Math.random() * 9000))}`;
    const hashedPassword = await bcrypt.hash(tempPassword, 12);

    const newUser = await db.user.create({
      data: {
        email: application.email,
        name: application.name,
        password: hashedPassword,
        role: 'NANNY',
        phone: application.phone,
        bio: application.bio,
      },
    });

    // 2) Create NannyProfile from the application data
    await db.nannyProfile.create({
      data: {
        userId: newUser.id,
        experience: application.experience,
        skills: application.skills,
        hourlyRate: application.hourlyRate,
        languages: application.languages,
        certifications: application.certifications,
      },
    });

    // 3) Create FREE subscription with 30-day trial (1 month free)
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 30);

    await db.subscription.create({
      data: {
        userId: newUser.id,
        plan: 'FREE',
        status: 'ACTIVE',
        isTrial: true,
        trialEndsAt,
      },
    });

    // 4) Update application with approval info
    const updatedApplication = await db.nannyApplication.update({
      where: { id },
      data: {
        status: 'APPROVED',
        reviewedBy: adminId,
        reviewedAt: new Date(),
        approvedUserId: newUser.id,
      },
    });

    // 5) Create Notification for admin confirming approval
    await db.notification.create({
      data: {
        userId: adminId,
        type: 'NANNY_APPLICATION',
        title: 'Nanny Application Approved',
        message: `Application from ${application.name} (${application.email}) has been approved and a nanny account has been created.`,
        data: JSON.stringify({
          applicationId: id,
          newUserId: newUser.id,
          applicationEmail: application.email,
        }),
      },
    });

    return NextResponse.json({
      application: updatedApplication,
      credentials: {
        email: application.email,
        password: tempPassword,
        name: application.name,
      },
      message: 'Application approved! Share the login credentials with the nanny. They can also set their own password from the login page.',
    });
  } catch (error: unknown) {
    console.error('[Nanny Apply PUT]', error);
    const message =
      error instanceof Error ? error.message : 'Something went wrong while reviewing the application.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
