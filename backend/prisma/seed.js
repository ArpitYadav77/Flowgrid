// ─── Prisma Seed Script ─────────────────────────────────────────────
// Run with: npx prisma db seed

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...\n');

  const demoHash = await bcrypt.hash('Demo@1234', 10);

  // ─── Admin User ───────────────────────────────────────────────────
  const admin = await prisma.user.upsert({
    where: { email: 'admin@flowgrid.com' },
    update: {},
    create: {
      email: 'admin@flowgrid.com',
      password: demoHash,
      name: 'Arpit Yadav',
      role: 'ADMIN',
      isEmailVerified: true,
      isFirstLogin: false,
    },
  });
  console.log(`✅ Admin: ${admin.email}`);

  // ─── Customer User ────────────────────────────────────────────────
  const customer = await prisma.user.upsert({
    where: { email: 'customer@flowgrid.com' },
    update: {},
    create: {
      email: 'customer@flowgrid.com',
      password: demoHash,
      name: 'Rahul Sharma',
      phone: '+91-9876543210',
      role: 'CUSTOMER',
      isEmailVerified: true,
      isFirstLogin: false,
    },
  });
  console.log(`✅ Customer: ${customer.email}`);

  // ─── Provider: Salon ──────────────────────────────────────────────
  const salonUser = await prisma.user.upsert({
    where: { email: 'salon@flowgrid.com' },
    update: {},
    create: {
      email: 'salon@flowgrid.com',
      password: demoHash,
      name: "Priya's Beauty Salon",
      role: 'PROVIDER',
      isEmailVerified: true,
      isFirstLogin: false,
    },
  });

  const salonProvider = await prisma.provider.upsert({
    where: { userId: salonUser.id },
    update: {},
    create: {
      userId: salonUser.id,
      businessName: "Priya's Beauty Salon",
      description: 'Premium beauty salon with experienced stylists',
      category: 'salon',
      address: '123 MG Road',
      city: 'Delhi',
      state: 'Delhi',
      pincode: '110001',
      latitude: 28.6139,
      longitude: 77.2090,
      isVerified: true,
      rating: 4.8,
      totalReviews: 287,
      businessHours: {
        monday: { open: '09:00', close: '18:00' },
        tuesday: { open: '09:00', close: '18:00' },
        wednesday: { open: '09:00', close: '18:00' },
        thursday: { open: '09:00', close: '18:00' },
        friday: { open: '09:00', close: '18:00' },
        saturday: { open: '10:00', close: '16:00' },
        sunday: null,
      },
    },
  });
  console.log(`✅ Salon Provider: ${salonUser.email}`);

  // ─── Provider: Tutor ──────────────────────────────────────────────
  const tutorUser = await prisma.user.upsert({
    where: { email: 'tutor@flowgrid.com' },
    update: {},
    create: {
      email: 'tutor@flowgrid.com',
      password: demoHash,
      name: 'Amit Kumar',
      role: 'PROVIDER',
      isEmailVerified: true,
      isFirstLogin: false,
    },
  });

  const tutorProvider = await prisma.provider.upsert({
    where: { userId: tutorUser.id },
    update: {},
    create: {
      userId: tutorUser.id,
      businessName: "Amit's Math Academy",
      description: 'Expert math and physics tutoring for classes 8-12',
      category: 'tutor',
      address: '456 Sector 17',
      city: 'Noida',
      state: 'Uttar Pradesh',
      pincode: '201301',
      latitude: 28.5355,
      longitude: 77.3910,
      isVerified: true,
      rating: 4.9,
      totalReviews: 342,
      businessHours: {
        monday: { open: '10:00', close: '20:00' },
        tuesday: { open: '10:00', close: '20:00' },
        wednesday: { open: '10:00', close: '20:00' },
        thursday: { open: '10:00', close: '20:00' },
        friday: { open: '10:00', close: '20:00' },
        saturday: { open: '10:00', close: '18:00' },
        sunday: { open: '14:00', close: '18:00' },
      },
    },
  });
  console.log(`✅ Tutor Provider: ${tutorUser.email}`);

  // ─── Salon Services ───────────────────────────────────────────────
  const salonServices = [
    { name: 'Haircut', description: 'Professional haircut by experienced stylists', duration: 30, price: 299 },
    { name: 'Beard Trim', description: 'Precise beard trimming and styling', duration: 20, price: 149 },
    { name: 'Facial Treatment', description: 'Relaxing facial with premium products', duration: 45, price: 599 },
    { name: 'Hair Coloring', description: 'Premium hair coloring with global brands', duration: 90, price: 1499 },
    { name: 'Bridal Makeup', description: 'Complete bridal makeup package', duration: 120, price: 4999 },
  ];

  for (const svc of salonServices) {
    await prisma.service.upsert({
      where: {
        id: `seed-salon-${svc.name.toLowerCase().replace(/\s+/g, '-')}`,
      },
      update: {},
      create: {
        id: `seed-salon-${svc.name.toLowerCase().replace(/\s+/g, '-')}`,
        providerId: salonProvider.id,
        name: svc.name,
        description: svc.description,
        category: 'salon',
        duration: svc.duration,
        price: svc.price,
        currency: 'INR',
        status: 'ACTIVE',
      },
    });
  }
  console.log(`✅ ${salonServices.length} salon services created`);

  // ─── Tutor Services ───────────────────────────────────────────────
  const tutorServices = [
    { name: 'Math Tutoring (1 hr)', description: 'One-on-one math tutoring for classes 8-12', duration: 60, price: 500 },
    { name: 'Physics Tutoring (1 hr)', description: 'Comprehensive physics lessons', duration: 60, price: 550 },
    { name: 'Chemistry Tutoring (1 hr)', description: 'Detailed chemistry coaching', duration: 60, price: 550 },
    { name: 'Exam Preparation (2 hr)', description: 'Intensive exam prep sessions', duration: 120, price: 900 },
  ];

  for (const svc of tutorServices) {
    await prisma.service.upsert({
      where: {
        id: `seed-tutor-${svc.name.toLowerCase().replace(/\s+/g, '-')}`,
      },
      update: {},
      create: {
        id: `seed-tutor-${svc.name.toLowerCase().replace(/\s+/g, '-')}`,
        providerId: tutorProvider.id,
        name: svc.name,
        description: svc.description,
        category: 'tutor',
        duration: svc.duration,
        price: svc.price,
        currency: 'INR',
        status: 'ACTIVE',
      },
    });
  }
  console.log(`✅ ${tutorServices.length} tutor services created`);

  // ─── Generate Time Slots for Next 7 Days ──────────────────────────
  const today = new Date();
  let totalSlots = 0;

  for (let day = 0; day < 7; day++) {
    const date = new Date(today);
    date.setDate(date.getDate() + day);
    date.setHours(0, 0, 0, 0);

    // Salon slots: 9 AM - 6 PM, every 30 minutes
    const salonSlotTimes = [];
    for (let hour = 9; hour < 18; hour++) {
      for (let min = 0; min < 60; min += 30) {
        const startTime = `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
        const endMin = min + 30;
        const endHour = hour + Math.floor(endMin / 60);
        const endMinute = endMin % 60;
        const endTime = `${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}`;
        salonSlotTimes.push({ startTime, endTime });
      }
    }

    for (const { startTime, endTime } of salonSlotTimes) {
      try {
        await prisma.timeSlot.upsert({
          where: {
            providerId_date_startTime: {
              providerId: salonProvider.id,
              date,
              startTime,
            },
          },
          update: {},
          create: {
            providerId: salonProvider.id,
            date,
            startTime,
            endTime,
            status: 'AVAILABLE',
          },
        });
        totalSlots++;
      } catch {
        // Ignore duplicates
      }
    }

    // Tutor slots: 10 AM - 8 PM, every 60 minutes
    const tutorSlotTimes = [];
    for (let hour = 10; hour < 20; hour++) {
      const startTime = `${String(hour).padStart(2, '0')}:00`;
      const endTime = `${String(hour + 1).padStart(2, '0')}:00`;
      tutorSlotTimes.push({ startTime, endTime });
    }

    for (const { startTime, endTime } of tutorSlotTimes) {
      try {
        await prisma.timeSlot.upsert({
          where: {
            providerId_date_startTime: {
              providerId: tutorProvider.id,
              date,
              startTime,
            },
          },
          update: {},
          create: {
            providerId: tutorProvider.id,
            date,
            startTime,
            endTime,
            status: 'AVAILABLE',
          },
        });
        totalSlots++;
      } catch {
        // Ignore duplicates
      }
    }
  }
  console.log(`✅ ${totalSlots} time slots created for 7 days`);

  console.log('\n🎉 Seed completed successfully!');
  console.log('\n📋 Demo Accounts (password: Demo@1234):');
  console.log('   Admin    : admin@flowgrid.com');
  console.log('   Customer : customer@flowgrid.com');
  console.log('   Salon    : salon@flowgrid.com');
  console.log('   Tutor    : tutor@flowgrid.com\n');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
