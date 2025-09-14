
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { env } from '@/lib/env/validation';

export interface TokenPayload {
  userId: string;
  email: string;
  roles: string[];
  sessionId: string;
  iat?: number;
  exp?: number;
}

export interface RefreshTokenPayload {
  userId: string;
  sessionId: string;
  tokenVersion: number;
  iat?: number;
  exp?: number;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  refreshExpiresIn: number;
}

export class TokenManager {
  private static readonly ACCESS_TOKEN_EXPIRY = '15m';
  private static readonly REFRESH_TOKEN_EXPIRY = '7d';
  private static readonly ALGORITHM = 'HS256';

  /**
   * Generate access and refresh token pair
   */
  static generateTokenPair(payload: Omit<TokenPayload, 'iat' | 'exp'>, tokenVersion: number = 1): TokenPair {
    const sessionId = payload.sessionId || crypto.randomUUID();
    
    const accessToken = jwt.sign(
      { ...payload, sessionId },
      env.JWT_SECRET,
      {
        expiresIn: this.ACCESS_TOKEN_EXPIRY,
        algorithm: this.ALGORITHM,
        issuer: 'orion-cms',
        audience: 'orion-cms-users'
      }
    );

    const refreshToken = jwt.sign(
      {
        userId: payload.userId,
        sessionId,
        tokenVersion
      } as RefreshTokenPayload,
      env.JWT_SECRET,
      {
        expiresIn: this.REFRESH_TOKEN_EXPIRY,
        algorithm: this.ALGORITHM,
        issuer: 'orion-cms',
        audience: 'orion-cms-refresh'
      }
    );

    return {
      accessToken,
      refreshToken,
      expiresIn: 15 * 60, // 15 minutes in seconds
      refreshExpiresIn: 7 * 24 * 60 * 60 // 7 days in seconds
    };
  }

  /**
   * Verify and decode access token
   */
  static verifyAccessToken(token: string): TokenPayload | null {
    try {
      const decoded = jwt.verify(token, env.JWT_SECRET, {
        algorithms: [this.ALGORITHM],
        issuer: 'orion-cms',
        audience: 'orion-cms-users'
      }) as TokenPayload;

      return decoded;
    } catch (error) {
      console.error('Access token verification failed:', error);
      return null;
    }
  }

  /**
   * Verify and decode refresh token
   */
  static verifyRefreshToken(token: string): RefreshTokenPayload | null {
    try {
      const decoded = jwt.verify(token, env.JWT_SECRET, {
        algorithms: [this.ALGORITHM],
        issuer: 'orion-cms',
        audience: 'orion-cms-refresh'
      }) as RefreshTokenPayload;

      return decoded;
    } catch (error) {
      console.error('Refresh token verification failed:', error);
      return null;
    }
  }

  /**
   * Extract token from Authorization header
   */
  static extractBearerToken(authHeader: string | null): string | null {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    return authHeader.substring(7);
  }

  /**
   * Generate a secure session ID
   */
  static generateSessionId(): string {
    return crypto.randomUUID();
  }

  /**
   * Create a short-lived verification token
   */
  static generateVerificationToken(payload: Record<string, any>, expiresIn: string = '1h'): string {
    return jwt.sign(
      payload,
      env.JWT_SECRET,
      {
        expiresIn,
        algorithm: this.ALGORITHM,
        issuer: 'orion-cms',
        audience: 'orion-cms-verification'
      }
    );
  }

  /**
   * Verify verification token
   */
  static verifyVerificationToken(token: string): any | null {
    try {
      return jwt.verify(token, env.JWT_SECRET, {
        algorithms: [this.ALGORITHM],
        issuer: 'orion-cms',
        audience: 'orion-cms-verification'
      });
    } catch (error) {
      console.error('Verification token failed:', error);
      return null;
    }
  }

  /**
   * Check if token is expired
   */
  static isTokenExpired(token: string): boolean {
    try {
      const decoded = jwt.decode(token) as any;
      if (!decoded || !decoded.exp) return true;
      
      return Date.now() >= decoded.exp * 1000;
    } catch {
      return true;
    }
  }

  /**
   * Get token expiration time
   */
  static getTokenExpiration(token: string): Date | null {
    try {
      const decoded = jwt.decode(token) as any;
      if (!decoded || !decoded.exp) return null;
      
      return new Date(decoded.exp * 1000);
    } catch {
      return null;
    }
  }

  /**
   * Create API key for service-to-service communication
   */
  static generateApiKey(serviceId: string, permissions: string[]): string {
    const payload = {
      serviceId,
      permissions,
      type: 'api-key'
    };

    return jwt.sign(
      payload,
      env.JWT_SECRET,
      {
        algorithm: this.ALGORITHM,
        issuer: 'orion-cms',
        audience: 'orion-cms-api'
      }
    );
  }

  /**
   * Verify API key
   */
  static verifyApiKey(token: string): { serviceId: string; permissions: string[] } | null {
    try {
      const decoded = jwt.verify(token, env.JWT_SECRET, {
        algorithms: [this.ALGORITHM],
        issuer: 'orion-cms',
        audience: 'orion-cms-api'
      }) as any;

      if (decoded.type !== 'api-key') {
        return null;
      }

      return {
        serviceId: decoded.serviceId,
        permissions: decoded.permissions || []
      };
    } catch (error) {
      console.error('API key verification failed:', error);
      return null;
    }
  }

  /**
   * Generate secure random token for various purposes
   */
  static generateSecureToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Hash token for secure storage
   */
  static hashToken(token: string): string {
    return crypto
      .createHmac('sha256', env.ENCRYPTION_KEY)
      .update(token)
      .digest('hex');
  }

  /**
   * Verify hashed token
   */
  static verifyHashedToken(token: string, hashedToken: string): boolean {
    const computedHash = this.hashToken(token);
    return crypto.timingSafeEqual(
      Buffer.from(hashedToken, 'hex'),
      Buffer.from(computedHash, 'hex')
    );
  }

  /**
   * Create temporary access token for password reset
   */
  static generatePasswordResetToken(userId: string, email: string): string {
    return this.generateVerificationToken(
      { userId, email, purpose: 'password-reset' },
      '1h'
    );
  }

  /**
   * Create email verification token
   */
  static generateEmailVerificationToken(userId: string, email: string): string {
    return this.generateVerificationToken(
      { userId, email, purpose: 'email-verification' },
      '24h'
    );
  }
}
