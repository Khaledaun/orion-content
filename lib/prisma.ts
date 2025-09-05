// lib/prisma.ts - DNS-resilient Prisma client with env guards
import { isDatabaseAvailable, isBuildTime } from './env-guard';

let PrismaClient: any = null;
let prismaInstance: any = null;

// Enhanced environment checks for Vercel
const shouldSkipPrisma = (
  process.env.SKIP_PRISMA_GENERATE === 'true' || 
  process.env.CI === 'true' || 
  process.env.VERCEL === '1' || 
  process.env.VERCEL_ENV ||
  process.env.GITHUB_ACTIONS ||
  // Additional Vercel-specific checks
  typeof process.env.VERCEL_URL !== 'undefined' ||
  process.env.NOW_REGION || // Legacy Vercel env
  isBuildTime() || 
  !isDatabaseAvailable()
);

console.log('Prisma initialization check:', {
  SKIP_PRISMA_GENERATE: process.env.SKIP_PRISMA_GENERATE,
  CI: process.env.CI,
  VERCEL: process.env.VERCEL,
  VERCEL_ENV: process.env.VERCEL_ENV,
  VERCEL_URL: process.env.VERCEL_URL,
  NOW_REGION: process.env.NOW_REGION,
  shouldSkipPrisma,
  isBuildTime: isBuildTime(),
  isDatabaseAvailable: isDatabaseAvailable()
});

if (shouldSkipPrisma) {
  console.log('Skipping Prisma initialization - build time, CI environment, or database not available');
  prismaInstance = null;
} else {
  try {
    // Only attempt to require Prisma in safe environments
    const prismaModule = require('@prisma/client');
    PrismaClient = prismaModule.PrismaClient;
    
    const globalForPrisma = global as unknown as { prisma?: any };
    
    prismaInstance = globalForPrisma.prisma ?? new PrismaClient({ 
      log: ['warn', 'error'],
      errorFormat: 'minimal'
    });
    
    if (process.env.NODE_ENV !== 'production') {
      globalForPrisma.prisma = prismaInstance;
    }
  } catch (error) {
    console.warn('Prisma client not available (likely due to DNS restrictions during build):', error instanceof Error ? error.message : String(error));
    prismaInstance = null;
  }
}

export const prisma = prismaInstance;
