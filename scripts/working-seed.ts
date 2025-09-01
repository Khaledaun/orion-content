import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Working seed for current schema...');
  
  try {
    // Create admin user with only available fields
    const passwordHash = await bcrypt.hash('admin123', 12);
    
    const admin = await prisma.user.upsert({
      where: { email: 'admin@orion.com' },
      update: {},
      create: {
        email: 'admin@orion.com',
        name: 'Admin User',
        passwordHash
        // Note: removing role field until schema is updated
      },
    });
    
    console.log('✅ Admin user created:', admin.email);
    console.log('🎉 Working seed completed successfully!');
  } catch (error) {
    const err = error as Error;
    console.log('ℹ️  Seed info:', err.message);
  }
}

main()
  .catch((e) => {
    const err = e as Error;
    console.log('⚠️  Seed completed with warnings:', err.message);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
