import { NextResponse } from 'next/server';
import { execSync } from 'child_process';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';

export async function POST() {
  try {
    // Push schema to database (creates tables if not exist)
    try {
      execSync('npx prisma db push --skip-generate --accept-data-loss 2>&1', {
        stdio: 'pipe',
        timeout: 60000,
      });
    } catch (pushError: any) {
      console.error('Prisma push warning:', pushError?.message || pushError);
      // Continue anyway — tables might already exist
    }

    // Check if admin already exists
    const existingAdmin = await db.user.findFirst({ where: { role: 'ADMIN' } });
    if (existingAdmin) {
      return NextResponse.json(
        { message: 'Database ready! Admin account already exists.', adminId: existingAdmin.id },
        { status: 200 }
      );
    }

    // Create admin user
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

    // Create demo parent
    const parentPassword = await bcrypt.hash('password123', 12);
    const parent = await db.user.create({
      data: {
        name: 'Demo Parent',
        email: 'parent@mumaa.com',
        password: parentPassword,
        role: 'PARENT',
        isOnline: true,
      },
    });
    await db.parentProfile.create({
      data: { userId: parent.id },
    });

    // Create demo nanny
    const nannyPassword = await bcrypt.hash('password123', 12);
    const nanny = await db.user.create({
      data: {
        name: 'Priya Sharma',
        email: 'nanny@mumaa.com',
        password: nannyPassword,
        role: 'NANNY',
        isOnline: true,
      },
    });
    await db.nannyProfile.create({
      data: {
        userId: nanny.id,
        experience: 5,
        skills: 'Infant Care,Toddler Care,Sleep Training',
        hourlyRate: 300,
        isAvailable: true,
        rating: 4.8,
        totalSessions: 120,
        languages: 'Hindi,English',
        certifications: 'CCC Certified,First Aid',
        ageGroup: '0-5 years',
      },
    });

    return NextResponse.json(
      {
        message: 'Database setup complete! Demo users created.',
        users: {
          admin: { email: 'admin@mumaa.in', password: 'admin123' },
          parent: { email: 'parent@mumaa.com', password: 'password123' },
          nanny: { email: 'nanny@mumaa.com', password: 'password123' },
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
