// lib/prisma.ts - DNS-resilient Prisma client with env guards
import { isDatabaseAvailable, isBuildTime } from './env-guard';

let PrismaClient: any = null;
let prismaInstance: any = null;

// Skip Prisma completely in build/CI environments or when explicitly disabled
const shouldSkipPrisma = (
  process.env.SKIP_PRISMA_GENERATE === 'true' || 
  process.env.CI === 'true' || 
  process.env.VERCEL === '1' || 
  isBuildTime() || 
  !isDatabaseAvailable()
);

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
      // Add error handling for connection issues
      errorFormat: 'minimal'
    });
    
    if (process.env.NODE_ENV !== 'production') {
      globalForPrisma.prisma = prismaInstance;
    }
  } catch (error) {
    console.warn('Prisma client not available (likely due to DNS restrictions during build):', error instanceof Error ? error.message : String(error));
    // Create a mock client that won't crash the application
    prismaInstance = null;
  }
}

export const prisma = prismaInstance;
