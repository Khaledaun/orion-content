
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/nextauth-enhanced';
import { roleManager } from '@/lib/rbac/role-manager';
import { checkPermission } from '@/lib/rbac/abac';
import { auditLogger } from '@/lib/security/audit-logger';
import { rateLimiter, RATE_LIMIT_CONFIGS, getClientIdentifier } from '@/lib/security/rate-limiter';

// GET /api/admin/users/[userId]/roles - Get user roles
export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    // Rate limiting
    const clientId = getClientIdentifier(request);
    const rateLimitResult = await rateLimiter.checkRateLimit({
      identifier: clientId,
      config: RATE_LIMIT_CONFIGS.API_GENERAL
    });

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const currentUserId = session.user.id;
    const userRoles = (session.user as any).roles || [];
    const { userId } = params;

    // Check permissions (can view own roles or admin can view any)
    const canViewRoles = currentUserId === userId || 
      await checkPermission(currentUserId, userRoles, 'read', 'user_roles');

    if (!canViewRoles) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Get user roles
    const roles = await roleManager.getUserRoles(userId);

    // Log access
    await auditLogger.logDataAccess({
      userId: currentUserId,
      action: 'GET_USER_ROLES',
      resource: 'user_roles',
      resourceId: userId,
      details: { targetUserId: userId, rolesCount: roles.length }
    });

    return NextResponse.json({ roles });

  } catch (error) {
    console.error('Get user roles error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/admin/users/[userId]/roles - Assign role to user
export async function POST(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    // Rate limiting
    const clientId = getClientIdentifier(request);
    const rateLimitResult = await rateLimiter.checkRateLimit({
      identifier: clientId,
      config: RATE_LIMIT_CONFIGS.API_STRICT
    });

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const currentUserId = session.user.id;
    const userRoles = (session.user as any).roles || [];
    const { userId } = params;

    // Check permissions
    const hasPermission = await checkPermission(
      currentUserId,
      userRoles,
      'create',
      'user_roles'
    );

    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Parse request body
    const { roleId, expiresAt } = await request.json();
    
    if (!roleId) {
      return NextResponse.json(
        { error: 'Role ID is required' },
        { status: 400 }
      );
    }

    // Assign role
    await roleManager.assignRoleToUser(
      userId,
      roleId,
      currentUserId,
      expiresAt ? new Date(expiresAt) : undefined
    );

    // Log assignment
    await auditLogger.logDataAccess({
      userId: currentUserId,
      action: 'ASSIGN_USER_ROLE',
      resource: 'user_roles',
      resourceId: `${userId}:${roleId}`,
      details: {
        targetUserId: userId,
        roleId,
        expiresAt
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Role assigned successfully'
    });

  } catch (error) {
    console.error('Assign role error:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        return NextResponse.json(
          { error: error.message },
          { status: 404 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/users/[userId]/roles - Remove role from user
export async function DELETE(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    // Rate limiting
    const clientId = getClientIdentifier(request);
    const rateLimitResult = await rateLimiter.checkRateLimit({
      identifier: clientId,
      config: RATE_LIMIT_CONFIGS.API_STRICT
    });

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const currentUserId = session.user.id;
    const userRoles = (session.user as any).roles || [];
    const { userId } = params;

    // Check permissions
    const hasPermission = await checkPermission(
      currentUserId,
      userRoles,
      'delete',
      'user_roles'
    );

    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Parse request body
    const { roleId } = await request.json();
    
    if (!roleId) {
      return NextResponse.json(
        { error: 'Role ID is required' },
        { status: 400 }
      );
    }

    // Remove role
    await roleManager.removeRoleFromUser(userId, roleId, currentUserId);

    // Log removal
    await auditLogger.logDataAccess({
      userId: currentUserId,
      action: 'REMOVE_USER_ROLE',
      resource: 'user_roles',
      resourceId: `${userId}:${roleId}`,
      details: {
        targetUserId: userId,
        roleId
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Role removed successfully'
    });

  } catch (error) {
    console.error('Remove role error:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        return NextResponse.json(
          { error: error.message },
          { status: 404 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
