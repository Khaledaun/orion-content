import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/nextauth-enhanced";
import { TwoFactorAuth } from "@/lib/auth/2fa";
import { prisma } from "@/app/lib/prisma";
import { auditLogger } from "@/lib/security/audit-logger";
import {
  rateLimiter,
  RATE_LIMIT_CONFIGS,
  getClientIdentifier,
} from "@/lib/security/rate-limiter";

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const clientId = getClientIdentifier(request);
    const rateLimitResult = await rateLimiter.checkRateLimit({
      identifier: clientId,
      config: RATE_LIMIT_CONFIGS.TWO_FACTOR_VERIFY,
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

    const { token } = await request.json();
    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 });
    }

    const userId = session.user.id;

    // Get 2FA data
    if (!prisma) {
      return NextResponse.json(
        { error: "Database not available" },
        { status: 503 },
      );
    }

    const twoFactorAuth = await prisma.twoFactorAuth.findUnique({
      where: { userId },
    });

    if (!twoFactorAuth?.secret) {
      return NextResponse.json(
        { error: "2FA not set up for this account" },
        { status: 400 },
      );
    }

    // Verify the token
    const verification = TwoFactorAuth.verifyTokenOrBackupCode(
      token,
      twoFactorAuth.secret,
      twoFactorAuth.backupCodes || [],
    );

    if (!verification.isValid) {
      // Log failed verification
      await auditLogger.logSecurity({
        userId,
        action: "2FA_VERIFICATION_FAILED",
        resource: "2fa",
        details: {
          token: token.substring(0, 2) + "****", // Partial token for logging
        },
        ip: request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown",
        userAgent: request.headers.get("user-agent") || "unknown",
      });

      return NextResponse.json({ error: "Invalid token" }, { status: 400 });
    }

    // Enable 2FA if this is the first successful verification
    if (!twoFactorAuth.isEnabled) {
      await prisma.twoFactorAuth.update({
        where: { userId },
        data: { isEnabled: true },
      });
    }

    // If backup code was used, remove it from the list
    if (verification.usedBackupCode) {
      const updatedBackupCodes =
        twoFactorAuth.backupCodes?.filter(
          (code: string) =>
            !TwoFactorAuth.verifyBackupCode(verification.usedBackupCode!, [
              code,
            ]),
        ) || [];

      await prisma.twoFactorAuth.update({
        where: { userId },
        data: { backupCodes: updatedBackupCodes },
      });
    }

    // Log successful verification
    await auditLogger.logAuth({
      userId,
      action: "2FA_VERIFICATION_SUCCESS",
      resource: "2fa",
      details: {
        usedBackupCode: !!verification.usedBackupCode,
        isFirstTime: !twoFactorAuth.isEnabled,
      },
      ip: request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown",
      userAgent: request.headers.get("user-agent") || "unknown",
    });

    return NextResponse.json({
      success: true,
      message: "2FA verified successfully",
      backupCodeUsed: !!verification.usedBackupCode,
    });
  } catch (error) {
    console.error("2FA verification error:", error);

    await auditLogger.logSecurity({
      action: "2FA_VERIFICATION_ERROR",
      resource: "2fa",
      details: {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      ip: request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown",
      userAgent: request.headers.get("user-agent") || "unknown",
    });

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
