import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// Enhanced build-safe mock that prevents Next.js build analyzer hangs
const createBuildSafeMockPrisma = () => {
  const noop = () => Promise.resolve([]);
  const mockHandler = {
    get: (target: any, prop: string | symbol) => {
      // Handle specific Prisma client properties that might be checked during build
      if (prop === 'then' || prop === 'catch' || prop === 'finally') {
        return undefined; // Not a thenable
      }
      if (prop === Symbol.iterator || prop === Symbol.asyncIterator) {
        return undefined;
      }
      if (prop === 'constructor') {
        return Object;
      }
      if (prop === Symbol.toPrimitive || prop === 'valueOf' || prop === 'toString') {
        return () => '[BuildMockPrisma]';
      }
      
      // Return another proxy for chained calls
      return new Proxy(noop, mockHandler);
    }
  };
  
  return new Proxy(noop, mockHandler) as any as PrismaClient;
};

// Determine if we should use mock Prisma during build
const shouldUseBuildMock = () => {
  // Always use mock during build phase when DATABASE_URL is not set
  if (typeof window !== 'undefined') {
    return true; // Client-side should never access Prisma
  }
  
  // Use mock during build when no DATABASE_URL
  if (!process.env.DATABASE_URL) {
    return true;
  }
  
  return false;
};

// Export the appropriate Prisma client
export const prisma = shouldUseBuildMock()
  ? createBuildSafeMockPrisma()
  : (globalForPrisma.prisma ??
    new PrismaClient({
      log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
    }));

// Only set global in development with real Prisma
if (process.env.NODE_ENV !== "production" && !shouldUseBuildMock() && prisma) {
  globalForPrisma.prisma = prisma as PrismaClient;
}

export default prisma;
