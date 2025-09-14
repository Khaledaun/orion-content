
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/nextauth-enhanced';
import { TwoFactorAuth } from '@/lib/auth/2fa';
import { PasswordManager } from '@/lib/auth/password';
import { prisma } from '@/app/lib/prisma';
import { auditLogger } from '@/lib/security/audit-logger';
import { rateLimiter, RATE_LIMIT_CONFIGS, getClientIdentifier } from '@/lib/security/rate-limiter';

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const clientId = getClientIdentifier(request);
    const rateLimitResult = await rateLimiter.checkRateLimit({
      identifier: clientId,
      config: RATE_LIMIT_CONFIGS.TWO_FACTOR_VERIFY
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

    const { password, token } = await request.json();
    if (!password || !token) {
      return NextResponse.json(
        { error: 'Password and 2FA token are required' },
        { status: 400 }
      );
    }

    const userId = session.user.id;

    if (!prisma) {
      return NextResponse.json(
        { error: 'Database not available' },
        { status: 503 }
      );
    }

    // Get user and 2FA data
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { twoFactorAuth: true }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    if (!user.twoFactorAuth?.isEnabled) {
      return NextResponse.json(
        { error: '2FA is not enabled for this account' },
        { status: 400 }
      );
    }

    // Verify password
    const passwordHash = (user as any).passwordHash || (user as any).hashedPassword;
    if (!passwordHash || !await PasswordManager.verifyPassword(password, passwordHash)) {
      await auditLogger.logSecurity({
        userId,
        action: '2FA_DISABLE_FAILED_PASSWORD',
        resource: '2fa',
        details: {},
        ip: request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown'
      });

      return NextResponse.json(
        { error: 'Invalid password' },
        { status: 400 }
      );
    }

    // Verify 2FA token
    const verification = TwoFactorAuth.verifyTokenOrBackupCode(
      token,
      user.twoFactorAuth.secret,
      user.twoFactorAuth.backupCodes || []
    );

    if (!verification.isValid) {
      await auditLogger.logSecurity({
        userId,
        action: '2FA_DISABLE_FAILED_TOKEN',
        resource: '2fa',
        details: {},
        ip: request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown'
      });

      return NextResponse.json(
        { error: 'Invalid 2FA token' },
        { status: 400 }
      );
    }

    // Disable 2FA
    await prisma.twoFactorAuth.update({
      where: { userId },
      data: {
        isEnabled: false,
        secret: null,
        backupCodes: []
      }
    });

    // Log successful 2FA disable
    await auditLogger.logAuth({
      userId,
      action: '2FA_DISABLED',
      resource: '2fa',
      details: {},
      ip: request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown'
    });

    return NextResponse.json({
      success: true,
      message: '2FA has been disabled successfully'
    });

  } catch (error) {
    console.error('2FA disable error:', error);
    
    await auditLogger.logSecurity({
      action: '2FA_DISABLE_ERROR',
      resource: '2fa',
      details: {
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      ip: request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown'
    });

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
