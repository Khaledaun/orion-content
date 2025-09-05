// lib/safe-prisma.ts - Build-safe Prisma client wrapper
// This module provides a safe way to use Prisma that never loads during build

// Always return null during build time to prevent any Prisma loading
export const prisma = null;

// Safe database operations that work during build and runtime
export async function safeDbOperation<T>(
  operation: string,
  fallback: T,
  ...args: any[]
): Promise<T> {
  // During build, always return fallback
  if (process.env.NODE_ENV !== 'production' && (
    process.env.SKIP_PRISMA_GENERATE === 'true' || 
    process.env.CI === 'true' || 
    process.env.VERCEL === '1' || 
    process.env.VERCEL_ENV ||
    process.env.GITHUB_ACTIONS
  )) {
    console.log(`SafeDb: Skipping ${operation} during build, using fallback`);
    return fallback;
  }

  // At runtime, dynamically load the database module
  try {
    const { withDatabase } = await import('./database');
    
    // Create operation function based on operation string
    const operationFn = (db: any) => {
      const [model, method] = operation.split('.');
      if (db[model] && db[model][method]) {
        return db[model][method](...args);
      }
      throw new Error(`Operation ${operation} not found`);
    };

    return await withDatabase(operationFn, fallback, operation);
  } catch (error) {
    console.warn(`SafeDb: Operation ${operation} failed, using fallback:`, error);
    return fallback;
  }
}

export default prisma;