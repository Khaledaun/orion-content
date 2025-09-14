import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/nextauth-enhanced";
import { roleManager } from "@/lib/rbac/role-manager";
import { checkPermission } from "@/lib/rbac/abac";
import { auditLogger } from "@/lib/security/audit-logger";
import {
  rateLimiter,
  RATE_LIMIT_CONFIGS,
  getClientIdentifier,
} from "@/lib/security/rate-limiter";

// GET /api/admin/roles/[roleId] - Get role details
export async function GET(
  request: NextRequest,
  { params }: { params: { roleId: string } },
) {
  try {
    // Rate limiting
    const clientId = getClientIdentifier(request);
    const rateLimitResult = await rateLimiter.checkRateLimit({
      identifier: clientId,
      config: RATE_LIMIT_CONFIGS.API_GENERAL,
    });

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 },
      );
    }

    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const userRoles = (session.user as any).roles || [];

    // Check permissions
    const hasPermission = await checkPermission(
      userId,
      userRoles,
      "read",
      "roles",
    );

    if (!hasPermission) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 },
      );
    }

    const { roleId } = params;

    // Get role
    const role = await roleManager.getRole(roleId);
    if (!role) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 });
    }

    // Log access
    await auditLogger.logDataAccess({
      userId,
      action: "GET_ROLE",
      resource: "roles",
      resourceId: roleId,
      details: { roleName: role.name },
    });

    return NextResponse.json({ role });
  } catch (error) {
    console.error("Get role error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// PUT /api/admin/roles/[roleId] - Update role
export async function PUT(
  request: NextRequest,
  { params }: { params: { roleId: string } },
) {
  try {
    // Rate limiting
    const clientId = getClientIdentifier(request);
    const rateLimitResult = await rateLimiter.checkRateLimit({
      identifier: clientId,
      config: RATE_LIMIT_CONFIGS.API_STRICT,
    });

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 },
      );
    }

    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const userRoles = (session.user as any).roles || [];

    // Check permissions
    const hasPermission = await checkPermission(
      userId,
      userRoles,
      "update",
      "roles",
    );

    if (!hasPermission) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 },
      );
    }

    const { roleId } = params;
    const updates = await request.json();

    // Update role
    await roleManager.updateRole(roleId, updates, userId);

    // Log update
    await auditLogger.logDataAccess({
      userId,
      action: "UPDATE_ROLE",
      resource: "roles",
      resourceId: roleId,
      details: { updates },
    });

    return NextResponse.json({
      success: true,
      message: "Role updated successfully",
    });
  } catch (error) {
    console.error("Update role error:", error);

    if (error instanceof Error) {
      if (error.message.includes("not found")) {
        return NextResponse.json({ error: "Role not found" }, { status: 404 });
      }
      if (error.message.includes("system role")) {
        return NextResponse.json(
          { error: "Cannot modify system roles" },
          { status: 400 },
        );
      }
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// DELETE /api/admin/roles/[roleId] - Delete role
export async function DELETE(
  request: NextRequest,
  { params }: { params: { roleId: string } },
) {
  try {
    // Rate limiting
    const clientId = getClientIdentifier(request);
    const rateLimitResult = await rateLimiter.checkRateLimit({
      identifier: clientId,
      config: RATE_LIMIT_CONFIGS.API_STRICT,
    });

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 },
      );
    }

    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const userRoles = (session.user as any).roles || [];

    // Check permissions
    const hasPermission = await checkPermission(
      userId,
      userRoles,
      "delete",
      "roles",
    );

    if (!hasPermission) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 },
      );
    }

    const { roleId } = params;

    // Delete role
    await roleManager.deleteRole(roleId, userId);

    // Log deletion
    await auditLogger.logDataAccess({
      userId,
      action: "DELETE_ROLE",
      resource: "roles",
      resourceId: roleId,
      details: {},
    });

    return NextResponse.json({
      success: true,
      message: "Role deleted successfully",
    });
  } catch (error) {
    console.error("Delete role error:", error);

    if (error instanceof Error) {
      if (error.message.includes("not found")) {
        return NextResponse.json({ error: "Role not found" }, { status: 404 });
      }
      if (error.message.includes("system role")) {
        return NextResponse.json(
          { error: "Cannot delete system roles" },
          { status: 400 },
        );
      }
      if (error.message.includes("assigned to")) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
