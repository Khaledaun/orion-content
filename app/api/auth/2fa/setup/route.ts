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
      config: RATE_LIMIT_CONFIGS.TWO_FACTOR_SETUP,
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
    const userEmail = session.user.email!;

    // Check if 2FA is already enabled
    if (prisma) {
      const existing2FA = await prisma.twoFactorAuth.findUnique({
        where: { userId },
      });

      if (existing2FA?.isEnabled) {
        return NextResponse.json(
          { error: "2FA is already enabled for this account" },
          { status: 400 },
        );
      }
    }

    // Generate 2FA secret and QR code
    const twoFactorData = await TwoFactorAuth.generateSecret(userEmail);

    // Store the secret temporarily (not enabled yet)
    if (prisma) {
      await prisma.twoFactorAuth.upsert({
        where: { userId },
        update: {
          secret: twoFactorData.secret,
          backupCodes: TwoFactorAuth.hashBackupCodes(twoFactorData.backupCodes),
          isEnabled: false,
        },
        create: {
          userId,
          secret: twoFactorData.secret,
          backupCodes: TwoFactorAuth.hashBackupCodes(twoFactorData.backupCodes),
          isEnabled: false,
        },
      });
    }

    // Log 2FA setup initiation
    await auditLogger.logAuth({
      userId,
      action: "2FA_SETUP_INITIATED",
      resource: "2fa",
      details: {
        userEmail,
      },
      ip: request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown",
      userAgent: request.headers.get("user-agent") || "unknown",
    });

    return NextResponse.json({
      qrCodeUrl: twoFactorData.qrCodeUrl,
      manualEntryKey: twoFactorData.manualEntryKey,
      backupCodes: twoFactorData.backupCodes,
    });
  } catch (error) {
    console.error("2FA setup error:", error);

    await auditLogger.logSecurity({
      action: "2FA_SETUP_ERROR",
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
