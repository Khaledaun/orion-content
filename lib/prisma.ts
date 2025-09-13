import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// Build-time mock to prevent Next.js build hangs
const createMockPrisma = () => {
  const mockHandler = {
    get: () => () => Promise.resolve([]),
  };
  
  return new Proxy({}, {
    get: (target, prop) => {
      if (prop === 'then' || prop === 'catch' || prop === 'finally') {
        return undefined; // Not a thenable
      }
      return new Proxy({}, mockHandler);
    }
  }) as any as PrismaClient;
};

// Check if we should use real or mock Prisma
const shouldUseMockPrisma = () => {
  // Use mock during build when DATABASE_URL is not available
  if (!process.env.DATABASE_URL) {
    return true;
  }
  
  // Use mock during Vercel builds unless DATABASE_URL is explicitly set
  if (process.env.VERCEL === '1' && !process.env.DATABASE_URL) {
    return true;
  }
  
  return false;
};

export const prisma = shouldUseMockPrisma()
  ? createMockPrisma()
  : (globalForPrisma.prisma ??
    new PrismaClient({
      log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
    }));

if (process.env.NODE_ENV !== "production" && !shouldUseMockPrisma() && prisma) {
  globalForPrisma.prisma = prisma as PrismaClient;
}

export default prisma;
