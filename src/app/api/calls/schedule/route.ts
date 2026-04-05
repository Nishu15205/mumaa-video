import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { db } from '@/lib/db';
import { checkRateLimit } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  try {
    // Rate limiting check (general: 60 req/min per IP)
    const { success, headers } = await checkRateLimit(req, 'general');
    if (!success) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429, headers }
      );
    }

    const body = await req.json();
    const { parentId, nannyId, scheduledAt, notes } = body;

    if (!parentId || !nannyId || !scheduledAt) {
      return NextResponse.json(
        { error: 'parentId, nannyId, and scheduledAt are required' },
        { status: 400 }
      );
    }

    // Verify parent exists
    const parent = await db.user.findUnique({ where: { id: parentId } });
    if (!parent) {
      return NextResponse.json({ error: 'Parent not found' }, { status: 404 });
    }

    // Verify nanny exists
    const nanny = await db.user.findUnique({ where: { id: nannyId } });
    if (!nanny) {
      return NextResponse.json({ error: 'Nanny not found' }, { status: 404 });
    }

    const callRoomId = uuidv4();
    const scheduledDate = new Date(scheduledAt);

    const call = await db.callSession.create({
      data: {
        parentId,
        nannyId,
        type: 'SCHEDULED',
        status: 'PENDING',
        scheduledAt: scheduledDate,
        callRoomId,
        notes: notes || null,
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

    // Create notification for nanny
    await db.notification.create({
      data: {
        userId: nannyId,
        type: 'CALL_SCHEDULED',
        title: 'Scheduled Call Request',
        message: `${parent.name} has scheduled a video call for ${scheduledDate.toLocaleString()}.`,
        data: JSON.stringify({ callId: call.id, callRoomId, scheduledAt: scheduledDate.toISOString() }),
      },
    });

    // Create notification for parent
    await db.notification.create({
      data: {
        userId: parentId,
        type: 'CALL_SCHEDULED',
        title: 'Call Scheduled',
        message: `Your video call with ${nanny.name} has been scheduled for ${scheduledDate.toLocaleString()}.`,
        data: JSON.stringify({ callId: call.id, callRoomId, scheduledAt: scheduledDate.toISOString() }),
      },
    });

    return NextResponse.json(
      { call, message: 'Call scheduled successfully' },
      { status: 201, headers }
    );
  } catch (error: any) {
    console.error('Schedule call error:', error);
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    );
  }
}
