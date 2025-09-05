
/**
 * Enhanced environment guards for reliable Vercel builds
 */

/**
 * Check if we're in a build environment where database access should be skipped
 */
export function isBuildTime(): boolean {
  // Check for explicit skip flag first
  if (process.env.SKIP_PRISMA_GENERATE === 'true') {
    return true;
  }
  
  // Enhanced Vercel detection
  if (
    process.env.CI === 'true' || 
    process.env.VERCEL === '1' || 
    process.env.VERCEL_ENV ||
    process.env.VERCEL_URL ||
    process.env.NOW_REGION || // Legacy Vercel
    process.env.GITHUB_ACTIONS
  ) {
    return true;
  }
  
  // Check for common build/CI environment patterns
  if (process.env.NODE_ENV === 'production' && (
    !process.env.DATABASE_URL || 
    process.env.BUILD_ENV === 'ci'
  )) {
    return true;
  }
  
  return false;
}

/**
 * Check if database operations are safe to perform
 */
export function isDatabaseAvailable(): boolean {
  return !isBuildTime() && !!process.env.DATABASE_URL;
}

/**
 * Safe database operation wrapper
 */
export async function safeDbOperation<T>(
  operation: () => Promise<T>,
  fallback: T
): Promise<T> {
  if (!isDatabaseAvailable()) {
    console.warn('Database not available, returning fallback value');
    return fallback;
  }

  try {
    return await operation();
  } catch (error) {
    console.error('Database operation failed:', error);
    return fallback;
  }
}

/**
 * Environment-aware configuration
 */
export const config = {
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
  isBuild: isBuildTime(),
  hasDatabase: isDatabaseAvailable(),
  
  // Safe defaults for missing environment variables
  databaseUrl: process.env.DATABASE_URL || 'postgresql://localhost:5432/orion_dev',
  nextAuthSecret: process.env.NEXTAUTH_SECRET || 'dev-secret-change-in-production',
  nextAuthUrl: process.env.NEXTAUTH_URL || 'http://localhost:3000',
};
