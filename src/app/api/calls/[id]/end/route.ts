import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { duration: frontendDuration } = body;

    const call = await db.callSession.findUnique({
      where: { id },
      include: {
        parent: {
          select: { id: true, name: true },
        },
        nanny: {
          select: { id: true, name: true, nannyProfile: true },
        },
      },
    });

    if (!call) {
      return NextResponse.json(
        { error: 'Call not found' },
        { status: 404 }
      );
    }

    const endedAt = new Date();
    const startedAt = call.startedAt ? new Date(call.startedAt) : endedAt;

    // Use the duration from the frontend if provided (more accurate from Jitsi),
    // otherwise fall back to server-side calculation
    let durationSeconds: number;
    if (typeof frontendDuration === 'number' && frontendDuration > 0) {
      durationSeconds = Math.floor(frontendDuration);
    } else {
      durationSeconds = Math.floor((endedAt.getTime() - startedAt.getTime()) / 1000);
    }

    const durationHours = durationSeconds / 3600;

    // Calculate price: nanny hourlyRate * duration in hours
    const hourlyRate = call.nanny?.nannyProfile?.hourlyRate || 0;
    const price = parseFloat((hourlyRate * durationHours).toFixed(2));

    const updatedCall = await db.callSession.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        endedAt,
        duration: durationSeconds,
        price,
      },
      include: {
        parent: {
          select: { id: true, name: true, avatar: true },
        },
        nanny: {
          select: { id: true, name: true, avatar: true },
        },
      },
    });

    // Update nanny stats
    if (call.nanny?.nannyProfile) {
      await db.nannyProfile.update({
        where: { userId: call.nannyId },
        data: {
          totalSessions: { increment: 1 },
          totalEarnings: { increment: price },
        },
      });
    }

    // Create notifications for both parent and nanny
    const durationMinutes = Math.floor(durationSeconds / 60);
    const durationDisplay = durationMinutes > 0
      ? `${durationMinutes} minute${durationMinutes !== 1 ? 's' : ''}`
      : `${durationSeconds} second${durationSeconds !== 1 ? 's' : ''}`;

    await db.notification.createMany({
      data: [
        {
          userId: call.parentId,
          type: 'CALL_COMPLETED',
          title: 'Call Completed',
          message: `Your call with ${call.nanny.name} has ended. Duration: ${durationDisplay}. Cost: ₹${price}`,
          data: JSON.stringify({ callId: id, duration: durationSeconds, price }),
        },
        {
          userId: call.nannyId,
          type: 'CALL_COMPLETED',
          title: 'Call Completed',
          message: `Your call with ${call.parent.name} has ended. Duration: ${durationDisplay}. Earnings: ₹${price}`,
          data: JSON.stringify({ callId: id, duration: durationSeconds, price }),
        },
      ],
    });

    // Notify both parties via socket that the call has ended
    try {
      const SOCKET_API_PORT = process.env.SOCKET_API_PORT || 3003;
      const socketBase = `http://localhost:${SOCKET_API_PORT}/emit`;
      const headers = { 'Content-Type': 'application/json', 'Connection': 'close' };

      // Fire-and-forget socket notifications to both parent and nanny
      fetch(socketBase, {
        method: 'POST', headers,
        body: JSON.stringify({ toUserId: call.parentId, event: 'call-ended', data: { callId: id, reason: 'ended' } }),
      }).catch(() => {});
      fetch(socketBase, {
        method: 'POST', headers,
        body: JSON.stringify({ toUserId: call.nannyId, event: 'call-ended', data: { callId: id, reason: 'ended' } }),
      }).catch(() => {});
    } catch (socketErr) {
      console.warn('[End Call] Socket notification failed:', socketErr);
    }

    return NextResponse.json({
      call: updatedCall,
      message: 'Call ended successfully',
    });
  } catch (error: any) {
    console.error('End call error:', error);
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    );
  }
}
