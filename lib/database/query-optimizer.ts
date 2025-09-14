/**
 * Enterprise Query Optimizer
 * Phase 1 Enhancement: Query analysis, caching, and performance optimization
 */

import { PrismaClient } from "@prisma/client";
import { logger } from "@/lib/logger";
import { LRUCache } from "lru-cache";

interface QueryMetrics {
  query: string;
  executionTime: number;
  resultCount: number;
  cacheHit: boolean;
  timestamp: Date;
}

interface QueryCacheEntry {
  result: any;
  timestamp: Date;
  ttl: number;
}

interface OptimizationRule {
  pattern: RegExp;
  optimization: (
    query: string,
    params: any[],
  ) => { query: string; params: any[] };
  description: string;
}

export class QueryOptimizer {
  private static instance: QueryOptimizer;
  private queryCache: LRUCache<string, QueryCacheEntry>;
  private queryMetrics: QueryMetrics[] = [];
  private optimizationRules: OptimizationRule[] = [];
  private slowQueryThreshold: number = 1000; // 1 second

  private constructor() {
    this.queryCache = new LRUCache({
      max: 1000,
      ttl: 5 * 60 * 1000, // 5 minutes default TTL
      updateAgeOnGet: true,
      allowStale: true,
    });

    this.setupOptimizationRules();
    this.setupMetricsCollection();
  }

  public static getInstance(): QueryOptimizer {
    if (!QueryOptimizer.instance) {
      QueryOptimizer.instance = new QueryOptimizer();
    }
    return QueryOptimizer.instance;
  }

  public async executeQuery<T>(
    prisma: PrismaClient,
    operation: string,
    query: () => Promise<T>,
    cacheKey?: string,
    cacheTTL?: number,
  ): Promise<T> {
    const startTime = Date.now();
    const queryString = operation;

    // Check cache first if cache key provided
    if (cacheKey) {
      const cached = this.getCachedResult<T>(cacheKey);
      if (cached) {
        this.recordMetrics(queryString, Date.now() - startTime, 0, true);
        return cached;
      }
    }

    try {
      // Execute query
      const result = await query();
      const executionTime = Date.now() - startTime;

      // Cache result if cache key provided
      if (cacheKey && cacheTTL) {
        this.setCachedResult(cacheKey, result, cacheTTL);
      }

      // Record metrics
      const resultCount = Array.isArray(result)
        ? result.length
        : result
          ? 1
          : 0;
      this.recordMetrics(queryString, executionTime, resultCount, false);

      // Log slow queries
      if (executionTime > this.slowQueryThreshold) {
        logger.warn("Slow query detected", {
          query: queryString,
          executionTime,
          resultCount,
        });
      }

      return result;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.recordMetrics(queryString, executionTime, 0, false);

      logger.error("Query execution failed", {
        query: queryString,
        executionTime,
        error: error instanceof Error ? error.message : String(error),
      });

      throw error;
    }
  }

  public async executeBatchQueries<T>(
    prisma: PrismaClient,
    queries: Array<{
      operation: string;
      query: () => Promise<any>;
      cacheKey?: string;
      cacheTTL?: number;
    }>,
  ): Promise<T[]> {
    const startTime = Date.now();

    try {
      // Check for cached results first
      const results: (T | null)[] = new Array(queries.length).fill(null);
      const uncachedIndices: number[] = [];

      queries.forEach((queryInfo, index) => {
        if (queryInfo.cacheKey) {
          const cached = this.getCachedResult<T>(queryInfo.cacheKey);
          if (cached) {
            results[index] = cached;
          } else {
            uncachedIndices.push(index);
          }
        } else {
          uncachedIndices.push(index);
        }
      });

      // Execute uncached queries in batch
      if (uncachedIndices.length > 0) {
        const batchQueries = uncachedIndices.map((index) =>
          queries[index].query(),
        );
        const batchResults = await Promise.all(batchQueries);

        // Process batch results
        uncachedIndices.forEach((queryIndex, resultIndex) => {
          const result = batchResults[resultIndex];
          const queryInfo = queries[queryIndex];

          results[queryIndex] = result;

          // Cache if cache key provided
          if (queryInfo.cacheKey && queryInfo.cacheTTL) {
            this.setCachedResult(
              queryInfo.cacheKey,
              result,
              queryInfo.cacheTTL,
            );
          }
        });
      }

      const executionTime = Date.now() - startTime;
      logger.info("Batch query execution completed", {
        totalQueries: queries.length,
        cachedHits: queries.length - uncachedIndices.length,
        executionTime,
      });

      return results as T[];
    } catch (error) {
      logger.error("Batch query execution failed", {
        queryCount: queries.length,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  public generateCacheKey(operation: string, params: any = {}): string {
    const paramsString = JSON.stringify(params, Object.keys(params).sort());
    return `${operation}:${Buffer.from(paramsString).toString("base64")}`;
  }

  public invalidateCache(pattern?: string): void {
    if (pattern) {
      const regex = new RegExp(pattern);
      for (const [key] of this.queryCache.entries()) {
        if (regex.test(key)) {
          this.queryCache.delete(key);
        }
      }
    } else {
      this.queryCache.clear();
    }
  }

  public getQueryStats(): {
    totalQueries: number;
    averageExecutionTime: number;
    cacheHitRate: number;
    slowQueryCount: number;
    topSlowQueries: QueryMetrics[];
  } {
    const totalQueries = this.queryMetrics.length;
    const totalExecutionTime = this.queryMetrics.reduce(
      (sum, m) => sum + m.executionTime,
      0,
    );
    const cacheHits = this.queryMetrics.filter((m) => m.cacheHit).length;
    const slowQueries = this.queryMetrics.filter(
      (m) => m.executionTime > this.slowQueryThreshold,
    );

    const topSlowQueries = this.queryMetrics
      .filter((m) => m.executionTime > this.slowQueryThreshold)
      .sort((a, b) => b.executionTime - a.executionTime)
      .slice(0, 10);

    return {
      totalQueries,
      averageExecutionTime:
        totalQueries > 0 ? totalExecutionTime / totalQueries : 0,
      cacheHitRate: totalQueries > 0 ? (cacheHits / totalQueries) * 100 : 0,
      slowQueryCount: slowQueries.length,
      topSlowQueries,
    };
  }

  private getCachedResult<T>(key: string): T | null {
    const entry = this.queryCache.get(key);
    if (entry && Date.now() - entry.timestamp.getTime() < entry.ttl) {
      return entry.result as T;
    }
    return null;
  }

  private setCachedResult(key: string, result: any, ttl: number): void {
    this.queryCache.set(key, {
      result,
      timestamp: new Date(),
      ttl,
    });
  }

  private recordMetrics(
    query: string,
    executionTime: number,
    resultCount: number,
    cacheHit: boolean,
  ): void {
    const metric: QueryMetrics = {
      query,
      executionTime,
      resultCount,
      cacheHit,
      timestamp: new Date(),
    };

    this.queryMetrics.push(metric);

    // Keep only last 10000 metrics to prevent memory leak
    if (this.queryMetrics.length > 10000) {
      this.queryMetrics = this.queryMetrics.slice(-5000);
    }
  }

  private setupOptimizationRules(): void {
    // Add query optimization rules
    this.optimizationRules.push({
      pattern: /SELECT \* FROM/i,
      optimization: (query, params) => ({
        query: query.replace(/SELECT \*/i, "SELECT id"), // Example optimization
        params,
      }),
      description: "Avoid SELECT * queries",
    });

    // Add more optimization rules as needed
  }

  private setupMetricsCollection(): void {
    // Set up periodic metrics cleanup
    setInterval(
      () => {
        const now = Date.now();
        this.queryMetrics = this.queryMetrics.filter(
          (m) => now - m.timestamp.getTime() < 24 * 60 * 60 * 1000, // Keep 24 hours
        );
      },
      60 * 60 * 1000,
    ); // Run every hour
  }
}

// Export singleton instance
export const queryOptimizer = QueryOptimizer.getInstance();
