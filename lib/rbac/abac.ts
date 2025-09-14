
import { prisma } from "@/app/lib/prisma";

export interface Permission {
  id: string;
  name: string;
  resource: string;
  action: string;
  conditions?: AttributeCondition[];
}

export interface Role {
  id: string;
  name: string;
  description?: string;
  permissions: Permission[];
  inheritsFrom?: string[];
}

export interface AttributeCondition {
  attribute: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'greater_than' | 'less_than' | 'in' | 'not_in' | 'exists' | 'not_exists';
  value: any;
  context?: 'user' | 'resource' | 'environment';
}

export interface AuthorizationContext {
  user: {
    id: string;
    email: string;
    roles: string[];
    attributes: Record<string, any>;
  };
  resource?: {
    id: string;
    type: string;
    attributes: Record<string, any>;
    ownerId?: string;
  };
  environment: {
    timestamp: Date;
    ip?: string;
    userAgent?: string;
    location?: string;
    [key: string]: any;
  };
}

export interface AuthorizationRequest {
  action: string;
  resource: string;
  context: AuthorizationContext;
}

export interface AuthorizationResult {
  allowed: boolean;
  reason?: string;
  matchedPermissions: Permission[];
  appliedConditions: AttributeCondition[];
}

export class ABACEngine {
  private static instance: ABACEngine;
  private permissionCache = new Map<string, Permission[]>();
  private roleCache = new Map<string, Role>();

  private constructor() {}

  static getInstance(): ABACEngine {
    if (!ABACEngine.instance) {
      ABACEngine.instance = new ABACEngine();
    }
    return ABACEngine.instance;
  }

  /**
   * Main authorization check method
   */
  async authorize(request: AuthorizationRequest): Promise<AuthorizationResult> {
    const { action, resource, context } = request;
    const matchedPermissions: Permission[] = [];
    const appliedConditions: AttributeCondition[] = [];

    try {
      // Get user permissions from roles
      const userPermissions = await this.getUserPermissions(context.user.id, context.user.roles);

      // Filter permissions for the requested resource and action
      const relevantPermissions = userPermissions.filter(permission => 
        permission.resource === resource && permission.action === action
      );

      if (relevantPermissions.length === 0) {
        return {
          allowed: false,
          reason: `No permissions found for action '${action}' on resource '${resource}'`,
          matchedPermissions: [],
          appliedConditions: []
        };
      }

      // Evaluate each permission's conditions
      for (const permission of relevantPermissions) {
        const conditionResult = await this.evaluateConditions(permission.conditions || [], context);
        
        if (conditionResult.allowed) {
          matchedPermissions.push(permission);
          appliedConditions.push(...conditionResult.conditions);
        }
      }

      const allowed = matchedPermissions.length > 0;

      return {
        allowed,
        reason: allowed ? 'Access granted' : 'Conditions not met for any applicable permissions',
        matchedPermissions,
        appliedConditions
      };

    } catch (error) {
      console.error('Authorization error:', error);
      return {
        allowed: false,
        reason: 'Authorization system error',
        matchedPermissions: [],
        appliedConditions: []
      };
    }
  }

  /**
   * Get all permissions for a user based on their roles
   */
  private async getUserPermissions(userId: string, userRoles: string[]): Promise<Permission[]> {
    const cacheKey = `user:${userId}:${userRoles.join(',')}`;
    
    if (this.permissionCache.has(cacheKey)) {
      return this.permissionCache.get(cacheKey)!;
    }

    try {
      if (!prisma) {
        // Fallback permissions for demo
        return this.getDemoPermissions(userRoles);
      }

      const roles = await prisma.role.findMany({
        where: {
          name: { in: userRoles }
        },
        include: {
          permissions: {
            include: {
              permission: true
            }
          }
        }
      });

      const permissions: Permission[] = [];
      const processedPermissions = new Set<string>();

      for (const role of roles) {
        // Add direct permissions
        for (const rolePermission of role.permissions) {
          const permission = rolePermission.permission;
          if (!processedPermissions.has(permission.id)) {
            permissions.push({
              id: permission.id,
              name: permission.name,
              resource: permission.resource,
              action: permission.action,
              conditions: (permission as any).conditions || []
            });
            processedPermissions.add(permission.id);
          }
        }

        // Handle role inheritance
        if ((role as any).inheritsFrom) {
          const inheritedPermissions = await this.getInheritedPermissions((role as any).inheritsFrom);
          for (const permission of inheritedPermissions) {
            if (!processedPermissions.has(permission.id)) {
              permissions.push(permission);
              processedPermissions.add(permission.id);
            }
          }
        }
      }

      // Cache for 5 minutes
      this.permissionCache.set(cacheKey, permissions);
      setTimeout(() => this.permissionCache.delete(cacheKey), 5 * 60 * 1000);

      return permissions;

    } catch (error) {
      console.error('Error fetching user permissions:', error);
      return this.getDemoPermissions(userRoles);
    }
  }

  /**
   * Get inherited permissions from parent roles
   */
  private async getInheritedPermissions(parentRoleIds: string[]): Promise<Permission[]> {
    if (!prisma) return [];

    const parentRoles = await prisma.role.findMany({
      where: {
        id: { in: parentRoleIds }
      },
      include: {
        permissions: {
          include: {
            permission: true
          }
        }
      }
    });

    const permissions: Permission[] = [];
    for (const role of parentRoles) {
      for (const rolePermission of role.permissions) {
        const permission = rolePermission.permission;
        permissions.push({
          id: permission.id,
          name: permission.name,
          resource: permission.resource,
          action: permission.action,
          conditions: (permission as any).conditions || []
        });
      }
    }

    return permissions;
  }

  /**
   * Evaluate attribute-based conditions
   */
  private async evaluateConditions(
    conditions: AttributeCondition[], 
    context: AuthorizationContext
  ): Promise<{ allowed: boolean; conditions: AttributeCondition[] }> {
    if (conditions.length === 0) {
      return { allowed: true, conditions: [] };
    }

    const appliedConditions: AttributeCondition[] = [];

    for (const condition of conditions) {
      const result = await this.evaluateCondition(condition, context);
      appliedConditions.push(condition);
      
      if (!result) {
        return { allowed: false, conditions: appliedConditions };
      }
    }

    return { allowed: true, conditions: appliedConditions };
  }

  /**
   * Evaluate a single attribute condition
   */
  private async evaluateCondition(condition: AttributeCondition, context: AuthorizationContext): Promise<boolean> {
    let attributeValue: any;

    // Get attribute value based on context
    switch (condition.context) {
      case 'user':
        attributeValue = this.getNestedValue(context.user.attributes, condition.attribute) || 
                       this.getNestedValue(context.user, condition.attribute);
        break;
      case 'resource':
        if (!context.resource) return false;
        attributeValue = this.getNestedValue(context.resource.attributes, condition.attribute) ||
                       this.getNestedValue(context.resource, condition.attribute);
        break;
      case 'environment':
        attributeValue = this.getNestedValue(context.environment, condition.attribute);
        break;
      default:
        // Try all contexts
        attributeValue = this.getNestedValue(context.user.attributes, condition.attribute) ||
                       this.getNestedValue(context.user, condition.attribute) ||
                       (context.resource && this.getNestedValue(context.resource.attributes, condition.attribute)) ||
                       (context.resource && this.getNestedValue(context.resource, condition.attribute)) ||
                       this.getNestedValue(context.environment, condition.attribute);
    }

    // Evaluate condition based on operator
    switch (condition.operator) {
      case 'equals':
        return attributeValue === condition.value;
      case 'not_equals':
        return attributeValue !== condition.value;
      case 'contains':
        return String(attributeValue).includes(String(condition.value));
      case 'not_contains':
        return !String(attributeValue).includes(String(condition.value));
      case 'greater_than':
        return Number(attributeValue) > Number(condition.value);
      case 'less_than':
        return Number(attributeValue) < Number(condition.value);
      case 'in':
        return Array.isArray(condition.value) && condition.value.includes(attributeValue);
      case 'not_in':
        return Array.isArray(condition.value) && !condition.value.includes(attributeValue);
      case 'exists':
        return attributeValue !== undefined && attributeValue !== null;
      case 'not_exists':
        return attributeValue === undefined || attributeValue === null;
      default:
        console.warn(`Unknown condition operator: ${condition.operator}`);
        return false;
    }
  }

  /**
   * Get nested object value by dot notation
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Demo permissions for fallback
   */
  private getDemoPermissions(roles: string[]): Permission[] {
    const permissions: Permission[] = [];

    if (roles.includes('ADMIN')) {
      permissions.push(
        { id: 'admin-all', name: 'Admin All', resource: '*', action: '*' },
        { id: 'admin-users', name: 'Manage Users', resource: 'users', action: '*' },
        { id: 'admin-roles', name: 'Manage Roles', resource: 'roles', action: '*' }
      );
    }

    if (roles.includes('EDITOR')) {
      permissions.push(
        { id: 'editor-content', name: 'Edit Content', resource: 'content', action: 'create' },
        { id: 'editor-content-update', name: 'Update Content', resource: 'content', action: 'update' },
        { id: 'editor-content-read', name: 'Read Content', resource: 'content', action: 'read' }
      );
    }

    if (roles.includes('VIEWER')) {
      permissions.push(
        { id: 'viewer-content', name: 'View Content', resource: 'content', action: 'read' },
        { id: 'viewer-profile', name: 'View Profile', resource: 'profile', action: 'read' }
      );
    }

    return permissions;
  }

  /**
   * Check if user owns a resource
   */
  async checkResourceOwnership(userId: string, resourceId: string, resourceType: string): Promise<boolean> {
    try {
      if (!prisma) return false;

      // This would need to be implemented based on your resource models
      // Example for content ownership:
      if (resourceType === 'content') {
        const content = await prisma.content?.findUnique({
          where: { id: resourceId },
          select: { authorId: true }
        });
        return content?.authorId === userId;
      }

      return false;
    } catch (error) {
      console.error('Error checking resource ownership:', error);
      return false;
    }
  }

  /**
   * Clear permission cache
   */
  clearCache(): void {
    this.permissionCache.clear();
    this.roleCache.clear();
  }

  /**
   * Create a derived role based on context
   */
  createDerivedRole(context: AuthorizationContext): string[] {
    const derivedRoles: string[] = [];

    // Add owner role if user owns the resource
    if (context.resource?.ownerId === context.user.id) {
      derivedRoles.push('OWNER');
    }

    // Add time-based roles
    const hour = context.environment.timestamp.getHours();
    if (hour >= 9 && hour <= 17) {
      derivedRoles.push('BUSINESS_HOURS_USER');
    }

    // Add location-based roles
    if (context.environment.location === 'internal') {
      derivedRoles.push('INTERNAL_USER');
    }

    return derivedRoles;
  }
}

// Export singleton instance
export const abacEngine = ABACEngine.getInstance();

// Convenience functions
export async function checkPermission(
  userId: string,
  userRoles: string[],
  action: string,
  resource: string,
  resourceContext?: any,
  environmentContext?: any
): Promise<boolean> {
  const context: AuthorizationContext = {
    user: {
      id: userId,
      email: '', // Would be populated from session
      roles: userRoles,
      attributes: {}
    },
    resource: resourceContext,
    environment: {
      timestamp: new Date(),
      ...environmentContext
    }
  };

  const result = await abacEngine.authorize({ action, resource, context });
  return result.allowed;
}

export async function checkResourceAccess(
  userId: string,
  userRoles: string[],
  action: string,
  resourceId: string,
  resourceType: string
): Promise<boolean> {
  // Get resource details if needed
  const resourceContext = {
    id: resourceId,
    type: resourceType,
    attributes: {},
    ownerId: undefined // Would be fetched from database
  };

  return checkPermission(userId, userRoles, action, resourceType, resourceContext);
}
