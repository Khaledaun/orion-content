// lib/with-db.ts - Database error handling utility for graceful degradation

/**
 * Wraps database operations with error handling and fallback values.
 * Returns the fallback value if the database operation fails.
 * 
 * @param operation - The database operation to execute
 * @param fallback - The fallback value to return if operation fails
 * @param label - Optional label for logging/debugging
 * @returns The result of the operation or the fallback value
 */
export async function withDB<T>(
  operation: () => Promise<T>,
  fallback: T,
  label?: string
): Promise<T> {
  try {
    const result = await operation();
    return result;
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.warn(`[DB:${label || 'query'}] Database operation failed, using fallback:`, errorMessage);
    return fallback;
  }
}