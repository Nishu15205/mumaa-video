import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, bankName, accountNumber, ifscCode, accountHolder, upiId } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
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

    const updateData: any = {};
    if (bankName !== undefined) updateData.bankName = bankName;
    if (accountNumber !== undefined) updateData.accountNumber = accountNumber;
    if (ifscCode !== undefined) updateData.ifscCode = ifscCode;
    if (accountHolder !== undefined) updateData.accountHolder = accountHolder;
    if (upiId !== undefined) updateData.upiId = upiId;

    const updated = await db.nannyProfile.update({
      where: { userId },
      data: updateData,
    });

    return NextResponse.json({
      nannyProfile: updated,
      message: 'Bank details updated successfully',
    });
  } catch (error: any) {
    console.error('Update bank details error:', error);
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    );
  }
}
