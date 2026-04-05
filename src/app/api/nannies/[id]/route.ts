import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const nanny = await db.nannyProfile.findUnique({
      where: { userId: id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
            bio: true,
            phone: true,
            isOnline: true,
          },
        },
      },
    });

    if (!nanny) {
      return NextResponse.json(
        { error: 'Nanny not found' },
        { status: 404 }
      );
    }

    // Get reviews for this nanny
    const reviews = await db.review.findMany({
      where: { toUserId: id },
      include: {
        fromUser: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      nanny,
      reviews,
    });
  } catch (error: any) {
    console.error('Get nanny error:', error);
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    );
  }
}
