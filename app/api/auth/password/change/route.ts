
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/nextauth-enhanced';
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
      config: RATE_LIMIT_CONFIGS.AUTH_PASSWORD_RESET
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

    const { currentPassword, newPassword } = await request.json();
    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: 'Current password and new password are required' },
        { status: 400 }
      );
    }

    // Validate new password
    const passwordValidation = PasswordManager.validatePassword(newPassword);
    if (!passwordValidation.isValid) {
      return NextResponse.json(
        { 
          error: 'Password does not meet requirements',
          details: passwordValidation.errors
        },
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

    // Get user
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Verify current password
    const passwordHash = (user as any).passwordHash || (user as any).hashedPassword;
    if (!passwordHash || !await PasswordManager.verifyPassword(currentPassword, passwordHash)) {
      await auditLogger.logSecurity({
        userId,
        action: 'PASSWORD_CHANGE_FAILED',
        resource: 'auth',
        details: { reason: 'invalid_current_password' },
        ip: request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown'
      });

      return NextResponse.json(
        { error: 'Current password is incorrect' },
        { status: 400 }
      );
    }

    // Check if new password is different from current
    if (await PasswordManager.verifyPassword(newPassword, passwordHash)) {
      return NextResponse.json(
        { error: 'New password must be different from current password' },
        { status: 400 }
      );
    }

    // Hash new password
    const newPasswordHash = await PasswordManager.hashPassword(newPassword);

    // Update password
    await prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: newPasswordHash,
        passwordChangedAt: new Date()
      }
    });

    // Log successful password change
    await auditLogger.logAuth({
      userId,
      action: 'PASSWORD_CHANGED',
      resource: 'auth',
      details: {},
      ip: request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown'
    });

    return NextResponse.json({
      success: true,
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.error('Password change error:', error);
    
    await auditLogger.logSecurity({
      action: 'PASSWORD_CHANGE_ERROR',
      resource: 'auth',
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
