import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding for Veil...');

  const adminEmail = process.env.ADMIN_EMAIL || 'admin@veil.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin';
  const hashedPassword = await bcrypt.hash(adminPassword, 10);

  const tables = await prisma.$queryRaw`
  SELECT current_database(), current_schema(), current_user;
`;

  console.log('Database connection info:', tables);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      name: 'Veil Admin',
      email: adminEmail,
      password: hashedPassword,
      isActive: true,
    },
  });
  console.log(
    `✅ Admin user ready: ${admin.email} (Password: ${adminPassword})`,
  );

  const existingSettings = await prisma.storeSettings.findFirst();
  if (!existingSettings) {
    await prisma.storeSettings.create({
      data: {
        storeName: 'Veil',
        phone: '+201000000000',
        whatsapp: '+201000000000',
        defaultDeliveryFee: 60,
        freeShippingThreshold: 1500,
        isOpen: true,
      },
    });
    console.log('✅ Default store settings created');
  }

  const defaultCategories = [
    {
      name: 'Men Perfumes',
      slug: 'men-perfumes',
      description: 'Bold, woody, and refined fragrances crafted for men.',
    },
    {
      name: 'Women Perfumes',
      slug: 'women-perfumes',
      description: 'Elegant floral, sweet, and captivating scents for women.',
    },
    {
      name: 'Unisex',
      slug: 'unisex',
      description: 'Balanced, versatile signature scents for everyone.',
    },
    {
      name: 'Oriental & Oud',
      slug: 'oriental-oud',
      description: 'Rich Arabian oud, amber, and warm spicy blends.',
    },
  ];

  for (const cat of defaultCategories) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {},
      create: cat,
    });
  }
  console.log('✅ Default categories seeded');
  console.log('🚀 Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
