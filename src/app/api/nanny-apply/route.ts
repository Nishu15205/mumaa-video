import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// POST /api/nanny-apply — Submit a nanny application
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      email,
      name,
      phone,
      experience,
      skills,
      hourlyRate,
      languages,
      certifications,
      bio,
    } = body;

    // ── Validation ──────────────────────────────────────────────────
    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Email is required.' },
        { status: 400 },
      );
    }

    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        { error: 'Name is required.' },
        { status: 400 },
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Please provide a valid email address.' },
        { status: 400 },
      );
    }

    // ── Duplicate checks ────────────────────────────────────────────

    // 1) Check if email is already registered as a User
    const existingUser = await db.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json(
        { error: 'This email is already registered. Please log in or use a different email.' },
        { status: 409 },
      );
    }

    // 2) Check if there is already a PENDING application with this email
    const pendingApplication = await db.nannyApplication.findFirst({
      where: { email, status: 'PENDING' },
    });
    if (pendingApplication) {
      return NextResponse.json(
        { error: 'You already have a pending application. Please wait for it to be reviewed.' },
        { status: 409 },
      );
    }

    // ── Create application ──────────────────────────────────────────
    const application = await db.nannyApplication.create({
      data: {
        email: email.trim().toLowerCase(),
        name: name.trim(),
        phone: phone?.trim() || null,
        experience: typeof experience === 'number' ? experience : 0,
        skills: typeof skills === 'string' ? skills : '',
        hourlyRate: typeof hourlyRate === 'number' ? hourlyRate : 0,
        languages: typeof languages === 'string' ? languages : '',
        certifications: typeof certifications === 'string' ? certifications : '',
        bio: typeof bio === 'string' ? bio : null,
        status: 'PENDING',
      },
    });

    return NextResponse.json(
      {
        application,
        message: 'Application submitted successfully! We will review it shortly.',
      },
      { status: 201 },
    );
  } catch (error: unknown) {
    console.error('[Nanny Apply POST]', error);
    const message =
      error instanceof Error ? error.message : 'Something went wrong while submitting your application.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// GET /api/nanny-apply — List all applications (admin)
export async function GET() {
  try {
    const applications = await db.nannyApplication.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        approvedUser: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
    });

    return NextResponse.json({ applications });
  } catch (error: unknown) {
    console.error('[Nanny Apply GET]', error);
    return NextResponse.json(
      { error: 'Failed to fetch applications.' },
      { status: 500 },
    );
  }
}
