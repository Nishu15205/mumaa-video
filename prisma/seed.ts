import { PrismaClient } from '@prisma/client'
import { hashSync } from 'bcryptjs'

const prisma = new PrismaClient()

async function seed() {
  console.log('🌱 Seeding database...')

  // Create admin
  const admin = await prisma.user.upsert({
    where: { email: 'admin@mumaa.com' },
    update: {},
    create: {
      name: 'Admin User',
      email: 'admin@mumaa.com',
      password: hashSync('demo123', 10),
      role: 'ADMIN',
      isOnline: false,
      isActive: true,
    },
  })
  console.log(`✅ Admin: ${admin.email}`)

  // Create parent
  const parent = await prisma.user.upsert({
    where: { email: 'parent@demo.com' },
    update: {},
    create: {
      name: 'Rahul Sharma',
      email: 'parent@demo.com',
      password: hashSync('demo123', 10),
      role: 'PARENT',
      isOnline: true,
      isActive: true,
    },
  })
  console.log(`✅ Parent: ${parent.email}`)

  // Create parent profile
  await prisma.parentProfile.upsert({
    where: { userId: parent.id },
    update: {},
    create: {
      userId: parent.id,
      childrenCount: 1,
      childrenAges: '3',
      preferences: 'Patient, experienced with toddlers',
    },
  })

  // Create PRO subscription for parent
  await prisma.subscription.upsert({
    where: { id: `sub-${parent.id}` },
    update: {},
    create: {
      id: `sub-${parent.id}`,
      userId: parent.id,
      plan: 'PRO',
      status: 'ACTIVE',
      isTrial: false,
      currentPeriodEnds: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  })

  // Create nanny
  const nanny = await prisma.user.upsert({
    where: { email: 'nanny@demo.com' },
    update: {},
    create: {
      name: 'Sunita Devi',
      email: 'nanny@demo.com',
      password: hashSync('demo123', 10),
      role: 'NANNY',
      phone: '+91-9876543210',
      bio: 'Experienced nanny with 5+ years in child care. Specialized in toddler care and early education.',
      isOnline: true,
      isActive: true,
    },
  })
  console.log(`✅ Nanny: ${nanny.email}`)

  // Create nanny profile
  await prisma.nannyProfile.upsert({
    where: { userId: nanny.id },
    update: {},
    create: {
      userId: nanny.id,
      experience: 5,
      skills: 'Baby Care,Toddler Care,Child Development,First Aid,Nutrition,Early Education',
      hourlyRate: 300,
      isAvailable: true,
      rating: 4.8,
      totalSessions: 127,
      totalEarnings: 38100,
      paidEarnings: 35000,
      languages: 'Hindi,English',
      certifications: 'Child Care Certificate,First Aid Certified',
      ageGroup: '0-2,2-5,5-10',
      bankName: '',
      accountNumber: '',
      ifscCode: '',
      accountHolder: '',
      upiId: 'sunita@upi',
    },
  })

  // Create another nanny (Priya)
  const nanny2 = await prisma.user.upsert({
    where: { email: 'priya@demo.com' },
    update: {},
    create: {
      name: 'Priya Patel',
      email: 'priya@demo.com',
      password: hashSync('demo123', 10),
      role: 'NANNY',
      phone: '+91-9876543211',
      bio: 'Loving and caring nanny. Passionate about child development and learning activities.',
      isOnline: true,
      isActive: true,
    },
  })
  console.log(`✅ Nanny: ${nanny2.email}`)

  await prisma.nannyProfile.upsert({
    where: { userId: nanny2.id },
    update: {},
    create: {
      userId: nanny2.id,
      experience: 3,
      skills: 'Baby Care,Toddler Care,Sleep Training,Nutrition',
      hourlyRate: 250,
      isAvailable: true,
      rating: 4.6,
      totalSessions: 85,
      totalEarnings: 21250,
      paidEarnings: 20000,
      languages: 'Hindi,Gujarati,English',
      certifications: 'Early Childhood Education',
      ageGroup: '0-2,2-5',
      upiId: 'priya@upi',
    },
  })

  console.log('\n🎉 Seed complete!')
  console.log('────────────────────────────────')
  console.log('Login Credentials:')
  console.log('  Parent:  parent@demo.com / demo123')
  console.log('  Nanny:   nanny@demo.com / demo123')
  console.log('  Nanny2:  priya@demo.com / demo123')
  console.log('  Admin:   admin@mumaa.com / demo123')
  console.log('────────────────────────────────')
}

seed()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
