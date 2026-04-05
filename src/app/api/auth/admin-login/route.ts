import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = body;

    // Hardcoded admin credentials
    const ADMIN_EMAIL = 'admin@mumaa.in';
    const ADMIN_PASSWORD = 'admin123';

    if (email !== ADMIN_EMAIL || password !== ADMIN_PASSWORD) {
      return NextResponse.json(
        { error: 'Invalid admin credentials' },
        { status: 401 }
      );
    }

    // Find or create admin user
    let adminUser = await db.user.findUnique({
      where: { email: ADMIN_EMAIL },
      include: {
        subscriptions: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!adminUser) {
      const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 12);
      adminUser = await db.user.create({
        data: {
          name: 'MUMAA Admin',
          email: ADMIN_EMAIL,
          password: hashedPassword,
          role: 'ADMIN',
          isOnline: true,
        },
        include: {
          subscriptions: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      });
    } else {
      // Update online status
      await db.user.update({
        where: { id: adminUser.id },
        data: { isOnline: true },
      });
    }

    const { password: _, subscriptions, ...userWithoutPassword } = adminUser;

    return NextResponse.json({
      user: userWithoutPassword,
      subscription: subscriptions[0] || null,
      message: 'Admin login successful',
    });
  } catch (error: any) {
    console.error('Admin login error:', error);
    return NextResponse.json(
      { error: 'Something went wrong during admin login' },
      { status: 500 }
    );
  }
}
