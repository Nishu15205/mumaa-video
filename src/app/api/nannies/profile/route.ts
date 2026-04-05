import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, experience, skills, hourlyRate, languages, certifications, ageGroup } = body;

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
    if (experience !== undefined) updateData.experience = Number(experience);
    if (skills !== undefined) updateData.skills = skills;
    if (hourlyRate !== undefined) updateData.hourlyRate = Number(hourlyRate);
    if (languages !== undefined) updateData.languages = languages;
    if (certifications !== undefined) updateData.certifications = certifications;
    if (ageGroup !== undefined) updateData.ageGroup = ageGroup;

    const updated = await db.nannyProfile.update({
      where: { userId },
      data: updateData,
    });

    return NextResponse.json({
      nannyProfile: updated,
      message: 'Nanny profile updated successfully',
    });
  } catch (error: any) {
    console.error('Update nanny profile error:', error);
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    );
  }
}
