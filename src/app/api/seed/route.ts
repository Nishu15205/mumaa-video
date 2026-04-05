import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';

export async function POST() {
  try {
    // Check if admin already exists
    const existingAdmin = await db.user.findFirst({ where: { role: 'ADMIN' } });
    if (existingAdmin) {
      return NextResponse.json(
        { message: 'Admin account already exists. No seed data needed.', adminId: existingAdmin.id },
        { status: 200 }
      );
    }

    // Create only the admin user
    const adminPassword = await bcrypt.hash('admin123', 12);
    const admin = await db.user.create({
      data: {
        name: 'MUMAA Admin',
        email: 'admin@mumaa.in',
        password: adminPassword,
        role: 'ADMIN',
        isOnline: true,
      },
    });

    return NextResponse.json(
      {
        message: 'Admin account created successfully',
        admin: {
          id: admin.id,
          email: admin.email,
          name: admin.name,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Seed error:', error);
    return NextResponse.json(
      { error: 'Something went wrong during seeding', details: error.message },
      { status: 500 }
    );
  }
}
