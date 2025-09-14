import { prisma } from "@/app/lib/prisma";
import { env } from "@/lib/env/validation";

export interface AuditEvent {
  userId?: string;
  sessionId?: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: Record<string, any>;
  ip?: string;
  userAgent?: string;
  timestamp?: Date;
  severity?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  category?: "AUTH" | "DATA" | "SYSTEM" | "SECURITY" | "USER";
}

export interface AuditQuery {
  userId?: string;
  action?: string;
  resource?: string;
  startDate?: Date;
  endDate?: Date;
  severity?: string;
  category?: string;
  limit?: number;
  offset?: number;
}

export interface AuditStats {
  totalEvents: number;
  eventsByCategory: Record<string, number>;
  eventsBySeverity: Record<string, number>;
  topUsers: Array<{ userId: string; count: number }>;
  topActions: Array<{ action: string; count: number }>;
  recentEvents: AuditEvent[];
}

export class AuditLogger {
  private static instance: AuditLogger;
  private eventQueue: AuditEvent[] = [];
  private isProcessing = false;
  private readonly BATCH_SIZE = 50;
  private readonly FLUSH_INTERVAL = 5000; // 5 seconds

  private constructor() {
    // Start background processing
    this.startBackgroundProcessing();
  }

  static getInstance(): AuditLogger {
    if (!AuditLogger.instance) {
      AuditLogger.instance = new AuditLogger();
    }
    return AuditLogger.instance;
  }

  /**
   * Log an audit event
   */
  async log(event: AuditEvent): Promise<void> {
    // Enrich event with metadata
    const enrichedEvent: AuditEvent = {
      ...event,
      timestamp: event.timestamp || new Date(),
      severity: event.severity || this.determineSeverity(event),
      category: event.category || this.determineCategory(event),
    };

    // Add to queue for batch processing
    this.eventQueue.push(enrichedEvent);

    // If queue is full, process immediately
    if (this.eventQueue.length >= this.BATCH_SIZE) {
      await this.processQueue();
    }

    // Log critical events immediately
    if (enrichedEvent.severity === "CRITICAL") {
      await this.logImmediately(enrichedEvent);
    }
  }

  /**
   * Log authentication events
   */
  async logAuth(event: Omit<AuditEvent, "category">): Promise<void> {
    await this.log({
      ...event,
      category: "AUTH",
    });
  }

  /**
   * Log security events
   */
  async logSecurity(
    event: Omit<AuditEvent, "category" | "severity">,
  ): Promise<void> {
    await this.log({
      ...event,
      category: "SECURITY",
      severity: "HIGH",
    });
  }

  /**
   * Log data access events
   */
  async logDataAccess(event: Omit<AuditEvent, "category">): Promise<void> {
    await this.log({
      ...event,
      category: "DATA",
    });
  }

  /**
   * Log system events
   */
  async logSystem(event: Omit<AuditEvent, "category">): Promise<void> {
    await this.log({
      ...event,
      category: "SYSTEM",
    });
  }

  /**
   * Log user action events
   */
  async logUserAction(event: Omit<AuditEvent, "category">): Promise<void> {
    await this.log({
      ...event,
      category: "USER",
    });
  }

  /**
   * Query audit logs
   */
  async query(params: AuditQuery): Promise<AuditEvent[]> {
    if (!prisma) {
      return [];
    }

    try {
      const where: any = {};

      if (params.userId) where.userId = params.userId;
      if (params.action)
        where.action = { contains: params.action, mode: "insensitive" };
      if (params.resource)
        where.resource = { contains: params.resource, mode: "insensitive" };
      if (params.severity) where.severity = params.severity;
      if (params.category) where.category = params.category;

      if (params.startDate || params.endDate) {
        where.timestamp = {};
        if (params.startDate) where.timestamp.gte = params.startDate;
        if (params.endDate) where.timestamp.lte = params.endDate;
      }

      const logs = await prisma.auditLog.findMany({
        where,
        orderBy: { timestamp: "desc" },
        take: params.limit || 100,
        skip: params.offset || 0,
      });

      return logs.map((log: any) => ({
        userId: log.userId || undefined,
        sessionId: (log as any).sessionId || undefined,
        action: log.action,
        resource: log.resource,
        resourceId: log.resourceId || undefined,
        details: (log.details as Record<string, any>) || {},
        ip: (log as any).ip || undefined,
        userAgent: (log as any).userAgent || undefined,
        timestamp: log.timestamp,
        severity: (log as any).severity || "LOW",
        category: (log as any).category || "SYSTEM",
      }));
    } catch (error) {
      console.error("Error querying audit logs:", error);
      return [];
    }
  }

  /**
   * Get audit statistics
   */
  async getStats(startDate?: Date, endDate?: Date): Promise<AuditStats> {
    if (!prisma) {
      return {
        totalEvents: 0,
        eventsByCategory: {},
        eventsBySeverity: {},
        topUsers: [],
        topActions: [],
        recentEvents: [],
      };
    }

    try {
      const where: any = {};
      if (startDate || endDate) {
        where.timestamp = {};
        if (startDate) where.timestamp.gte = startDate;
        if (endDate) where.timestamp.lte = endDate;
      }

      // Total events
      const totalEvents = await prisma.auditLog.count({ where });

      // Events by category
      const categoryStats = await prisma.auditLog.groupBy({
        by: ["category"],
        where,
        _count: { category: true },
      });

      const eventsByCategory = categoryStats.reduce(
        (acc: any, stat: any) => {
          acc[(stat as any).category || "UNKNOWN"] = stat._count.category;
          return acc;
        },
        {} as Record<string, number>,
      );

      // Events by severity
      const severityStats = await prisma.auditLog.groupBy({
        by: ["severity"],
        where,
        _count: { severity: true },
      });

      const eventsBySeverity = severityStats.reduce(
        (acc: any, stat: any) => {
          acc[(stat as any).severity || "LOW"] = stat._count.severity;
          return acc;
        },
        {} as Record<string, number>,
      );

      // Top users
      const userStats = await prisma.auditLog.groupBy({
        by: ["userId"],
        where: { ...where, userId: { not: null } },
        _count: { userId: true },
        orderBy: { _count: { userId: "desc" } },
        take: 10,
      });

      const topUsers = userStats.map((stat: any) => ({
        userId: stat.userId!,
        count: stat._count.userId,
      }));

      // Top actions
      const actionStats = await prisma.auditLog.groupBy({
        by: ["action"],
        where,
        _count: { action: true },
        orderBy: { _count: { action: "desc" } },
        take: 10,
      });

      const topActions = actionStats.map((stat: any) => ({
        action: stat.action,
        count: stat._count.action,
      }));

      // Recent events
      const recentEvents = await this.query({ limit: 20 });

      return {
        totalEvents,
        eventsByCategory,
        eventsBySeverity,
        topUsers,
        topActions,
        recentEvents,
      };
    } catch (error) {
      console.error("Error getting audit stats:", error);
      return {
        totalEvents: 0,
        eventsByCategory: {},
        eventsBySeverity: {},
        topUsers: [],
        topActions: [],
        recentEvents: [],
      };
    }
  }

  /**
   * Clean up old audit logs
   */
  async cleanup(olderThanDays: number = 90): Promise<number> {
    if (!prisma) {
      return 0;
    }

    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      const result = await prisma.auditLog.deleteMany({
        where: {
          timestamp: { lt: cutoffDate },
          severity: { not: "CRITICAL" }, // Keep critical events longer
        },
      });

      return result.count;
    } catch (error) {
      console.error("Error cleaning up audit logs:", error);
      return 0;
    }
  }

  /**
   * Process queued events
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.eventQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    try {
      const eventsToProcess = this.eventQueue.splice(0, this.BATCH_SIZE);
      await this.batchInsert(eventsToProcess);
    } catch (error) {
      console.error("Error processing audit queue:", error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Batch insert events to database
   */
  private async batchInsert(events: AuditEvent[]): Promise<void> {
    if (!prisma || events.length === 0) {
      return;
    }

    try {
      const data = events.map((event) => ({
        userId: event.userId || null,
        sessionId: (event as any).sessionId || null,
        action: event.action,
        resource: event.resource,
        resourceId: event.resourceId || null,
        details: event.details || {},
        ip: event.ip || null,
        userAgent: event.userAgent || null,
        timestamp: event.timestamp || new Date(),
        severity: event.severity || "LOW",
        category: event.category || "SYSTEM",
      }));

      await prisma.auditLog.createMany({ data });
    } catch (error) {
      console.error("Error batch inserting audit events:", error);

      // Fallback: try inserting one by one
      for (const event of events) {
        try {
          await this.logImmediately(event);
        } catch (individualError) {
          console.error(
            "Error inserting individual audit event:",
            individualError,
          );
        }
      }
    }
  }

  /**
   * Log event immediately (bypass queue)
   */
  private async logImmediately(event: AuditEvent): Promise<void> {
    if (!prisma) {
      console.log("Audit Event (No DB):", JSON.stringify(event, null, 2));
      return;
    }

    try {
      await prisma.auditLog.create({
        data: {
          userId: event.userId || null,
          sessionId: (event as any).sessionId || null,
          action: event.action,
          resource: event.resource,
          resourceId: event.resourceId || null,
          details: event.details || {},
          ip: event.ip || null,
          userAgent: event.userAgent || null,
          timestamp: event.timestamp || new Date(),
          severity: event.severity || "LOW",
          category: event.category || "SYSTEM",
        },
      });
    } catch (error) {
      console.error("Error logging audit event immediately:", error);
    }
  }

  /**
   * Start background processing
   */
  private startBackgroundProcessing(): void {
    setInterval(async () => {
      await this.processQueue();
    }, this.FLUSH_INTERVAL);
  }

  /**
   * Determine event severity
   */
  private determineSeverity(
    event: AuditEvent,
  ): "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" {
    const criticalActions = [
      "DELETE_USER",
      "DELETE_ROLE",
      "SYSTEM_SHUTDOWN",
      "SECURITY_BREACH",
      "UNAUTHORIZED_ACCESS",
      "DATA_BREACH",
      "PRIVILEGE_ESCALATION",
    ];

    const highActions = [
      "CREATE_USER",
      "UPDATE_USER",
      "ASSIGN_ROLE",
      "REMOVE_ROLE",
      "FAILED_LOGIN",
      "PASSWORD_RESET",
      "ACCOUNT_LOCKED",
    ];

    const mediumActions = [
      "LOGIN",
      "LOGOUT",
      "UPDATE_PROFILE",
      "CHANGE_PASSWORD",
      "ENABLE_2FA",
      "DISABLE_2FA",
    ];

    if (criticalActions.includes(event.action)) return "CRITICAL";
    if (highActions.includes(event.action)) return "HIGH";
    if (mediumActions.includes(event.action)) return "MEDIUM";

    return "LOW";
  }

  /**
   * Determine event category
   */
  private determineCategory(
    event: AuditEvent,
  ): "AUTH" | "DATA" | "SYSTEM" | "SECURITY" | "USER" {
    const authActions = [
      "LOGIN",
      "LOGOUT",
      "REGISTER",
      "PASSWORD_RESET",
      "VERIFY_EMAIL",
      "ENABLE_2FA",
      "DISABLE_2FA",
      "VERIFY_2FA",
    ];

    const securityActions = [
      "FAILED_LOGIN",
      "ACCOUNT_LOCKED",
      "UNAUTHORIZED_ACCESS",
      "SECURITY_BREACH",
      "PRIVILEGE_ESCALATION",
      "SUSPICIOUS_ACTIVITY",
    ];

    const dataActions = [
      "CREATE",
      "READ",
      "UPDATE",
      "DELETE",
      "EXPORT",
      "IMPORT",
    ];

    const userActions = [
      "CREATE_USER",
      "UPDATE_USER",
      "DELETE_USER",
      "UPDATE_PROFILE",
    ];

    if (authActions.some((action) => event.action.includes(action)))
      return "AUTH";
    if (securityActions.some((action) => event.action.includes(action)))
      return "SECURITY";
    if (dataActions.some((action) => event.action.includes(action)))
      return "DATA";
    if (userActions.some((action) => event.action.includes(action)))
      return "USER";

    return "SYSTEM";
  }

  /**
   * Flush remaining events (for graceful shutdown)
   */
  async flush(): Promise<void> {
    await this.processQueue();
  }
}

// Export singleton instance
export const auditLogger = AuditLogger.getInstance();

// Convenience functions
export async function logAuthEvent(
  action: string,
  userId?: string,
  details?: Record<string, any>,
  request?: Request,
): Promise<void> {
  await auditLogger.logAuth({
    userId,
    action,
    resource: "auth",
    details,
    ip:
      request?.headers.get("x-forwarded-for")?.split(",")[0] ||
      request?.headers.get("x-real-ip") ||
      "unknown",
    userAgent: request?.headers.get("user-agent") || "unknown",
  });
}

export async function logSecurityEvent(
  action: string,
  details: Record<string, any>,
  request?: Request,
  userId?: string,
): Promise<void> {
  await auditLogger.logSecurity({
    userId,
    action,
    resource: "security",
    details,
    ip:
      request?.headers.get("x-forwarded-for")?.split(",")[0] ||
      request?.headers.get("x-real-ip") ||
      "unknown",
    userAgent: request?.headers.get("user-agent") || "unknown",
  });
}

export async function logDataEvent(
  action: string,
  resource: string,
  resourceId: string,
  userId: string,
  details?: Record<string, any>,
): Promise<void> {
  await auditLogger.logDataAccess({
    userId,
    action,
    resource,
    resourceId,
    details,
  });
}
