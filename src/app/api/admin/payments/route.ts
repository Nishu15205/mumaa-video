import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Helper: extract user ID from Authorization header
function getAuthUserId(req: NextRequest): string | null {
  const auth = req.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  return auth.replace('Bearer ', '').trim() || null;
}

// GET /api/admin/payments — List all payment records with stats
export async function GET() {
  try {
    const payments = await db.paymentRecord.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        nanny: {
          select: { id: true, name: true, email: true, role: true },
        },
        admin: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
    });

    // ── Compute stats ──────────────────────────────────────────────
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    let totalThisMonth = 0;
    let totalAllTime = 0;

    for (const p of payments) {
      totalAllTime += p.amount;
      if (new Date(p.createdAt) >= monthStart) {
        totalThisMonth += p.amount;
      }
    }

    return NextResponse.json({
      payments: payments.map((p) => ({
        id: p.id,
        nannyId: p.nannyId,
        nannyName: p.nanny?.name || 'Unknown',
        amount: p.amount,
        method: p.method,
        note: p.note,
        paidByName: p.admin?.name || 'Unknown',
        createdAt: p.createdAt,
      })),
      totalThisMonth,
      totalAllTime,
      totalPayments: payments.length,
    });
  } catch (error: unknown) {
    console.error('[Admin Payments GET]', error);
    return NextResponse.json(
      { error: 'Failed to fetch payment records.' },
      { status: 500 },
    );
  }
}

// POST /api/admin/payments — Admin pays a nanny
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { nannyId, amount, method, note, callIds, adminId: bodyAdminId } = body;

    // Allow adminId from body or Authorization header
    const adminId = bodyAdminId || getAuthUserId(req);

    // ── Validation ──────────────────────────────────────────────────

    if (!nannyId) {
      return NextResponse.json(
        { error: 'Nanny ID is required.' },
        { status: 400 },
      );
    }

    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json(
        { error: 'Amount must be a positive number.' },
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
        { error: 'Unauthorized. Only admins can record payments.' },
        { status: 403 },
      );
    }

    // ── Verify nanny exists ─────────────────────────────────────────
    const nanny = await db.user.findUnique({
      where: { id: nannyId },
      include: { nannyProfile: true },
    });
    if (!nanny || nanny.role !== 'NANNY') {
      return NextResponse.json(
        { error: 'Nanny not found. Please provide a valid nanny ID.' },
        { status: 404 },
      );
    }

    if (!nanny.nannyProfile) {
      return NextResponse.json(
        { error: 'Nanny profile not found for this user.' },
        { status: 404 },
      );
    }

    // ── Create payment record ───────────────────────────────────────
    const payment = await db.paymentRecord.create({
      data: {
        nannyId,
        amount,
        method: typeof method === 'string' ? method : 'MANUAL',
        note: typeof note === 'string' ? note : null,
        callIds: Array.isArray(callIds) ? JSON.stringify(callIds) : null,
        paidBy: adminId,
      },
      include: {
        nanny: {
          select: { id: true, name: true, email: true, role: true },
        },
        admin: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
    });

    // ── Update NannyProfile paidEarnings ────────────────────────────
    await db.nannyProfile.update({
      where: { userId: nannyId },
      data: {
        paidEarnings: {
          increment: amount,
        },
      },
    });

    // ── Create notification for nanny ───────────────────────────────
    await db.notification.create({
      data: {
        userId: nannyId,
        type: 'SYSTEM',
        title: 'Payment Received',
        message: `You have received a payment of ₹${amount.toLocaleString('en-IN')} via ${method || 'MANUAL'}.${note ? ` Note: ${note}` : ''}`,
      },
    });

    return NextResponse.json(
      {
        payment,
        message: `Payment of ₹${amount.toFixed(2)} recorded for ${nanny.name}.`,
      },
      { status: 201 },
    );
  } catch (error: unknown) {
    console.error('[Admin Payments POST]', error);
    const message =
      error instanceof Error ? error.message : 'Something went wrong while recording the payment.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
