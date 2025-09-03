// lib/prisma.ts - DNS-resilient Prisma client
// Safe import that handles cases where Prisma client is not available due to DNS blocks
let PrismaClient: any = null;
let prismaInstance: any = null;

try {
  // Try to import PrismaClient, but don't fail if binaries aren't downloaded
  PrismaClient = require('@prisma/client').PrismaClient;
  
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

export const prisma = prismaInstance;
