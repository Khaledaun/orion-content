
import { prisma } from "@/app/lib/prisma";
import { abacEngine } from "./abac";

export interface RoleDefinition {
  id?: string;
  name: string;
  description?: string;
  permissions: string[];
  inheritsFrom?: string[];
  isSystem?: boolean;
  createdBy?: string;
}

export interface PermissionDefinition {
  id?: string;
  name: string;
  description?: string;
  resource: string;
  action: string;
  conditions?: any[];
  isSystem?: boolean;
}

export interface UserRoleAssignment {
  userId: string;
  roleId: string;
  assignedBy: string;
  assignedAt: Date;
  expiresAt?: Date;
  isActive: boolean;
}

export class RoleManager {
  private static instance: RoleManager;

  private constructor() {}

  static getInstance(): RoleManager {
    if (!RoleManager.instance) {
      RoleManager.instance = new RoleManager();
    }
    return RoleManager.instance;
  }

  /**
   * Create a new role
   */
  async createRole(roleData: RoleDefinition, createdBy: string): Promise<string> {
    if (!prisma) {
      throw new Error('Database not available');
    }

    try {
      const role = await prisma.role.create({
        data: {
          name: roleData.name.toUpperCase(),
          description: roleData.description,
          isSystem: roleData.isSystem || false,
          createdBy,
          inheritsFrom: roleData.inheritsFrom || []
        }
      });

      // Assign permissions to role
      if (roleData.permissions.length > 0) {
        const rolePermissions = roleData.permissions.map(permissionId => ({
          roleId: role.id,
          permissionId
        }));

        await prisma.rolePermission.createMany({
          data: rolePermissions
        });
      }

      // Clear cache
      abacEngine.clearCache();

      // Log audit event
      await this.logAuditEvent(createdBy, 'CREATE_ROLE', 'roles', role.id, {
        roleName: role.name,
        permissions: roleData.permissions
      });

      return role.id;
    } catch (error) {
      console.error('Error creating role:', error);
      throw new Error('Failed to create role');
    }
  }

  /**
   * Update an existing role
   */
  async updateRole(roleId: string, updates: Partial<RoleDefinition>, updatedBy: string): Promise<void> {
    if (!prisma) {
      throw new Error('Database not available');
    }

    try {
      const existingRole = await prisma.role.findUnique({
        where: { id: roleId },
        include: { permissions: true }
      });

      if (!existingRole) {
        throw new Error('Role not found');
      }

      if (existingRole.isSystem) {
        throw new Error('Cannot modify system roles');
      }

      // Update role basic info
      await prisma.role.update({
        where: { id: roleId },
        data: {
          name: updates.name?.toUpperCase() || existingRole.name,
          description: updates.description ?? existingRole.description,
          inheritsFrom: updates.inheritsFrom ?? (existingRole as any).inheritsFrom
        }
      });

      // Update permissions if provided
      if (updates.permissions) {
        // Remove existing permissions
        await prisma.rolePermission.deleteMany({
          where: { roleId }
        });

        // Add new permissions
        if (updates.permissions.length > 0) {
          const rolePermissions = updates.permissions.map(permissionId => ({
            roleId,
            permissionId
          }));

          await prisma.rolePermission.createMany({
            data: rolePermissions
          });
        }
      }

      // Clear cache
      abacEngine.clearCache();

      // Log audit event
      await this.logAuditEvent(updatedBy, 'UPDATE_ROLE', 'roles', roleId, {
        updates,
        previousPermissions: existingRole.permissions.map(p => p.permissionId)
      });

    } catch (error) {
      console.error('Error updating role:', error);
      throw error;
    }
  }

  /**
   * Delete a role
   */
  async deleteRole(roleId: string, deletedBy: string): Promise<void> {
    if (!prisma) {
      throw new Error('Database not available');
    }

    try {
      const role = await prisma.role.findUnique({
        where: { id: roleId }
      });

      if (!role) {
        throw new Error('Role not found');
      }

      if (role.isSystem) {
        throw new Error('Cannot delete system roles');
      }

      // Check if role is assigned to any users
      const userCount = await prisma.userRole.count({
        where: { roleId }
      });

      if (userCount > 0) {
        throw new Error(`Cannot delete role: assigned to ${userCount} users`);
      }

      // Delete role permissions
      await prisma.rolePermission.deleteMany({
        where: { roleId }
      });

      // Delete role
      await prisma.role.delete({
        where: { id: roleId }
      });

      // Clear cache
      abacEngine.clearCache();

      // Log audit event
      await this.logAuditEvent(deletedBy, 'DELETE_ROLE', 'roles', roleId, {
        roleName: role.name
      });

    } catch (error) {
      console.error('Error deleting role:', error);
      throw error;
    }
  }

  /**
   * Get all roles
   */
  async getRoles(includeSystem: boolean = true): Promise<any[]> {
    if (!prisma) {
      return this.getDemoRoles();
    }

    try {
      return await prisma.role.findMany({
        where: includeSystem ? {} : { isSystem: false },
        include: {
          permissions: {
            include: {
              permission: true
            }
          },
          _count: {
            select: {
              users: true
            }
          }
        },
        orderBy: [
          { isSystem: 'desc' },
          { name: 'asc' }
        ]
      });
    } catch (error) {
      console.error('Error fetching roles:', error);
      return this.getDemoRoles();
    }
  }

  /**
   * Get role by ID
   */
  async getRole(roleId: string): Promise<any | null> {
    if (!prisma) {
      return null;
    }

    try {
      return await prisma.role.findUnique({
        where: { id: roleId },
        include: {
          permissions: {
            include: {
              permission: true
            }
          },
          users: {
            include: {
              user: {
                select: {
                  id: true,
                  email: true,
                  name: true
                }
              }
            }
          }
        }
      });
    } catch (error) {
      console.error('Error fetching role:', error);
      return null;
    }
  }

  /**
   * Assign role to user
   */
  async assignRoleToUser(
    userId: string, 
    roleId: string, 
    assignedBy: string,
    expiresAt?: Date
  ): Promise<void> {
    if (!prisma) {
      throw new Error('Database not available');
    }

    try {
      // Check if role exists
      const role = await prisma.role.findUnique({
        where: { id: roleId }
      });

      if (!role) {
        throw new Error('Role not found');
      }

      // Check if user exists
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Check if assignment already exists
      const existingAssignment = await prisma.userRole.findUnique({
        where: {
          userId_roleId: {
            userId,
            roleId
          }
        }
      });

      if (existingAssignment) {
        // Update existing assignment
        await prisma.userRole.update({
          where: {
            userId_roleId: {
              userId,
              roleId
            }
          },
          data: {
            assignedBy,
            assignedAt: new Date(),
            expiresAt,
            isActive: true
          }
        });
      } else {
        // Create new assignment
        await prisma.userRole.create({
          data: {
            userId,
            roleId,
            assignedBy,
            assignedAt: new Date(),
            expiresAt,
            isActive: true
          }
        });
      }

      // Clear cache
      abacEngine.clearCache();

      // Log audit event
      await this.logAuditEvent(assignedBy, 'ASSIGN_ROLE', 'user_roles', `${userId}:${roleId}`, {
        userId,
        roleId,
        roleName: role.name,
        expiresAt
      });

    } catch (error) {
      console.error('Error assigning role to user:', error);
      throw error;
    }
  }

  /**
   * Remove role from user
   */
  async removeRoleFromUser(userId: string, roleId: string, removedBy: string): Promise<void> {
    if (!prisma) {
      throw new Error('Database not available');
    }

    try {
      const assignment = await prisma.userRole.findUnique({
        where: {
          userId_roleId: {
            userId,
            roleId
          }
        },
        include: {
          role: true
        }
      });

      if (!assignment) {
        throw new Error('Role assignment not found');
      }

      await prisma.userRole.delete({
        where: {
          userId_roleId: {
            userId,
            roleId
          }
        }
      });

      // Clear cache
      abacEngine.clearCache();

      // Log audit event
      await this.logAuditEvent(removedBy, 'REMOVE_ROLE', 'user_roles', `${userId}:${roleId}`, {
        userId,
        roleId,
        roleName: assignment.role.name
      });

    } catch (error) {
      console.error('Error removing role from user:', error);
      throw error;
    }
  }

  /**
   * Get user roles
   */
  async getUserRoles(userId: string): Promise<any[]> {
    if (!prisma) {
      return [];
    }

    try {
      const userRoles = await prisma.userRole.findMany({
        where: {
          userId,
          isActive: true,
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } }
          ]
        },
        include: {
          role: {
            include: {
              permissions: {
                include: {
                  permission: true
                }
              }
            }
          }
        }
      });

      return userRoles.map(ur => ur.role);
    } catch (error) {
      console.error('Error fetching user roles:', error);
      return [];
    }
  }

  /**
   * Create a permission
   */
  async createPermission(permissionData: PermissionDefinition, createdBy: string): Promise<string> {
    if (!prisma) {
      throw new Error('Database not available');
    }

    try {
      const permission = await prisma.permission.create({
        data: {
          name: permissionData.name,
          description: permissionData.description,
          resource: permissionData.resource,
          action: permissionData.action,
          conditions: permissionData.conditions || [],
          isSystem: permissionData.isSystem || false,
          createdBy
        }
      });

      // Clear cache
      abacEngine.clearCache();

      // Log audit event
      await this.logAuditEvent(createdBy, 'CREATE_PERMISSION', 'permissions', permission.id, {
        permissionName: permission.name,
        resource: permission.resource,
        action: permission.action
      });

      return permission.id;
    } catch (error) {
      console.error('Error creating permission:', error);
      throw new Error('Failed to create permission');
    }
  }

  /**
   * Get all permissions
   */
  async getPermissions(): Promise<any[]> {
    if (!prisma) {
      return [];
    }

    try {
      return await prisma.permission.findMany({
        orderBy: [
          { resource: 'asc' },
          { action: 'asc' },
          { name: 'asc' }
        ]
      });
    } catch (error) {
      console.error('Error fetching permissions:', error);
      return [];
    }
  }

  /**
   * Clean up expired role assignments
   */
  async cleanupExpiredAssignments(): Promise<number> {
    if (!prisma) {
      return 0;
    }

    try {
      const result = await prisma.userRole.updateMany({
        where: {
          expiresAt: { lt: new Date() },
          isActive: true
        },
        data: {
          isActive: false
        }
      });

      if (result.count > 0) {
        abacEngine.clearCache();
      }

      return result.count;
    } catch (error) {
      console.error('Error cleaning up expired assignments:', error);
      return 0;
    }
  }

  /**
   * Log audit event
   */
  private async logAuditEvent(
    userId: string,
    action: string,
    resource: string,
    resourceId: string,
    details: any
  ): Promise<void> {
    if (!prisma) return;

    try {
      await prisma.auditLog.create({
        data: {
          userId,
          action,
          resource,
          resourceId,
          details,
          timestamp: new Date()
        }
      });
    } catch (error) {
      console.error('Failed to log audit event:', error);
    }
  }

  /**
   * Demo roles for fallback
   */
  private getDemoRoles(): any[] {
    return [
      {
        id: 'admin-role',
        name: 'ADMIN',
        description: 'Full system access',
        isSystem: true,
        permissions: [
          { permission: { name: 'All Permissions', resource: '*', action: '*' } }
        ],
        _count: { users: 0 }
      },
      {
        id: 'editor-role',
        name: 'EDITOR',
        description: 'Content management access',
        isSystem: true,
        permissions: [
          { permission: { name: 'Edit Content', resource: 'content', action: 'create' } },
          { permission: { name: 'Update Content', resource: 'content', action: 'update' } },
          { permission: { name: 'Read Content', resource: 'content', action: 'read' } }
        ],
        _count: { users: 0 }
      },
      {
        id: 'viewer-role',
        name: 'VIEWER',
        description: 'Read-only access',
        isSystem: true,
        permissions: [
          { permission: { name: 'View Content', resource: 'content', action: 'read' } }
        ],
        _count: { users: 0 }
      }
    ];
  }
}

// Export singleton instance
export const roleManager = RoleManager.getInstance();
