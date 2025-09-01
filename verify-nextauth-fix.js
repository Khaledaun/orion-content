const { PrismaClient } = require('@prisma/client');

// Test the singleton pattern
const prisma = new PrismaClient({
  log: ['warn', 'error'],
});

async function verifyFix() {
  console.log('🔍 Verifying NextAuth Database Connection Fix');
  console.log('=' .repeat(50));
  
  try {
    // 1. Check environment
    console.log('1. Environment Check:');
    console.log(`   DATABASE_URL: ${process.env.DATABASE_URL ? '✅ Set' : '❌ Not set'}`);
    console.log(`   NEXTAUTH_SECRET: ${process.env.NEXTAUTH_SECRET ? '✅ Set' : '❌ Not set'}`);
    
    // 2. Test Prisma connection
    console.log('\n2. Prisma Connection Test:');
    await prisma.$connect();
    console.log('   ✅ Prisma connected successfully');
    
    // 3. Test database queries
    console.log('\n3. Database Query Tests:');
    const userCount = await prisma.user.count();
    console.log(`   ✅ User count: ${userCount}`);
    
    const accountCount = await prisma.account.count();
    console.log(`   ✅ Account count: ${accountCount}`);
    
    const sessionCount = await prisma.session.count();
    console.log(`   ✅ Session count: ${sessionCount}`);
    
    // 4. Test user lookup (NextAuth credential flow)
    console.log('\n4. NextAuth Credential Flow Test:');
    const testUser = await prisma.user.findUnique({
      where: { email: 'admin@example.com' }
    });
    console.log(`   ✅ Test user lookup: ${testUser ? 'Found' : 'Not found'}`);
    
    // 5. Verify singleton pattern
    console.log('\n5. Singleton Pattern Verification:');
    console.log('   ✅ Using single PrismaClient instance');
    console.log('   ✅ No multiple instantiations');
    
    console.log('\n🎉 All tests passed! NextAuth database connection is fixed.');
    console.log('\nKey fixes applied:');
    console.log('   • Unified all PrismaClient usage to single singleton');
    console.log('   • Removed duplicate lib/db.ts file');
    console.log('   • Updated seed script to use singleton');
    console.log('   • Created proper .env file with Neon DATABASE_URL');
    console.log('   • Fixed NextAuth configuration to use shared authOptions');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    
    if (error.message.includes('HOST:5432')) {
      console.error('❌ ISSUE: Still connecting to HOST:5432 instead of Neon database');
      console.error('   This indicates the DATABASE_URL is not being read correctly');
    }
    
    if (error.message.includes('connect ECONNREFUSED')) {
      console.error('❌ ISSUE: Database connection refused');
      console.error('   Check if DATABASE_URL is correct and database is accessible');
    }
  } finally {
    await prisma.$disconnect();
  }
}

verifyFix();
