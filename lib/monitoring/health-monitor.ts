/**
 * Enterprise Health Monitor
 * Phase 1 Enhancement: Comprehensive system health monitoring and alerting
 */

import { logger } from "@/lib/logger";
import { envManager } from "@/lib/config/environment-manager";
import { dbManager } from "@/lib/database/connection-manager";

interface HealthCheck {
  name: string;
  check: () => Promise<HealthCheckResult>;
  interval: number;
  timeout: number;
  critical: boolean;
  enabled: boolean;
}

interface HealthCheckResult {
  status: "healthy" | "degraded" | "unhealthy";
  message: string;
  details?: any;
  responseTime: number;
  timestamp: Date;
}

interface SystemHealth {
  overall: "healthy" | "degraded" | "critical";
  checks: Record<string, HealthCheckResult>;
  uptime: number;
  version: string;
  environment: string;
  lastCheck: Date;
}

interface HealthAlert {
  id: string;
  checkName: string;
  status: "healthy" | "degraded" | "unhealthy";
  message: string;
  timestamp: Date;
  resolved?: Date;
  escalated: boolean;
}

export class HealthMonitor {
  private static instance: HealthMonitor;
  private checks: Map<string, HealthCheck> = new Map();
  private lastResults: Map<string, HealthCheckResult> = new Map();
  private alerts: Map<string, HealthAlert> = new Map();
  private monitoringInterval?: NodeJS.Timeout;
  private startTime: Date = new Date();

  private constructor() {
    this.setupBuiltinHealthChecks();
    this.startMonitoring();
  }

  public static getInstance(): HealthMonitor {
    if (!HealthMonitor.instance) {
      HealthMonitor.instance = new HealthMonitor();
    }
    return HealthMonitor.instance;
  }

  public addHealthCheck(
    name: string,
    check: () => Promise<HealthCheckResult>,
    options: {
      interval?: number;
      timeout?: number;
      critical?: boolean;
      enabled?: boolean;
    } = {},
  ): HealthMonitor {
    this.checks.set(name, {
      name,
      check,
      interval: options.interval || 30000, // 30 seconds default
      timeout: options.timeout || 5000, // 5 seconds default
      critical: options.critical || false,
      enabled: options.enabled ?? true,
    });

    logger.info("Health check registered", {
      name,
      interval: options.interval || 30000,
      critical: options.critical || false,
    });

    return this;
  }

  public removeHealthCheck(name: string): HealthMonitor {
    this.checks.delete(name);
    this.lastResults.delete(name);
    return this;
  }

  public async runHealthCheck(name: string): Promise<HealthCheckResult> {
    const healthCheck = this.checks.get(name);
    if (!healthCheck) {
      throw new Error(`Health check '${name}' not found`);
    }

    if (!healthCheck.enabled) {
      return {
        status: "healthy",
        message: "Health check disabled",
        responseTime: 0,
        timestamp: new Date(),
      };
    }

    const startTime = Date.now();

    try {
      // Run health check with timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(
          () => reject(new Error("Health check timeout")),
          healthCheck.timeout,
        );
      });

      const result = await Promise.race([healthCheck.check(), timeoutPromise]);

      const responseTime = Date.now() - startTime;
      const fullResult = {
        ...result,
        responseTime,
        timestamp: new Date(),
      };

      this.lastResults.set(name, fullResult);
      this.handleHealthCheckResult(name, fullResult, healthCheck);

      return fullResult;
    } catch (error) {
      const responseTime = Date.now() - startTime;
      const errorResult: HealthCheckResult = {
        status: "unhealthy",
        message: error instanceof Error ? error.message : String(error),
        responseTime,
        timestamp: new Date(),
      };

      this.lastResults.set(name, errorResult);
      this.handleHealthCheckResult(name, errorResult, healthCheck);

      return errorResult;
    }
  }

  public async runAllHealthChecks(): Promise<SystemHealth> {
    const checkPromises = Array.from(this.checks.keys()).map((name) =>
      this.runHealthCheck(name).then((result) => [name, result] as const),
    );

    const results = await Promise.allSettled(checkPromises);
    const checks: Record<string, HealthCheckResult> = {};

    for (const result of results) {
      if (result.status === "fulfilled") {
        const [name, checkResult] = result.value;
        checks[name] = checkResult;
      }
    }

    // Calculate overall health
    const overall = this.calculateOverallHealth(checks);

    const systemHealth: SystemHealth = {
      overall,
      checks,
      uptime: Date.now() - this.startTime.getTime(),
      version: process.env.npm_package_version || "1.0.0",
      environment: envManager.getConfig().environment,
      lastCheck: new Date(),
    };

    logger.info("System health check completed", {
      overall,
      checksRun: Object.keys(checks).length,
      healthyChecks: Object.values(checks).filter((c) => c.status === "healthy")
        .length,
    });

    return systemHealth;
  }

  public getSystemHealth(): SystemHealth {
    const checks: Record<string, HealthCheckResult> = {};

    for (const [name, result] of this.lastResults) {
      checks[name] = result;
    }

    return {
      overall: this.calculateOverallHealth(checks),
      checks,
      uptime: Date.now() - this.startTime.getTime(),
      version: process.env.npm_package_version || "1.0.0",
      environment: envManager.getConfig().environment,
      lastCheck: new Date(),
    };
  }

  public getHealthAlerts(): HealthAlert[] {
    return Array.from(this.alerts.values()).sort(
      (a, b) => b.timestamp.getTime() - a.timestamp.getTime(),
    );
  }

  public clearAlert(alertId: string): void {
    const alert = this.alerts.get(alertId);
    if (alert) {
      alert.resolved = new Date();
      logger.info("Health alert resolved", {
        alertId,
        checkName: alert.checkName,
      });
    }
  }

  public enableCheck(name: string): void {
    const check = this.checks.get(name);
    if (check) {
      check.enabled = true;
      logger.info("Health check enabled", { name });
    }
  }

  public disableCheck(name: string): void {
    const check = this.checks.get(name);
    if (check) {
      check.enabled = false;
      logger.info("Health check disabled", { name });
    }
  }

  private calculateOverallHealth(
    checks: Record<string, HealthCheckResult>,
  ): "healthy" | "degraded" | "critical" {
    const results = Object.values(checks);

    if (results.length === 0) return "healthy";

    const unhealthyCount = results.filter(
      (r) => r.status === "unhealthy",
    ).length;
    const degradedCount = results.filter((r) => r.status === "degraded").length;

    // Check if any critical checks are unhealthy
    const criticalChecks = Array.from(this.checks.values()).filter(
      (c) => c.critical,
    );
    const criticalUnhealthy = criticalChecks.some((check) => {
      const result = this.lastResults.get(check.name);
      return result && result.status === "unhealthy";
    });

    if (criticalUnhealthy || unhealthyCount > 0) {
      return "critical";
    }

    if (degradedCount > 0) {
      return "degraded";
    }

    return "healthy";
  }

  private handleHealthCheckResult(
    name: string,
    result: HealthCheckResult,
    healthCheck: HealthCheck,
  ): void {
    // Check for status changes
    const previousResult = this.lastResults.get(name);
    const statusChanged =
      !previousResult || previousResult.status !== result.status;

    if (statusChanged) {
      logger.info("Health check status changed", {
        check: name,
        previousStatus: previousResult?.status || "unknown",
        newStatus: result.status,
        critical: healthCheck.critical,
      });

      // Create alert for unhealthy or degraded status
      if (result.status !== "healthy") {
        this.createAlert(name, result, healthCheck);
      } else {
        // Resolve existing alert if status is now healthy
        this.resolveAlert(name);
      }
    }

    // Log slow health checks
    if (result.responseTime > healthCheck.timeout * 0.8) {
      logger.warn("Slow health check detected", {
        check: name,
        responseTime: result.responseTime,
        threshold: healthCheck.timeout,
      });
    }
  }

  private createAlert(
    checkName: string,
    result: HealthCheckResult,
    healthCheck: HealthCheck,
  ): void {
    const alertId = `${checkName}-${Date.now()}`;

    const alert: HealthAlert = {
      id: alertId,
      checkName,
      status: result.status,
      message: result.message,
      timestamp: new Date(),
      escalated: healthCheck.critical,
    };

    this.alerts.set(alertId, alert);

    logger.error("Health check alert created", {
      alertId,
      checkName,
      status: result.status,
      message: result.message,
      critical: healthCheck.critical,
    });
  }

  private resolveAlert(checkName: string): void {
    // Find and resolve active alerts for this check
    for (const [alertId, alert] of this.alerts) {
      if (alert.checkName === checkName && !alert.resolved) {
        alert.resolved = new Date();
        logger.info("Health check alert resolved", {
          alertId,
          checkName,
          duration: alert.resolved.getTime() - alert.timestamp.getTime(),
        });
      }
    }
  }

  private startMonitoring(): void {
    const interval = envManager.get("monitoring.healthCheckInterval", 30000);

    this.monitoringInterval = setInterval(async () => {
      try {
        await this.runAllHealthChecks();
      } catch (error) {
        logger.error("Health monitoring cycle failed", {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }, interval);

    logger.info("Health monitoring started", { interval });
  }

  private setupBuiltinHealthChecks(): void {
    // Database health check
    this.addHealthCheck(
      "database",
      async () => {
        try {
          const startTime = Date.now();
          const isHealthy = await dbManager.performHealthCheck();
          const responseTime = Date.now() - startTime;

          if (isHealthy) {
            return {
              status: "healthy",
              message: "Database connection healthy",
              responseTime,
              timestamp: new Date(),
            };
          } else {
            return {
              status: "degraded",
              message: "Database connection issues detected",
              responseTime,
              timestamp: new Date(),
            };
          }
        } catch (error) {
          return {
            status: "unhealthy",
            message: `Database check failed: ${error instanceof Error ? error.message : String(error)}`,
            responseTime: 0,
            timestamp: new Date(),
          };
        }
      },
      { critical: true, interval: 15000 },
    );

    // Memory health check
    this.addHealthCheck(
      "memory",
      async () => {
        const memUsage = process.memoryUsage();
        const heapUsedMB = memUsage.heapUsed / 1024 / 1024;
        const heapTotalMB = memUsage.heapTotal / 1024 / 1024;
        const usagePercent = (heapUsedMB / heapTotalMB) * 100;

        let status: "healthy" | "degraded" | "unhealthy" = "healthy";
        let message = `Memory usage: ${heapUsedMB.toFixed(2)}MB (${usagePercent.toFixed(1)}%)`;

        if (usagePercent > 90) {
          status = "unhealthy";
          message += " - Critical memory usage";
        } else if (usagePercent > 80) {
          status = "degraded";
          message += " - High memory usage";
        }

        return {
          status,
          message,
          details: memUsage,
          responseTime: 1,
          timestamp: new Date(),
        };
      },
      { interval: 60000 },
    );

    // Application health check
    this.addHealthCheck(
      "application",
      async () => {
        // Basic application health check
        return {
          status: "healthy",
          message: "Application is running",
          details: {
            uptime: Date.now() - this.startTime.getTime(),
            pid: process.pid,
            nodeVersion: process.version,
          },
          responseTime: 1,
          timestamp: new Date(),
        };
      },
      { interval: 60000 },
    );
  }

  public stop(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
      logger.info("Health monitoring stopped");
    }
  }
}

// Export singleton instance
export const healthMonitor = HealthMonitor.getInstance();
