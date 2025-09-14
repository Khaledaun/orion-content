
import { Redis } from "@upstash/redis";
import { TokenManager, TokenPayload, RefreshTokenPayload } from "@/lib/auth/token";
import { auditLogger } from "./audit-logger";
import { env } from "@/lib/env/validation";
import crypto from "crypto";

export interface SessionData {
  userId: string;
  email: string;
  roles: string[];
  sessionId: string;
  createdAt: Date;
  lastAccessedAt: Date;
  expiresAt: Date;
  ip?: string;
  userAgent?: string;
  deviceId?: string;
  isActive: boolean;
  metadata?: Record<string, any>;
}

export interface SessionOptions {
  maxAge?: number; // in seconds
  rolling?: boolean; // extend session on activity
  secure?: boolean;
  httpOnly?: boolean;
  sameSite?: 'strict' | 'lax' | 'none';
}

export interface ActiveSession {
  sessionId: string;
  userId: string;
  createdAt: Date;
  lastAccessedAt: Date;
  ip?: string;
  userAgent?: string;
  deviceId?: string;
  current?: boolean;
}

export class SessionManager {
  private static instance: SessionManager;
  private redis: Redis | null = null;
  private memoryStore = new Map<string, SessionData>();

  private readonly DEFAULT_MAX_AGE = 30 * 24 * 60 * 60; // 30 days
  private readonly CLEANUP_INTERVAL = 60 * 60 * 1000; // 1 hour

  private constructor() {
    // Initialize Redis if available
    if (env.UPSTASH_REDIS_URL && env.UPSTASH_REDIS_TOKEN) {
      this.redis = new Redis({
        url: env.UPSTASH_REDIS_URL,
        token: env.UPSTASH_REDIS_TOKEN,
      });
    }

    // Start cleanup process
    this.startCleanupProcess();
  }

  static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager();
    }
    return SessionManager.instance;
  }

  /**
   * Create a new session
   */
  async createSession(
    userId: string,
    email: string,
    roles: string[],
    options: SessionOptions = {},
    metadata?: Record<string, any>
  ): Promise<{ sessionId: string; accessToken: string; refreshToken: string }> {
    const sessionId = TokenManager.generateSessionId();
    const now = new Date();
    const maxAge = options.maxAge || this.DEFAULT_MAX_AGE;
    const expiresAt = new Date(now.getTime() + maxAge * 1000);

    const sessionData: SessionData = {
      userId,
      email,
      roles,
      sessionId,
      createdAt: now,
      lastAccessedAt: now,
      expiresAt,
      ip: metadata?.ip,
      userAgent: metadata?.userAgent,
      deviceId: metadata?.deviceId || this.generateDeviceId(metadata?.userAgent, metadata?.ip),
      isActive: true,
      metadata
    };

    // Store session
    await this.storeSession(sessionId, sessionData);

    // Generate tokens
    const tokenPayload: Omit<TokenPayload, 'iat' | 'exp'> = {
      userId,
      email,
      roles,
      sessionId
    };

    const tokens = TokenManager.generateTokenPair(tokenPayload);

    // Log session creation
    await auditLogger.logAuth({
      userId,
      action: 'SESSION_CREATED',
      resource: 'session',
      resourceId: sessionId,
      details: {
        deviceId: sessionData.deviceId,
        expiresAt: expiresAt.toISOString()
      },
      ip: metadata?.ip,
      userAgent: metadata?.userAgent
    });

    return {
      sessionId,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken
    };
  }

  /**
   * Get session data
   */
  async getSession(sessionId: string): Promise<SessionData | null> {
    try {
      if (this.redis) {
        const data = await this.redis.get(`session:${sessionId}`);
        if (data) {
          const sessionData = JSON.parse(data as string);
          // Convert date strings back to Date objects
          sessionData.createdAt = new Date(sessionData.createdAt);
          sessionData.lastAccessedAt = new Date(sessionData.lastAccessedAt);
          sessionData.expiresAt = new Date(sessionData.expiresAt);
          return sessionData;
        }
      } else {
        return this.memoryStore.get(sessionId) || null;
      }
    } catch (error) {
      console.error('Error getting session:', error);
    }
    return null;
  }

  /**
   * Update session activity
   */
  async touchSession(sessionId: string, rolling: boolean = true): Promise<boolean> {
    const session = await this.getSession(sessionId);
    if (!session || !session.isActive) {
      return false;
    }

    // Check if session is expired
    if (session.expiresAt < new Date()) {
      await this.destroySession(sessionId);
      return false;
    }

    // Update last accessed time
    session.lastAccessedAt = new Date();

    // Extend expiration if rolling sessions are enabled
    if (rolling) {
      const maxAge = this.DEFAULT_MAX_AGE;
      session.expiresAt = new Date(Date.now() + maxAge * 1000);
    }

    await this.storeSession(sessionId, session);
    return true;
  }

  /**
   * Refresh session tokens
   */
  async refreshSession(refreshToken: string): Promise<{
    accessToken: string;
    refreshToken: string;
  } | null> {
    const payload = TokenManager.verifyRefreshToken(refreshToken);
    if (!payload) {
      return null;
    }

    const session = await this.getSession(payload.sessionId);
    if (!session || !session.isActive) {
      return null;
    }

    // Check if session is expired
    if (session.expiresAt < new Date()) {
      await this.destroySession(payload.sessionId);
      return null;
    }

    // Update session activity
    await this.touchSession(payload.sessionId);

    // Generate new tokens
    const tokenPayload: Omit<TokenPayload, 'iat' | 'exp'> = {
      userId: session.userId,
      email: session.email,
      roles: session.roles,
      sessionId: session.sessionId
    };

    const tokens = TokenManager.generateTokenPair(tokenPayload, payload.tokenVersion + 1);

    // Log token refresh
    await auditLogger.logAuth({
      userId: session.userId,
      action: 'TOKEN_REFRESHED',
      resource: 'session',
      resourceId: session.sessionId,
      details: {
        tokenVersion: payload.tokenVersion + 1
      }
    });

    return tokens;
  }

  /**
   * Destroy a session
   */
  async destroySession(sessionId: string): Promise<boolean> {
    const session = await this.getSession(sessionId);
    
    try {
      if (this.redis) {
        await this.redis.del(`session:${sessionId}`);
      } else {
        this.memoryStore.delete(sessionId);
      }

      // Log session destruction
      if (session) {
        await auditLogger.logAuth({
          userId: session.userId,
          action: 'SESSION_DESTROYED',
          resource: 'session',
          resourceId: sessionId,
          details: {
            reason: 'manual_logout'
          }
        });
      }

      return true;
    } catch (error) {
      console.error('Error destroying session:', error);
      return false;
    }
  }

  /**
   * Destroy all sessions for a user
   */
  async destroyAllUserSessions(userId: string, exceptSessionId?: string): Promise<number> {
    const sessions = await this.getUserSessions(userId);
    let destroyedCount = 0;

    for (const session of sessions) {
      if (session.sessionId !== exceptSessionId) {
        const success = await this.destroySession(session.sessionId);
        if (success) destroyedCount++;
      }
    }

    // Log bulk session destruction
    await auditLogger.logAuth({
      userId,
      action: 'ALL_SESSIONS_DESTROYED',
      resource: 'session',
      details: {
        destroyedCount,
        exceptSessionId
      }
    });

    return destroyedCount;
  }

  /**
   * Get all active sessions for a user
   */
  async getUserSessions(userId: string): Promise<ActiveSession[]> {
    const sessions: ActiveSession[] = [];

    try {
      if (this.redis) {
        // Get all session keys
        const keys = await this.redis.keys('session:*');
        
        for (const key of keys) {
          const data = await this.redis.get(key);
          if (data) {
            const sessionData = JSON.parse(data as string);
            if (sessionData.userId === userId && sessionData.isActive) {
              sessions.push({
                sessionId: sessionData.sessionId,
                userId: sessionData.userId,
                createdAt: new Date(sessionData.createdAt),
                lastAccessedAt: new Date(sessionData.lastAccessedAt),
                ip: sessionData.ip,
                userAgent: sessionData.userAgent,
                deviceId: sessionData.deviceId
              });
            }
          }
        }
      } else {
        for (const [sessionId, sessionData] of this.memoryStore.entries()) {
          if (sessionData.userId === userId && sessionData.isActive) {
            sessions.push({
              sessionId,
              userId: sessionData.userId,
              createdAt: sessionData.createdAt,
              lastAccessedAt: sessionData.lastAccessedAt,
              ip: sessionData.ip,
              userAgent: sessionData.userAgent,
              deviceId: sessionData.deviceId
            });
          }
        }
      }
    } catch (error) {
      console.error('Error getting user sessions:', error);
    }

    return sessions.sort((a, b) => b.lastAccessedAt.getTime() - a.lastAccessedAt.getTime());
  }

  /**
   * Clean up expired sessions
   */
  async cleanupExpiredSessions(): Promise<number> {
    let cleanedCount = 0;
    const now = new Date();

    try {
      if (this.redis) {
        const keys = await this.redis.keys('session:*');
        
        for (const key of keys) {
          const data = await this.redis.get(key);
          if (data) {
            const sessionData = JSON.parse(data as string);
            if (new Date(sessionData.expiresAt) < now) {
              await this.redis.del(key);
              cleanedCount++;
            }
          }
        }
      } else {
        for (const [sessionId, sessionData] of this.memoryStore.entries()) {
          if (sessionData.expiresAt < now) {
            this.memoryStore.delete(sessionId);
            cleanedCount++;
          }
        }
      }
    } catch (error) {
      console.error('Error cleaning up expired sessions:', error);
    }

    if (cleanedCount > 0) {
      await auditLogger.logSystem({
        action: 'SESSIONS_CLEANED',
        resource: 'session',
        details: { cleanedCount }
      });
    }

    return cleanedCount;
  }

  /**
   * Get session statistics
   */
  async getSessionStats(): Promise<{
    totalSessions: number;
    activeSessions: number;
    expiredSessions: number;
    sessionsByUser: Record<string, number>;
  }> {
    const stats = {
      totalSessions: 0,
      activeSessions: 0,
      expiredSessions: 0,
      sessionsByUser: {} as Record<string, number>
    };

    const now = new Date();

    try {
      if (this.redis) {
        const keys = await this.redis.keys('session:*');
        stats.totalSessions = keys.length;

        for (const key of keys) {
          const data = await this.redis.get(key);
          if (data) {
            const sessionData = JSON.parse(data as string);
            
            if (new Date(sessionData.expiresAt) > now && sessionData.isActive) {
              stats.activeSessions++;
            } else {
              stats.expiredSessions++;
            }

            stats.sessionsByUser[sessionData.userId] = 
              (stats.sessionsByUser[sessionData.userId] || 0) + 1;
          }
        }
      } else {
        stats.totalSessions = this.memoryStore.size;

        for (const sessionData of this.memoryStore.values()) {
          if (sessionData.expiresAt > now && sessionData.isActive) {
            stats.activeSessions++;
          } else {
            stats.expiredSessions++;
          }

          stats.sessionsByUser[sessionData.userId] = 
            (stats.sessionsByUser[sessionData.userId] || 0) + 1;
        }
      }
    } catch (error) {
      console.error('Error getting session stats:', error);
    }

    return stats;
  }

  /**
   * Store session data
   */
  private async storeSession(sessionId: string, sessionData: SessionData): Promise<void> {
    try {
      if (this.redis) {
        const ttl = Math.ceil((sessionData.expiresAt.getTime() - Date.now()) / 1000);
        await this.redis.setex(`session:${sessionId}`, ttl, JSON.stringify(sessionData));
      } else {
        this.memoryStore.set(sessionId, sessionData);
      }
    } catch (error) {
      console.error('Error storing session:', error);
      throw error;
    }
  }

  /**
   * Generate device ID
   */
  private generateDeviceId(userAgent?: string, ip?: string): string {
    const data = `${userAgent || 'unknown'}:${ip || 'unknown'}`;
    return crypto.createHash('sha256').update(data).digest('hex').substring(0, 16);
  }

  /**
   * Start cleanup process
   */
  private startCleanupProcess(): void {
    setInterval(async () => {
      await this.cleanupExpiredSessions();
    }, this.CLEANUP_INTERVAL);
  }
}

// Export singleton instance
export const sessionManager = SessionManager.getInstance();

// Utility functions
export async function createUserSession(
  userId: string,
  email: string,
  roles: string[],
  request?: Request,
  options?: SessionOptions
): Promise<{ sessionId: string; accessToken: string; refreshToken: string }> {
  const metadata = request ? {
    ip: request.headers.get('x-forwarded-for')?.split(',')[0] || 
        request.headers.get('x-real-ip') || 
        'unknown',
    userAgent: request.headers.get('user-agent') || 'unknown'
  } : undefined;

  return sessionManager.createSession(userId, email, roles, options, metadata);
}

export async function validateSession(sessionId: string): Promise<SessionData | null> {
  const session = await sessionManager.getSession(sessionId);
  if (!session) return null;

  // Touch session to update activity
  const isValid = await sessionManager.touchSession(sessionId);
  return isValid ? session : null;
}

export async function logoutUser(sessionId: string): Promise<boolean> {
  return sessionManager.destroySession(sessionId);
}

export async function logoutAllDevices(userId: string, currentSessionId?: string): Promise<number> {
  return sessionManager.destroyAllUserSessions(userId, currentSessionId);
}
