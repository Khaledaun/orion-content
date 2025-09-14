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

// GET /api/admin/roles - List all roles
export async function GET(request: NextRequest) {
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

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const includeSystem = searchParams.get("includeSystem") === "true";

    // Get roles
    const roles = await roleManager.getRoles(includeSystem);

    // Log access
    await auditLogger.logDataAccess({
      userId,
      action: "LIST_ROLES",
      resource: "roles",
      details: { includeSystem, count: roles.length },
    });

    return NextResponse.json({ roles });
  } catch (error) {
    console.error("Get roles error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// POST /api/admin/roles - Create a new role
export async function POST(request: NextRequest) {
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
      "create",
      "roles",
    );

    if (!hasPermission) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 },
      );
    }

    // Parse request body
    const roleData = await request.json();

    // Validate required fields
    if (!roleData.name) {
      return NextResponse.json(
        { error: "Role name is required" },
        { status: 400 },
      );
    }

    if (!Array.isArray(roleData.permissions)) {
      return NextResponse.json(
        { error: "Permissions must be an array" },
        { status: 400 },
      );
    }

    // Create role
    const roleId = await roleManager.createRole(roleData, userId);

    // Log creation
    await auditLogger.logDataAccess({
      userId,
      action: "CREATE_ROLE",
      resource: "roles",
      resourceId: roleId,
      details: {
        roleName: roleData.name,
        permissions: roleData.permissions,
      },
    });

    return NextResponse.json(
      {
        success: true,
        roleId,
        message: "Role created successfully",
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Create role error:", error);

    if (error instanceof Error && error.message.includes("already exists")) {
      return NextResponse.json(
        { error: "Role with this name already exists" },
        { status: 409 },
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
