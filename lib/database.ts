// lib/database.ts - Runtime-only database operations
// This module is never imported during build - only dynamically loaded at runtime

let cachedPrisma: any = null;

export async function getDatabaseClient() {
  // Only load Prisma at runtime
  if (typeof window !== 'undefined') {
    // Client-side - return null, database operations should be server-side
    return null;
  }

  if (cachedPrisma) {
    return cachedPrisma;
  }

  try {
    // Dynamic import to prevent webpack from bundling this during build
    const { PrismaClient } = await import('@prisma/client');
    cachedPrisma = new PrismaClient({
      log: ['warn', 'error'],
      errorFormat: 'minimal'
    });
    
    console.log('Database: Real Prisma client loaded successfully');
    return cachedPrisma;
  } catch (error) {
    console.warn('Database: Failed to load Prisma client:', error);
    
    // Return a mock client that behaves like Prisma but doesn't connect
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

    cachedPrisma = {
      $connect: async () => Promise.resolve(),
      $disconnect: async () => Promise.resolve(),
      $queryRaw: async () => [],
      $executeRaw: async () => 0,
      $transaction: async (fn: any) => typeof fn === 'function' ? fn(cachedPrisma) : Promise.resolve(),
      
      // All the models used in the application
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

    console.log('Database: Using fallback mock client');
    return cachedPrisma;
  }
}

// Helper function for database operations with error handling
export async function withDatabase<T>(
  operation: (db: any) => Promise<T>,
  fallback: T,
  operationName?: string
): Promise<T> {
  try {
    const db = await getDatabaseClient();
    if (!db) {
      console.warn(`Database: Client unavailable for ${operationName}, using fallback`);
      return fallback;
    }
    
    return await operation(db);
  } catch (error) {
    console.error(`Database operation ${operationName} failed:`, error);
    return fallback;
  }
}