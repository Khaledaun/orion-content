import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// Enhanced build-time safety check
const isBuildTime = process.env.NODE_ENV === 'production' && !process.env.DATABASE_URL;
const isVercelBuild = process.env.VERCEL === '1' && !process.env.DATABASE_URL;

// Don't initialize Prisma during build or when DATABASE_URL is missing
const canInitializePrisma = !isBuildTime && !isVercelBuild && !!process.env.DATABASE_URL;

export const prisma = canInitializePrisma
  ? (globalForPrisma.prisma ??
    new PrismaClient({
      log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
    }))
  : null;

if (process.env.NODE_ENV !== "production" && canInitializePrisma && prisma) {
  globalForPrisma.prisma = prisma;
}

export default prisma;
