
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { ScopedToken } from '@prisma/client';

export interface TokenPayload {
  tokenId: string;
  siteId?: string;
  scopes: string[];
  expiresAt?: Date;
}

export class ScopedTokenService {
  private static readonly SECRET_KEY = process.env.TOKEN_SECRET || 'default-secret';

  static async createToken(
    siteId?: string,
    scopes: string[] = ['read:drafts'],
    expiryDays = 90
  ): Promise<{ token: string; tokenRecord: ScopedToken }> {
    const tokenValue = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiryDays);

    const tokenRecord = await prisma.scopedToken.create({
      data: {
        token: tokenValue,
        siteId,
        scopes,
        expiresAt,
      },
    });

    return {
      token: tokenValue,
      tokenRecord,
    };
  }

  static async validateToken(token: string): Promise<TokenPayload | null> {
    try {
      const tokenRecord = await prisma.scopedToken.findUnique({
        where: { token },
      });

      if (!tokenRecord) {
        return null;
      }

      // Check expiry
      if (tokenRecord.expiresAt && tokenRecord.expiresAt < new Date()) {
        // Token expired - clean it up
        await prisma.scopedToken.delete({
          where: { id: tokenRecord.id },
        });
        return null;
      }

      return {
        tokenId: tokenRecord.id,
        siteId: tokenRecord.siteId || undefined,
        scopes: Array.isArray(tokenRecord.scopes) ? tokenRecord.scopes as string[] : [],
        expiresAt: tokenRecord.expiresAt || undefined,
      };
    } catch (error) {
      console.error('Token validation error:', error);
      return null;
    }
  }

  static async hasScope(token: string, requiredScope: string): Promise<boolean> {
    const payload = await this.validateToken(token);
    if (!payload) {
      return false;
    }

    return payload.scopes.includes(requiredScope) || payload.scopes.includes('admin:all');
  }

  static async revokeToken(token: string): Promise<void> {
    await prisma.scopedToken.delete({
      where: { token },
    });
  }

  static async listTokens(siteId?: string): Promise<ScopedToken[]> {
    return await prisma.scopedToken.findMany({
      where: siteId ? { siteId } : {},
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  static async cleanupExpiredTokens(): Promise<number> {
    const result = await prisma.scopedToken.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });

    return result.count;
  }

  static getAvailableScopes(): string[] {
    return [
      'read:drafts',
      'write:drafts',
      'read:reviews',
      'write:reviews',
      'read:sites',
      'write:sites',
      'read:analytics',
      'admin:all',
    ];
  }
}
