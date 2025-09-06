// lib/prisma-mock.js - Mock Prisma client for build time
console.log('Using Prisma mock for build-time compilation');

// Mock PrismaClient that won't try to connect or download binaries
class MockPrismaClient {
  constructor() {
    console.log('MockPrismaClient initialized for build time');
  }
  
  async $connect() {
    return Promise.resolve();
  }
  
  async $disconnect() {
    return Promise.resolve();
  }
}

// Create mock models that return empty results
const createMockModel = () => ({
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
});

// Add common Prisma models that might be used in the app
MockPrismaClient.prototype.user = createMockModel();
MockPrismaClient.prototype.site = createMockModel();
MockPrismaClient.prototype.week = createMockModel();
MockPrismaClient.prototype.topic = createMockModel();
MockPrismaClient.prototype.account = createMockModel();
MockPrismaClient.prototype.session = createMockModel();
MockPrismaClient.prototype.userRole = createMockModel();
MockPrismaClient.prototype.review = createMockModel();
MockPrismaClient.prototype.userOnboarding = createMockModel();

// Export the mock as both named and default export
module.exports = {
  PrismaClient: MockPrismaClient,
  default: MockPrismaClient
};

// For ES6 compatibility
module.exports.PrismaClient = MockPrismaClient;