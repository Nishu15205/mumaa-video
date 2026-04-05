import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const role = searchParams.get('role');
    const search = searchParams.get('search');

    const where: any = {};

    if (role && ['PARENT', 'NANNY', 'ADMIN'].includes(role)) {
      where.role = role;
    }

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
      ];
    }

    const users = await db.user.findMany({
      where,
      include: {
        nannyProfile: true,
        parentProfile: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Remove passwords from response
    const sanitizedUsers = users.map(({ password: _, ...user }) => user);

    return NextResponse.json({ users: sanitizedUsers });
  } catch (error: any) {
    console.error('List admin users error:', error);
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    );
  }
}
