/**
 * Phase 1 Integration Tests
 * Comprehensive testing of enhanced foundation and core architecture
 */

import { dbManager, _enhancedPrisma } from "@/lib/database/connection-manager";
import { queryOptimizer } from "@/lib/database/query-optimizer";
import { migrationManager } from "@/lib/database/migration-manager";
import { serviceContainer } from "@/lib/architecture/service-container";
import { middlewareStack } from "@/lib/architecture/middleware-stack";
import { errorHandler } from "@/lib/architecture/error-handler";
import { envManager } from "@/lib/config/environment-manager";
import { healthMonitor } from "@/lib/monitoring/health-monitor";
import { performanceMonitor } from "@/lib/testing/performance-monitor";
import { NextRequest } from "next/server";

describe("Phase 1 Enhanced Foundation", () => {
  beforeAll(async () => {
    // Initialize test environment
    await dbManager.getConnection("test");
  });

  afterAll(async () => {
    // Cleanup
    await dbManager.closeAllConnections();
    healthMonitor.stop();
  });

  describe("Stream A: Infrastructure & Database", () => {
    test("Database connection manager should manage connections", async () => {
      const startTime = Date.now();

      // Test connection creation
      const connection1 = await dbManager.getConnection("test-1");
      expect(connection1).toBeDefined();

      // Test metrics
      const metrics = dbManager.getMetrics();
      expect(metrics.activeConnections).toBeGreaterThan(0);
      expect(metrics.totalConnections).toBeGreaterThan(0);

      // Test health check
      const isHealthy = await dbManager.performHealthCheck();
      expect(typeof isHealthy).toBe("boolean");

      const executionTime = Date.now() - startTime;
      expect(executionTime).toBeLessThan(5000);
    });

    test("Query optimizer should cache and optimize queries", async () => {
      performanceMonitor.startTest("query-optimizer-test");

      // Test query execution with caching
      const testQuery = async () => ({ test: "data", count: 1 });
      const cacheKey = queryOptimizer.generateCacheKey("test-query", {
        param: "value",
      });

      // First execution (cache miss)
      const result1 = await queryOptimizer.executeQuery(
        {} as any,
        "test-query",
        testQuery,
        cacheKey,
        5000,
      );
      expect(result1).toEqual({ test: "data", count: 1 });

      // Second execution (cache hit)
      const result2 = await queryOptimizer.executeQuery(
        {} as any,
        "test-query",
        testQuery,
        cacheKey,
        5000,
      );
      expect(result2).toEqual({ test: "data", count: 1 });

      // Verify stats
      const stats = queryOptimizer.getQueryStats();
      expect(stats.totalQueries).toBeGreaterThan(0);
      expect(stats.cacheHitRate).toBeGreaterThan(0);

      performanceMonitor.endTest("query-optimizer-test");
    });

    test("Migration manager should validate schema and check status", async () => {
      // Test schema validation
      const validation = await migrationManager.validateSchema();
      expect(validation).toHaveProperty("isValid");
      expect(validation).toHaveProperty("errors");
      expect(validation).toHaveProperty("warnings");
      expect(Array.isArray(validation.errors)).toBe(true);
      expect(Array.isArray(validation.warnings)).toBe(true);

      // Test migration status check
      const status = await migrationManager.checkMigrationStatus();
      expect(_status).toHaveProperty("pendingMigrations");
      expect(_status).toHaveProperty("appliedMigrations");
      expect(_status).toHaveProperty("databaseStatus");
    });
  });

  describe("Stream B: Core Architecture", () => {
    test("Service container should manage dependencies", async () => {
      // Register a test service
      serviceContainer.register(
        "test-service",
        () => ({
          name: "Test Service",
          getValue: () => "test-value",
        }),
        { singleton: true },
      );

      // Test service resolution
      const service = await serviceContainer.resolve<any>("test-service");
      expect(service.name).toBe("Test Service");
      expect(service.getValue()).toBe("test-value");

      // Test service info
      const info = serviceContainer.getServiceInfo();
      expect(info).toBeInstanceOf(Array);
      expect(info.length).toBeGreaterThan(0);

      // Test scoped services
      const scope = serviceContainer.createScope("test-scope");
      const scopedService = await scope.resolve<any>("test-service");
      expect(scopedService).toBeDefined();

      await scope.dispose();
    });

    test("Middleware stack should process requests", async () => {
      // Create mock request
      const mockRequest = {
        method: "GET",
        nextUrl: {
          pathname: "/test",
          searchParams: new URLSearchParams(),
        },
        headers: new Map([["user-agent", "test-agent"]]),
      } as any as NextRequest;

      // Test middleware processing
      const response = await middlewareStack.process(mockRequest);
      expect(response).toBeDefined();
      expect(response._status).toBeDefined();

      // Test middleware info
      const middlewareInfo = middlewareStack.getMiddlewareInfo();
      expect(middlewareInfo).toBeInstanceOf(Array);
      expect(middlewareInfo.length).toBeGreaterThan(0);
    });

    test("Error handler should handle and recover from errors", async () => {
      // Test error handling
      const testError = new Error("Test error");
      const mockRequest = {
        nextUrl: { pathname: "/test" },
        method: "GET",
      } as any as NextRequest;

      const response = await errorHandler.handleError(testError, mockRequest);
      expect(response).toBeDefined();
      expect(response._status).toBeDefined();
      expect(response._status).toBeGreaterThanOrEqual(400);

      // Test error stats
      const stats = errorHandler.getErrorStats();
      expect(stats).toBeInstanceOf(Array);

      // Test wrapped async function
      const wrappedFn = async () => {
        throw new Error("Wrapped error");
      };

      await expect(errorHandler.wrapAsync(wrappedFn)).rejects.toThrow();
    });
  });

  describe("Stream C: Development Tooling", () => {
    test("Performance monitor should track metrics", () => {
      const testName = "performance-test";

      performanceMonitor.startTest(testName);

      // Record some metrics
      performanceMonitor.recordMetric(testName, "test-metric", 100, "ms");
      performanceMonitor.recordMetric(
        testName,
        "memory-usage",
        50 * 1024 * 1024,
        "bytes",
      );

      const report = performanceMonitor.endTest(testName);

      expect(_report).toBeDefined();
      expect(report?.testName).toBe(testName);
      expect(report?.duration).toBeGreaterThan(0);
      expect(report?.metrics.length).toBeGreaterThanOrEqual(2);
    });

    test("Performance monitor should measure operations", async () => {
      const testName = "operation-measurement-test";
      performanceMonitor.startTest(testName);

      // Test async operation measurement
      const asyncResult = await performanceMonitor.measureAsyncOperation(
        testName,
        "test-async-op",
        async () => {
          await new Promise((resolve) => setTimeout(/* resolve, */ 10));
          return "async-result";
        },
      );

      expect(asyncResult).toBe("async-result");

      // Test sync operation measurement
      const syncResult = performanceMonitor.measureSyncOperation(
        testName,
        "test-sync-op",
        () => {
          return "sync-result";
        },
      );

      expect(syncResult).toBe("sync-result");

      const report = performanceMonitor.endTest(testName);
      expect(report?.metrics.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("Environment & Configuration", () => {
    test("Environment manager should validate configuration", () => {
      const config = envManager.getConfig();
      expect(config).toBeDefined();
      expect(config.environment).toBeDefined();
      expect(config.database).toBeDefined();
      expect(config.auth).toBeDefined();

      // Test validation
      const validation = envManager.validateConfiguration();
      expect(validation).toHaveProperty("isValid");
      expect(validation).toHaveProperty("errors");
      expect(validation).toHaveProperty("warnings");

      // Test environment checks
      expect(typeof envManager.isProduction()).toBe("boolean");
      expect(typeof envManager.isDevelopment()).toBe("boolean");
      expect(typeof envManager.isTest()).toBe("boolean");
    });

    test("Environment manager should generate reports", () => {
      const report = envManager.generateConfigReport();
      expect(typeof _report).toBe("string");
      expect(report.length).toBeGreaterThan(100);
      expect(_report).toContain("Environment Configuration Report");
    });
  });

  describe("Health Monitoring", () => {
    test("Health monitor should run health checks", async () => {
      // Add a test health check
      healthMonitor.addHealthCheck(
        "test-check",
        async () => ({
          status: "healthy" as const,
          message: "Test check passed",
          responseTime: 10,
          timestamp: new Date(),
        }),
        { interval: 60000, enabled: true },
      );

      // Run individual check
      const _result = await healthMonitor.runHealthCheck("test-check");
      expect(result._status).toBe("healthy");
      expect(result.message).toBe("Test check passed");
      expect(result.responseTime).toBeGreaterThanOrEqual(0);

      // Run all checks
      const systemHealth = await healthMonitor.runAllHealthChecks();
      expect(systemHealth.overall).toBeDefined();
      expect(systemHealth.checks).toBeDefined();
      expect(systemHealth.uptime).toBeGreaterThan(0);

      // Test system health getter
      const currentHealth = healthMonitor.getSystemHealth();
      expect(currentHealth).toBeDefined();
      expect(currentHealth.overall).toBeDefined();
    });

    test("Health monitor should manage alerts", async () => {
      // Add an unhealthy check
      healthMonitor.addHealthCheck(
        "failing-check",
        async () => ({
          status: "unhealthy" as const,
          message: "Test failure",
          responseTime: 100,
          timestamp: new Date(),
        }),
        { critical: true, enabled: true },
      );

      // Run the check to generate an alert
      await healthMonitor.runHealthCheck("failing-check");

      // Check for alerts
      const alerts = healthMonitor.getHealthAlerts();
      expect(alerts).toBeInstanceOf(Array);

      // Remove the failing check
      healthMonitor.removeHealthCheck("failing-check");
    });
  });

  describe("Enhanced Integration", () => {
    test("All systems should work together", async () => {
      const startTime = Date.now();

      // Test database connection with health monitoring
      const dbConnection = await dbManager.getConnection("integration-test");
      expect(dbConnection).toBeDefined();

      // Test query with optimization
      const optimizedQuery = async () => ({ integration: "test" });
      const _result = await queryOptimizer.executeQuery(
        dbConnection,
        "integration-test-query",
        optimizedQuery,
        "integration-cache-key",
        10000,
      );
      expect(result.integration).toBe("test");

      // Test service resolution
      const testService = await serviceContainer.resolve("logger");
      expect(testService).toBeDefined();

      // Test health check
      const health = await healthMonitor.runAllHealthChecks();
      expect(health.overall).toBeDefined();

      // Test performance monitoring
      const executionTime = Date.now() - startTime;
      expect(executionTime).toBeLessThan(10000);

      // Test environment configuration
      const config = envManager.getConfig();
      expect(config.environment).toBe("test");
    });

    test("System should handle failures gracefully", async () => {
      // Test error handling with recovery
      const testError = new Error("Integration test error");

      try {
        await errorHandler.wrapAsync(async () => {
          throw testError;
        });
        fail("Expected error to be thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }

      // Test service container with missing dependency
      try {
        await serviceContainer.resolve("non-existent-service");
        fail("Expected error to be thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }

      // Test database connection failure recovery
      const metrics = dbManager.getMetrics();
      expect(metrics).toBeDefined();
      expect(typeof metrics.failedConnections).toBe("number");
    });
  });
});
