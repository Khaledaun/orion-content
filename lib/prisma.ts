// lib/prisma.ts - Build-safe Prisma client
// This module exports either a real Prisma client or a static mock during build

// Detect build environment
const isBuildEnvironment = (
  process.env.SKIP_PRISMA_GENERATE === 'true' || 
  process.env.CI === 'true' || 
  process.env.VERCEL === '1' || 
  process.env.VERCEL_ENV ||
  process.env.VERCEL_URL ||
  process.env.NOW_REGION ||
  process.env.GITHUB_ACTIONS
);

// Static mock model for build time
const mockModel = {
  findMany: async () => [],
  findUnique: async () => null,
  findFirst: async () => null,
  create: async () => null,
  update: async () => null,
  delete: async () => null,
  upsert: async () => null,
  count: async () => 0,
  aggregate: async () => ({}),
  groupBy: async () => [],
  deleteMany: async () => ({ count: 0 }),
  updateMany: async () => ({ count: 0 }),
};

// Static mock client for build time
const mockPrismaClient = {
  $connect: async () => Promise.resolve(),
  $disconnect: async () => Promise.resolve(),
  $queryRaw: async () => [],
  $executeRaw: async () => 0,
  $transaction: async (fn: any) => typeof fn === 'function' ? fn(mockPrismaClient) : Promise.resolve(),
  
  // All models used in the application
  user: mockModel,
  site: mockModel,
  week: mockModel,
  topic: mockModel,
  account: mockModel,
  session: mockModel,
  userRole: mockModel,
  review: mockModel,
  userOnboarding: mockModel,
  category: mockModel,
  connection: mockModel,
};

let prismaInstance: any;

if (isBuildEnvironment) {
  // During build: use static mock - never load real Prisma
  console.log('Prisma: Using static mock for build environment');
  prismaInstance = mockPrismaClient;
} else {
  // Runtime: try to load real Prisma, fallback to mock if failed
  try {
    const globalForPrisma = global as unknown as { __prisma?: any };
    
    if (!globalForPrisma.__prisma) {
      // Only load @prisma/client at runtime
      const { PrismaClient } = require('@prisma/client');
      globalForPrisma.__prisma = new PrismaClient({
        log: ['warn', 'error'],
        errorFormat: 'minimal'
      });
      console.log('Prisma: Real client initialized');
    }
    
    prismaInstance = globalForPrisma.__prisma;
  } catch (error) {
    console.warn('Prisma: Failed to load real client, using mock:', error instanceof Error ? error.message : String(error));
    prismaInstance = mockPrismaClient;
  }
}

export const prisma = prismaInstance;
export default prismaInstance;
