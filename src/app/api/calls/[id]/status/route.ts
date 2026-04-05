import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { status } = body;

    const validStatuses = ['ACCEPTED', 'ACTIVE', 'COMPLETED', 'CANCELLED'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Status must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      );
    }

    const call = await db.callSession.findUnique({ where: { id } });
    if (!call) {
      return NextResponse.json(
        { error: 'Call not found' },
        { status: 404 }
      );
    }

    const updateData: any = { status };

    if (status === 'ACTIVE') {
      updateData.startedAt = new Date();
    }

    const updatedCall = await db.callSession.update({
      where: { id },
      data: updateData,
      include: {
        parent: {
          select: { id: true, name: true, avatar: true },
        },
        nanny: {
          select: { id: true, name: true, avatar: true },
        },
      },
    });

    // Create notifications based on status
    let notificationType = 'CALL_REQUEST';
    let parentMessage = '';
    let nannyMessage = '';
    let socketEvent: string | null = null;

    if (status === 'ACCEPTED') {
      notificationType = 'CALL_REQUEST';
      parentMessage = `${updatedCall.nanny.name} has accepted your call request.`;
      nannyMessage = `You have accepted the call request from ${updatedCall.parent.name}.`;
      socketEvent = 'call-accepted';
    } else if (status === 'ACTIVE') {
      notificationType = 'CALL_REQUEST';
      parentMessage = `Your call with ${updatedCall.nanny.name} is now active.`;
      nannyMessage = `Your call with ${updatedCall.parent.name} is now active.`;
      socketEvent = 'call-accepted';
    } else if (status === 'CANCELLED') {
      notificationType = 'CALL_REQUEST';
      parentMessage = `The call with ${updatedCall.nanny.name} has been cancelled.`;
      nannyMessage = `The call with ${updatedCall.parent.name} has been cancelled.`;
      socketEvent = 'call-rejected';
    } else if (status === 'COMPLETED') {
      notificationType = 'CALL_COMPLETED';
      parentMessage = `Your call with ${updatedCall.nanny.name} has been completed.`;
      nannyMessage = `Your call with ${updatedCall.parent.name} has been completed.`;
      socketEvent = 'call-ended';
    }

    // Create DB notifications
    await db.notification.createMany({
      data: [
        {
          userId: updatedCall.parentId,
          type: notificationType,
          title: 'Call Update',
          message: parentMessage,
          data: JSON.stringify({ callId: id }),
        },
        {
          userId: updatedCall.nannyId,
          type: notificationType,
          title: 'Call Update',
          message: nannyMessage,
          data: JSON.stringify({ callId: id }),
        },
      ],
    });

    // Push real-time socket event to both parties
    if (socketEvent) {
      try {
        const SOCKET_API_PORT = process.env.SOCKET_API_PORT || 3003;
        const socketBase = `http://localhost:${SOCKET_API_PORT}/emit`;
        const headers = { 'Content-Type': 'application/json', 'Connection': 'close' };

        const parentData = {
          callId: id,
          ...(socketEvent === 'call-accepted' ? { accepterId: updatedCall.nannyId, roomName: updatedCall.callRoomId } : {}),
          ...(socketEvent === 'call-rejected' ? { rejecterId: updatedCall.nannyId } : {}),
          ...(socketEvent === 'call-ended' ? { enderId: updatedCall.parentId, reason: 'status_update' } : {}),
        };

        const nannyData = {
          callId: id,
          ...(socketEvent === 'call-accepted' ? { accepterId: updatedCall.parentId, roomName: updatedCall.callRoomId } : {}),
          ...(socketEvent === 'call-rejected' ? { rejecterId: updatedCall.parentId } : {}),
          ...(socketEvent === 'call-ended' ? { enderId: updatedCall.nannyId, reason: 'status_update' } : {}),
        };

        // Notify both parties (fire and forget, don't block response)
        fetch(socketBase, { method: 'POST', headers, body: JSON.stringify({ toUserId: updatedCall.parentId, event: socketEvent, data: parentData }) }).catch(() => {});
        fetch(socketBase, { method: 'POST', headers, body: JSON.stringify({ toUserId: updatedCall.nannyId, event: socketEvent, data: nannyData }) }).catch(() => {});
      } catch (socketErr) {
        console.warn('[Call Status] Socket notification failed:', socketErr);
      }
    }

    return NextResponse.json({
      call: updatedCall,
      message: `Call status updated to ${status}`,
    });
  } catch (error: any) {
    console.error('Update call status error:', error);
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    );
  }
}
