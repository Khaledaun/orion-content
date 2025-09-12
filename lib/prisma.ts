import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// Build-time safety check - don't initialize Prisma during build if no DATABASE_URL
const canInitializePrisma = !!process.env.DATABASE_URL || process.env.NODE_ENV !== 'production';

export const prisma = canInitializePrisma
  ? (globalForPrisma.prisma ??
    new PrismaClient({
      log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
    }))
  : null;

if (process.env.NODE_ENV !== "production" && prisma) {
  globalForPrisma.prisma = prisma;
}

export default prisma;
