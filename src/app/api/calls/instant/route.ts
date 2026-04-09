import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { db } from '@/lib/db';
import { emitToUser } from '@/lib/socket-api';

const BASIC_DAILY_LIMIT = 5;
const BASIC_CALL_MAX_SECONDS = 15 * 60; // 15 minutes

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { parentId, nannyId } = body;

    if (!parentId || !nannyId) {
      return NextResponse.json(
        { error: 'parentId and nannyId are required' },
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

    // Check subscription and call limits
    const subscription = await db.subscription.findFirst({
      where: { userId: parentId, status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
    });

    const plan = subscription?.plan || 'FREE';

    // FREE plan users can make limited instant calls (demo friendly)
    // Paid plans get more features, but FREE users can still test calls

    // Call limits only apply to users with subscriptions (BASIC plan)
    if (plan === 'BASIC' && subscription) {
      // Check daily call limit
      const now = new Date();
      let callsUsedToday = 0;

      if (subscription.lastCallReset && isSameDay(new Date(subscription.lastCallReset), now)) {
        callsUsedToday = subscription.callsUsedToday || 0;
      } else {
        // Reset daily counter
        await db.subscription.update({
          where: { id: subscription.id },
          data: { callsUsedToday: 0, lastCallReset: now },
        });
      }

      if (callsUsedToday >= BASIC_DAILY_LIMIT) {
        return NextResponse.json(
          {
            error: `You have reached your daily limit of ${BASIC_DAILY_LIMIT} calls on the Basic plan. Upgrade to Pro for unlimited calls.`,
            code: 'DAILY_LIMIT_REACHED',
            callsUsedToday,
            dailyLimit: BASIC_DAILY_LIMIT,
          },
          { status: 429 }
        );
      }

      // Increment daily call counter
      await db.subscription.update({
        where: { id: subscription.id },
        data: { callsUsedToday: callsUsedToday + 1 },
      });
    }

    // Generate a short, URL-safe room ID
    const rawId = uuidv4();
    const shortId = rawId.replace(/-/g, '').slice(0, 12);
    const callRoomId = `mumaa-${shortId}`;

    const call = await db.callSession.create({
      data: {
        parentId,
        nannyId,
        type: 'INSTANT',
        status: 'PENDING',
        callRoomId,
        // Store max duration in notes for Basic plan
        ...(plan === 'BASIC' ? { notes: `MAX_DURATION:${BASIC_CALL_MAX_SECONDS}` } : {}),
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
        type: 'CALL_REQUEST',
        title: 'New Call Request',
        message: `${parent.name} is requesting an instant video call with you.`,
        data: JSON.stringify({ callId: call.id, callRoomId }),
      },
    });

    // Create notification for parent
    await db.notification.create({
      data: {
        userId: parentId,
        type: 'CALL_REQUEST',
        title: 'Call Request Sent',
        message: `Your call request has been sent to ${nanny.name}. Waiting for response...`,
        data: JSON.stringify({ callId: call.id, callRoomId }),
      },
    });

    // Notify nanny via socket service HTTP API (real-time ringing)
    const emitResult = await emitToUser(nannyId, 'incoming-call', {
      callId: call.id,
      callerId: parentId,
      callerName: parent.name,
      callerAvatar: parent.avatar,
      callType: 'INSTANT',
      callRoomId: call.callRoomId,
    });

    if (!emitResult.success || !emitResult.delivered) {
      console.warn(`[Instant Call] Socket emit ${!emitResult.success ? 'failed' : `not delivered (${emitResult.reason || 'unknown'})`} to nanny ${nannyId.slice(0, 8)} — nanny may be offline`);
    }

    return NextResponse.json(
      {
        call,
        message: 'Instant call request created',
        plan,
        ...(plan === 'BASIC' ? {
          maxDurationSeconds: BASIC_CALL_MAX_SECONDS,
          callsRemaining: BASIC_DAILY_LIMIT - (subscription?.callsUsedToday || 0),
        } : {}),
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Create instant call error:', error);
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    );
  }
}
