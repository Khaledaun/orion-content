import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// Simple and robust build-time safety check
const shouldInitializePrisma = () => {
  // Don't initialize during Vercel builds
  if (process.env.VERCEL === '1' && !process.env.DATABASE_URL) {
    return false;
  }
  
  // Don't initialize if DATABASE_URL is missing
  if (!process.env.DATABASE_URL) {
    return false;
  }
  
  return true;
};

export const prisma = shouldInitializePrisma()
  ? (globalForPrisma.prisma ??
    new PrismaClient({
      log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
    }))
  : null;

if (process.env.NODE_ENV !== "production" && shouldInitializePrisma() && prisma) {
  globalForPrisma.prisma = prisma;
}

export default prisma;
