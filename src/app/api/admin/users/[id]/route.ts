import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const user = await db.user.findUnique({ where: { id } });
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    if (user.role === 'ADMIN') {
      return NextResponse.json(
        { error: 'Cannot delete admin users' },
        { status: 403 }
      );
    }

    // Delete related records first
    await db.notification.deleteMany({ where: { userId: id } });
    await db.review.deleteMany({
      where: { OR: [{ fromUserId: id }, { toUserId: id }] },
    });
    await db.subscription.deleteMany({ where: { userId: id } });
    await db.callSession.deleteMany({
      where: { OR: [{ parentId: id }, { nannyId: id }] },
    });
    await db.nannyProfile.deleteMany({ where: { userId: id } });
    await db.parentProfile.deleteMany({ where: { userId: id } });

    // Delete user
    await db.user.delete({ where: { id } });

    return NextResponse.json({ message: 'User deleted successfully' });
  } catch (error: any) {
    console.error('Delete user error:', error);
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    );
  }
}
