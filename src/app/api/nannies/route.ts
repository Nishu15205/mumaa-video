import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { checkRateLimit } from '@/lib/rate-limit';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const all = searchParams.get('all');
    const skill = searchParams.get('skill');
    const search = searchParams.get('search');
    const minRating = searchParams.get('minRating');
    const language = searchParams.get('language');
    const available = searchParams.get('available');

    // ── ?all=true — Simple list of all nannies for dropdowns ───────
    if (all === 'true') {
      const nannies = await db.user.findMany({
        where: { role: 'NANNY', isActive: true },
        select: { id: true, name: true, email: true },
        orderBy: { name: 'asc' },
      });
      return NextResponse.json({ nannies });
    }

    // Rate limiting check (search: 30 req/min per IP)
    const { success, headers } = await checkRateLimit(req, 'search');
    if (!success) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429, headers }
      );
    }

    const where: any = {
      user: { isActive: true },
    };

    if (available === 'true') {
      where.isAvailable = true;
    }

    if (minRating) {
      where.rating = { gte: parseFloat(minRating) };
    }

    if (skill) {
      where.skills = { contains: skill };
    }

    if (language) {
      where.languages = { contains: language };
    }

    if (search) {
      where.OR = [
        { user: { name: { contains: search } } },
        { skills: { contains: search } },
      ];
    }

    const nannies = await db.nannyProfile.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
            bio: true,
            isOnline: true,
          },
        },
      },
      orderBy: { rating: 'desc' },
    });

    return NextResponse.json({ nannies }, { headers });
  } catch (error: any) {
    console.error('List nannies error:', error);
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    );
  }
}
