const { prisma } = require('./lib/prisma.ts');

async function testConnection() {
  try {
    console.log('Testing database connection...');
    
    // Test basic connection
    await prisma.$connect();
    console.log('✅ Database connected successfully');
    
    // Test a simple query
    const userCount = await prisma.user.count();
    console.log(`✅ User count query successful: ${userCount} users`);
    
    console.log('✅ All database tests passed!');
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    if (error.message.includes('HOST:5432')) {
      console.error('❌ Still connecting to HOST:5432 instead of Neon database');
    }
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();
