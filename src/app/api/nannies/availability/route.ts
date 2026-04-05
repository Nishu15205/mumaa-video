import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, isAvailable } = body;

    if (!userId || isAvailable === undefined) {
      return NextResponse.json(
        { error: 'userId and isAvailable are required' },
        { status: 400 }
      );
    }

    const nannyProfile = await db.nannyProfile.findUnique({
      where: { userId },
    });

    if (!nannyProfile) {
      return NextResponse.json(
        { error: 'Nanny profile not found' },
        { status: 404 }
      );
    }

    const updated = await db.nannyProfile.update({
      where: { userId },
      data: { isAvailable },
    });

    return NextResponse.json({
      nannyProfile: updated,
      message: `Availability ${isAvailable ? 'enabled' : 'disabled'} successfully`,
    });
  } catch (error: any) {
    console.error('Update availability error:', error);
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    );
  }
}
