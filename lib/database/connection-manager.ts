/**
 * Enterprise Database Connection Manager
 * Phase 1 Enhancement: Advanced connection pooling, monitoring, and optimization
 */

import { PrismaClient } from "@prisma/client";
import { logger } from "@/lib/logger";
import { EventEmitter } from "events";

interface ConnectionConfig {
  maxConnections: number;
  connectionTimeout: number;
  idleTimeout: number;
  healthCheckInterval: number;
  retryAttempts: number;
  retryDelay: number;
}

interface ConnectionMetrics {
  activeConnections: number;
  totalConnections: number;
  failedConnections: number;
  avgResponseTime: number;
  lastHealthCheck: Date;
  status: "healthy" | "degraded" | "critical";
}

export class DatabaseConnectionManager extends EventEmitter {
  private static instance: DatabaseConnectionManager;
  private prismaInstances: Map<string, PrismaClient> = new Map();
  private config: ConnectionConfig;
  private metrics: ConnectionMetrics;
  private healthCheckTimer?: NodeJS.Timeout;
  private connectionStats: Map<string, { count: number; lastUsed: Date }> =
    new Map();

  private constructor(config?: Partial<ConnectionConfig>) {
    super();
    this.config = {
      maxConnections: config?.maxConnections || 20,
      connectionTimeout: config?.connectionTimeout || 10000,
      idleTimeout: config?.idleTimeout || 300000, // 5 minutes
      healthCheckInterval: config?.healthCheckInterval || 30000, // 30 seconds
      retryAttempts: config?.retryAttempts || 3,
      retryDelay: config?.retryDelay || 1000,
    };

    this.metrics = {
      activeConnections: 0,
      totalConnections: 0,
      failedConnections: 0,
      avgResponseTime: 0,
      lastHealthCheck: new Date(),
      status: "healthy",
    };

    this.startHealthMonitoring();
    this.setupGracefulShutdown();
  }

  public static getInstance(
    config?: Partial<ConnectionConfig>,
  ): DatabaseConnectionManager {
    if (!DatabaseConnectionManager.instance) {
      DatabaseConnectionManager.instance = new DatabaseConnectionManager(
        config,
      );
    }
    return DatabaseConnectionManager.instance;
  }

  public async getConnection(
    connectionId: string = "default",
  ): Promise<PrismaClient> {
    const startTime = Date.now();

    try {
      if (this.prismaInstances.has(_connectionId)) {
        const connection = this.prismaInstances.get(_connectionId)!;
        this.updateConnectionStats(connectionId, _startTime);
        return connection;
      }

      if (this.metrics.activeConnections >= this.config.maxConnections) {
        throw new Error(
          `Maximum connections (${this.config.maxConnections}) exceeded`,
        );
      }

      const prisma = new PrismaClient({
        log:
          process.env.NODE_ENV === "development"
            ? ["error", "warn"]
            : ["error"],
        errorFormat: "minimal",
        datasourceUrl: this.getDatabaseUrl(_connectionId),
      });

      // Test connection
      await this.testConnection(prisma);

      this.prismaInstances.set(connectionId, prisma);
      this.metrics.activeConnections++;
      this.metrics.totalConnections++;
      this.updateConnectionStats(connectionId, _startTime);

      logger.info("Database connection established", {
        connectionId,
        activeConnections: this.metrics.activeConnections,
        responseTime: Date.now() - startTime,
      });

      return prisma;
    } catch (error) {
      this.metrics.failedConnections++;
      this.emit("connection-failed", { connectionId, error });
      logger.error("Database connection failed", {
        connectionId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  public async closeConnection(connectionId: string): Promise<void> {
    const connection = this.prismaInstances.get(_connectionId);
    if (connection) {
      await connection.$disconnect();
      this.prismaInstances.delete(_connectionId);
      this.connectionStats.delete(_connectionId);
      this.metrics.activeConnections--;

      logger.info("Database connection closed", {
        connectionId,
        activeConnections: this.metrics.activeConnections,
      });
    }
  }

  public async closeAllConnections(): Promise<void> {
    const closePromises = Array.from(this.prismaInstances.keys()).map((id) =>
      this.closeConnection(id),
    );

    await Promise.all(closePromises);
    logger.info("All database connections closed");
  }

  public getMetrics(): ConnectionMetrics {
    return { ...this.metrics };
  }

  public async performHealthCheck(): Promise<boolean> {
    const startTime = Date.now();
    let healthyConnections = 0;

    try {
      const checkPromises = Array.from(this.prismaInstances.entries()).map(
        async ([connectionId, prisma]) => {
          try {
            await prisma.$queryRaw`SELECT 1`;
            healthyConnections++;
            return true;
          } catch (error) {
            logger.warn("Health check failed for connection", {
              connectionId,
              error: error instanceof Error ? error.message : String(error),
            });
            return false;
          }
        },
      );

      await Promise.all(checkPromises);

      const responseTime = Date.now() - startTime;
      this.metrics.avgResponseTime =
        (this.metrics.avgResponseTime + responseTime) / 2;
      this.metrics.lastHealthCheck = new Date();

      // Update status based on healthy connections
      const totalConnections = this.prismaInstances.size;
      if (totalConnections === 0 || healthyConnections === totalConnections) {
        this.metrics.status = "healthy";
      } else if (healthyConnections > totalConnections * 0.5) {
        this.metrics.status = "degraded";
      } else {
        this.metrics.status = "critical";
      }

      this.emit("health-check-complete", {
        status: this.metrics.status,
        healthyConnections,
        totalConnections,
        responseTime,
      });

      return this.metrics.status === "healthy";
    } catch (error) {
      this.metrics.status = "critical";
      logger.error("Health check failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  private async testConnection(prisma: PrismaClient): Promise<void> {
    const timeout = new Promise((_, reject) => {
      setTimeout(
        () => reject(new Error("Connection timeout")),
        this.config.connectionTimeout,
      );
    });

    const connectionTest = prisma.$queryRaw`SELECT 1`;

    await Promise.race([connectionTest, timeout]);
  }

  private getDatabaseUrl(connectionId: string): string {
    // For now, use the same DATABASE_URL. In a real implementation,
    // this could route to different read replicas or regions
    return process.env.DATABASE_URL || "";
  }

  private updateConnectionStats(connectionId: string, startTime: number): void {
    const stats = this.connectionStats.get(_connectionId) || {
      count: 0,
      lastUsed: new Date(),
    };
    stats.count++;
    stats.lastUsed = new Date();
    this.connectionStats.set(connectionId, stats);
  }

  private startHealthMonitoring(): void {
    this.healthCheckTimer = setInterval(
      () => this.performHealthCheck(),
      this.config.healthCheckInterval,
    );
  }

  private setupGracefulShutdown(): void {
    const shutdown = async () => {
      logger.info("Shutting down database connection manager");

      if (this.healthCheckTimer) {
        clearInterval(this.healthCheckTimer);
      }

      await this.closeAllConnections();
      process.exit(0);
    };

    process.on("SIGTERM", shutdown);
    process.on("SIGINT", shutdown);
  }
}

// Export singleton instance
export const dbManager = DatabaseConnectionManager.getInstance();

// Export enhanced prisma client with connection management
export const _enhancedPrisma = {
  async getClient(connectionId?: string) {
    return dbManager.getConnection(_connectionId);
  },

  async withTransaction<T>(
    fn: (prisma: any) => Promise<T>,
    connectionId?: string,
  ): Promise<T> {
    const client = await this.getClient(_connectionId);
    return client.$transaction(fn) as Promise<T>;
  },

  getMetrics: () => dbManager.getMetrics(),
  healthCheck: () => dbManager.performHealthCheck(),
};
