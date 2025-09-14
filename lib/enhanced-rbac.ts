
import { NextRequest } from "next/server";
import { prisma } from "./prisma";
import { getSession } from "../app/lib/auth";
import { SubscriptionTier } from '@prisma/client';
import { featureFlags } from './feature-flags';

export interface EnhancedAuthUser {
  id: string;
  email: string;
  name?: string;
  subscription: {
    tier: SubscriptionTier;
    features: string[];
    limits: Record<string, any>;
    isActive: boolean;
  };
  roles: Array<{
    role: string;
    siteId: string | null;
  }>;
}

export class EnhancedRBAC {
  async getAuthenticatedUser(request?: NextRequest): Promise<EnhancedAuthUser | null> {
    try {
      const session = await getSession();
      if (!session?.user?.id) return null;

      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        include: {
          subscription: true,
          roles: {
            select: {
              role: true,
              siteId: true
            }
          }
        }
      });

      if (!user) return null;

      return {
        id: user.id,
        email: user.email,
        name: user.name || undefined,
        subscription: {
          tier: user.subscription?.tier || SubscriptionTier.STARTER,
          features: (user.subscription?.features as string[]) || [],
          limits: (user.subscription?.limits as Record<string, any>) || {},
          isActive: user.subscription?.isActive || true
        },
        roles: user.roles.map((role: any) => ({
          role: role.role,
          siteId: role.siteId
        }))
      };
    } catch (error) {
      console.error('Error getting authenticated user:', error);
      return null;
    }
  }

  async hasFeatureAccess(userId: string, featureKey: string): Promise<boolean> {
    try {
      const user = await this.getUserById(userId);
      if (!user) return false;

      return await featureFlags.isFeatureEnabled(featureKey, user.subscription.tier);
    } catch (error) {
      console.error(`Error checking feature access for ${featureKey}:`, error);
      return false;
    }
  }

  async hasRoleAccess(
    userId: string, 
    requiredRole: string, 
    siteId?: string
  ): Promise<boolean> {
    try {
      const userRoles = await prisma.userRole.findMany({
        where: {
          userId,
          ...(siteId ? { siteId } : {})
        }
      });

      // Check for exact role match
      const hasRole = userRoles.some((role: any) => 
        role.role === requiredRole && 
        (!siteId || role.siteId === siteId)
      );

      if (hasRole) return true;

      // Check for admin role (has access to everything)
      const hasAdminRole = userRoles.some((role: any) => 
        role.role === 'ADMIN' && 
        (!siteId || role.siteId === siteId || role.siteId === null)
      );

      return hasAdminRole;
    } catch (error) {
      console.error('Error checking role access:', error);
      return false;
    }
  }

  async canAccessSite(userId: string, siteId: string): Promise<boolean> {
    try {
      const userRoles = await prisma.userRole.findMany({
        where: {
          userId,
          OR: [
            { siteId: siteId },
            { siteId: null } // Global roles
          ]
        }
      });

      return userRoles.length > 0;
    } catch (error) {
      console.error('Error checking site access:', error);
      return false;
    }
  }

  async getUserSubscription(userId: string) {
    try {
      return await prisma.userSubscription.findUnique({
        where: { userId }
      });
    } catch (error) {
      console.error('Error getting user subscription:', error);
      return null;
    }
  }

  async createUserSubscription(userId: string, tier: SubscriptionTier) {
    try {
      return await prisma.userSubscription.create({
        data: {
          userId,
          tier,
          features: [],
          limits: this.getDefaultLimits(tier),
          isActive: true
        }
      });
    } catch (error) {
      console.error('Error creating user subscription:', error);
      throw error;
    }
  }

  async upgradeUserSubscription(userId: string, newTier: SubscriptionTier) {
    try {
      const limits = this.getDefaultLimits(newTier);
      
      return await prisma.userSubscription.upsert({
        where: { userId },
        create: {
          userId,
          tier: newTier,
          features: [],
          limits,
          isActive: true
        },
        update: {
          tier: newTier,
          limits,
          updatedAt: new Date()
        }
      });
    } catch (error) {
      console.error('Error upgrading user subscription:', error);
      throw error;
    }
  }

  private async getUserById(userId: string): Promise<EnhancedAuthUser | null> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        subscription: true,
        roles: {
          select: {
            role: true,
            siteId: true
          }
        }
      }
    });

    if (!user) return null;

    return {
      id: user.id,
      email: user.email,
      name: user.name || undefined,
      subscription: {
        tier: user.subscription?.tier || SubscriptionTier.STARTER,
        features: (user.subscription?.features as string[]) || [],
        limits: (user.subscription?.limits as Record<string, any>) || {},
        isActive: user.subscription?.isActive || true
      },
      roles: user.roles.map((role: any) => ({
        role: role.role,
        siteId: role.siteId
      }))
    };
  }

  private getDefaultLimits(tier: SubscriptionTier): Record<string, any> {
    switch (tier) {
      case SubscriptionTier.STARTER:
        return {
          maxSites: 1,
          maxDrafts: 10,
          maxPrompts: 5,
          maxSeoAudits: 1,
          storageGB: 1
        };
      case SubscriptionTier.PRO:
        return {
          maxSites: 5,
          maxDrafts: 100,
          maxPrompts: 50,
          maxSeoAudits: 10,
          storageGB: 10
        };
      case SubscriptionTier.GURU:
        return {
          maxSites: -1, // Unlimited
          maxDrafts: -1,
          maxPrompts: -1,
          maxSeoAudits: -1,
          storageGB: 100
        };
      default:
        return {};
    }
  }

  // Middleware wrapper for API routes
  requireFeature(featureKey: string) {
    return (handler: (req: NextRequest, user: EnhancedAuthUser, context?: any) => Promise<Response>) => {
      return async (req: NextRequest, context?: any) => {
        const user = await this.getAuthenticatedUser(req);
        if (!user) {
          return new Response(JSON.stringify({ error: 'Authentication required' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' }
          });
        }

        const hasAccess = await this.hasFeatureAccess(user.id, featureKey);
        if (!hasAccess) {
          return new Response(JSON.stringify({ 
            error: 'Feature not available in your subscription tier',
            requiredFeature: featureKey 
          }), {
            status: 403,
            headers: { 'Content-Type': 'application/json' }
          });
        }

        return handler(req, user, context);
      };
    };
  }

  requireRole(role: string, siteId?: string) {
    return (handler: (req: NextRequest, user: EnhancedAuthUser, context?: any) => Promise<Response>) => {
      return async (req: NextRequest, context?: any) => {
        const user = await this.getAuthenticatedUser(req);
        if (!user) {
          return new Response(JSON.stringify({ error: 'Authentication required' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' }
          });
        }

        const hasAccess = await this.hasRoleAccess(user.id, role, siteId);
        if (!hasAccess) {
          return new Response(JSON.stringify({ 
            error: 'Insufficient permissions',
            requiredRole: role 
          }), {
            status: 403,
            headers: { 'Content-Type': 'application/json' }
          });
        }

        return handler(req, user, context);
      };
    };
  }
}

export const enhancedRBAC = new EnhancedRBAC();
