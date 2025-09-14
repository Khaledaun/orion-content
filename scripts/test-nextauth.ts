#!/usr/bin/env npx tsx

/**
 * Simple test to verify NextAuth configuration loads correctly
 */

import 'dotenv/config';

async function testNextAuthConfig() {
  try {
    console.log('🔍 Testing NextAuth configuration...');
    
    // Set test environment variables
    process.env.NEXTAUTH_URL = 'http://localhost:3000';
    process.env.NEXTAUTH_SECRET = 'demo-secret-please-set-in-production';
    process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';
    process.env.ENCRYPTION_KEY = '12345678901234567890123456789012';
    process.env.NODE_ENV = 'development';

    const { authOptions } = await import('../app/lib/nextauth');
    
    console.log('✅ NextAuth configuration loaded successfully');
    console.log('  Providers count:', authOptions.providers?.length || 0);
    console.log('  Secret set:', !!authOptions.secret);
    console.log('  Session strategy:', authOptions.session?.strategy);
    
    // Test provider configuration
    if (authOptions.providers && authOptions.providers.length > 0) {
      console.log('  Configured providers:');
      authOptions.providers.forEach((provider: any, index: number) => {
        console.log(`    ${index + 1}. ${provider.name || provider.id}`);
      });
    }
    
    console.log('🎉 All tests passed!');
    return true;
    
  } catch (error) {
    console.error('❌ Failed to load NextAuth config:', error);
    return false;
  }
}

if (require.main === module) {
  testNextAuthConfig()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Test failed:', error);
      process.exit(1);
    });
}

export { testNextAuthConfig };