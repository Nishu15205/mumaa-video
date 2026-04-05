import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/admin/nanny-earnings/[id] — Nanny earnings breakdown
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    // ── Verify nanny exists ─────────────────────────────────────────
    const nanny = await db.user.findUnique({
      where: { id },
      select: { id: true, name: true, email: true, role: true, nannyProfile: true },
    });

    if (!nanny || nanny.role !== 'NANNY') {
      return NextResponse.json(
        { error: 'Nanny not found.' },
        { status: 404 },
      );
    }

    if (!nanny.nannyProfile) {
      return NextResponse.json(
        { error: 'Nanny profile not found for this user.' },
        { status: 404 },
      );
    }

    // ── Calculate totalEarnings from completed calls ────────────────
    const completedCallsAgg = await db.callSession.aggregate({
      where: {
        nannyId: id,
        status: 'COMPLETED',
      },
      _sum: {
        price: true,
      },
      _count: {
        id: true,
      },
    });

    const totalEarnings = completedCallsAgg._sum.price ?? 0;
    const completedCallCount = completedCallsAgg._count.id;

    // ── Calculate totalPaidEarnings from PaymentRecord sum ───────────
    const paymentsAgg = await db.paymentRecord.aggregate({
      where: {
        nannyId: id,
      },
      _sum: {
        amount: true,
      },
      _count: {
        id: true,
      },
    });

    const totalPaid = paymentsAgg._sum.amount ?? 0;
    const paymentCount = paymentsAgg._count.id;

    // ── Derive pending (unpaid) amount ──────────────────────────────
    const pendingEarnings = Math.max(0, totalEarnings - totalPaid);

    return NextResponse.json({
      nanny: {
        id: nanny.id,
        name: nanny.name,
        email: nanny.email,
      },
      totalEarnings,
      paidEarnings: totalPaid,
      pendingEarnings,
      completedCallCount,
      paymentCount,
      isAvailable: nanny.nannyProfile.isAvailable,
      hourlyRate: nanny.nannyProfile.hourlyRate,
    });
  } catch (error: unknown) {
    console.error('[Admin Nanny Earnings GET]', error);
    return NextResponse.json(
      { error: 'Failed to fetch nanny earnings.' },
      { status: 500 },
    );
  }
}
