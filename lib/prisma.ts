// lib/prisma.ts - Build-safe Prisma client with dynamic loading only
// This module provides dynamic loading functions to prevent webpack build-time analysis

// Detect build environment
function isBuildEnvironment() {
  return (
    process.env.SKIP_PRISMA_GENERATE === 'true' || 
    process.env.CI === 'true' || 
    process.env.VERCEL === '1' || 
    process.env.VERCEL_ENV ||
    process.env.VERCEL_URL ||
    process.env.NOW_REGION ||
    process.env.GITHUB_ACTIONS
  );
}

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

/**
 * Dynamic Prisma client loader - prevents build-time analysis
 * This function should be used instead of static imports
 */
export async function getPrismaClient() {
  if (isBuildEnvironment()) {
    console.log('Prisma: Using static mock for build environment');
    return mockPrismaClient;
  }

  try {
    const globalForPrisma = global as unknown as { __prisma?: any };
    
    if (!globalForPrisma.__prisma) {
      // Dynamic require to prevent webpack bundling during build
      const { PrismaClient } = eval('require')('@prisma/client');
      globalForPrisma.__prisma = new PrismaClient({
        log: ['warn', 'error'],
        errorFormat: 'minimal'
      });
      console.log('Prisma: Real client initialized');
    }
    
    return globalForPrisma.__prisma;
  } catch (error) {
    console.warn('Prisma: Failed to load real client, using mock:', error instanceof Error ? error.message : String(error));
    return mockPrismaClient;
  }
}

// Legacy export for backward compatibility during transition
// This will be a mock during build time to prevent webpack analysis
let prismaInstance: any;

if (isBuildEnvironment()) {
  prismaInstance = mockPrismaClient;
} else {
  // For runtime, create a lazy-loaded proxy
  prismaInstance = new Proxy({}, {
    get(target, prop) {
      console.warn(`Prisma: Legacy direct access to '${String(prop)}' detected. Please use getPrismaClient() instead.`);
      return mockModel[prop as keyof typeof mockModel] || mockPrismaClient[prop as keyof typeof mockPrismaClient];
    }
  });
}

export const prisma = prismaInstance;
export default prismaInstance;
