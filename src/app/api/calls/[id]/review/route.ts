import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { fromUserId, toUserId, rating, comment } = body;

    if (!fromUserId || !toUserId || !rating) {
      return NextResponse.json(
        { error: 'fromUserId, toUserId, and rating are required' },
        { status: 400 }
      );
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: 'Rating must be between 1 and 5' },
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

    if (call.status !== 'COMPLETED') {
      return NextResponse.json(
        { error: 'Reviews can only be added to completed calls' },
        { status: 400 }
      );
    }

    // Check if user already reviewed this call
    const existingReview = await db.review.findFirst({
      where: {
        callSessionId: id,
        fromUserId,
      },
    });

    if (existingReview) {
      return NextResponse.json(
        { error: 'You have already reviewed this call' },
        { status: 409 }
      );
    }

    // Create review
    const review = await db.review.create({
      data: {
        callSessionId: id,
        fromUserId,
        toUserId,
        rating: Number(rating),
        comment: comment || null,
      },
      include: {
        fromUser: {
          select: { id: true, name: true, avatar: true },
        },
        toUser: {
          select: { id: true, name: true, avatar: true },
        },
      },
    });

    // Update nanny average rating
    const allReviews = await db.review.findMany({
      where: { toUserId },
    });
    const avgRating = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;

    await db.nannyProfile.update({
      where: { userId: toUserId },
      data: { rating: parseFloat(avgRating.toFixed(1)) },
    });

    // Update call with review info
    await db.callSession.update({
      where: { id },
      data: {
        rating: Number(rating),
        reviewComment: comment || null,
      },
    });

    return NextResponse.json(
      { review, message: 'Review submitted successfully' },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Create review error:', error);
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    );
  }
}
