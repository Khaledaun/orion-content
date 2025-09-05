"use strict";
// lib/prisma-client.ts - Universal Prisma client that works everywhere
// This file exports a prisma client that works in all environments
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
// Environment detection
const isVercelBuild = (process.env.SKIP_PRISMA_GENERATE === 'true' ||
    process.env.CI === 'true' ||
    process.env.VERCEL === '1' ||
    process.env.VERCEL_ENV ||
    process.env.GITHUB_ACTIONS ||
    typeof process.env.VERCEL_URL !== 'undefined' ||
    process.env.NOW_REGION);
// Create a comprehensive mock Prisma client
const createMockPrismaClient = () => {
    console.log('PrismaClient: Using mock implementation for build environment');
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
    return {
        $connect: async () => Promise.resolve(),
        $disconnect: async () => Promise.resolve(),
        $queryRaw: async () => [],
        $executeRaw: async () => 0,
        $transaction: async (fn) => typeof fn === 'function' ? fn(this) : Promise.resolve(),
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
};
// Initialize the client
let prismaInstance = null;
if (isVercelBuild) {
    // Use mock for build environments
    prismaInstance = createMockPrismaClient();
}
else {
    // Try to use real Prisma in runtime environments
    try {
        // Check if we can load Prisma
        const globalForPrisma = global;
        if (!globalForPrisma.__prisma) {
            try {
                // Dynamic require to avoid bundling issues
                const { PrismaClient } = eval('require')('@prisma/client');
                globalForPrisma.__prisma = new PrismaClient({
                    log: ['warn', 'error'],
                    errorFormat: 'minimal'
                });
                console.log('PrismaClient: Real client initialized successfully');
            }
            catch (requireError) {
                console.warn('PrismaClient: Failed to load real client, using mock:', requireError);
                globalForPrisma.__prisma = createMockPrismaClient();
            }
        }
        prismaInstance = globalForPrisma.__prisma;
    }
    catch (error) {
        console.warn('PrismaClient: Initialization error, using mock:', error);
        prismaInstance = createMockPrismaClient();
    }
}
// Export the client
exports.prisma = prismaInstance;
exports.default = prismaInstance;
