import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Phase 9 data...');

  // Create a test user
  const user = await prisma.user.upsert({
    where: { email: 'admin@orion.test' },
    update: {},
    create: {
      email: 'admin@orion.test',
      passwordHash: 'hashed-password-placeholder'
    }
  });

  console.log('✅ Created user:', user.email);

  // Create a test site with all required fields
  const site = await prisma.site.upsert({
    where: { id: 'test-site-1' },
    update: {},
    create: {
      id: 'test-site-1',
      name: 'Test Site',
      key: 'test-site-key-1'
    }
  });

  console.log('✅ Created site:', site.name);
  console.log('🎉 Phase 9 seeding complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
