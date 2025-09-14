
import { NextRequest, NextResponse } from 'next/server';
import { PasswordManager } from '@/lib/auth/password';
import { TokenManager } from '@/lib/auth/token';
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

    const { email } = await request.json();
    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    if (!prisma) {
      return NextResponse.json(
        { error: 'Database not available' },
        { status: 503 }
      );
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    });

    // Always return success to prevent email enumeration
    const successResponse = {
      success: true,
      message: 'If an account with that email exists, a password reset link has been sent.'
    };

    if (!user) {
      // Log attempted reset for non-existent user
      await auditLogger.logSecurity({
        action: 'PASSWORD_RESET_NONEXISTENT_USER',
        resource: 'auth',
        details: { email: normalizedEmail },
        ip: request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown'
      });

      return NextResponse.json(successResponse);
    }

    // Generate reset token
    const resetData = PasswordManager.generateResetToken();

    // Store reset token in database
    await prisma.passwordReset.upsert({
      where: { userId: user.id },
      update: {
        token: resetData.hashedToken,
        expiresAt: resetData.expiresAt,
        createdAt: new Date()
      },
      create: {
        userId: user.id,
        token: resetData.hashedToken,
        expiresAt: resetData.expiresAt
      }
    });

    // TODO: Send email with reset link
    // const resetUrl = `${process.env.NEXTAUTH_URL}/auth/reset-password?token=${resetData.token}`;
    // await sendPasswordResetEmail(user.email, resetUrl);

    // Log password reset request
    await auditLogger.logAuth({
      userId: user.id,
      action: 'PASSWORD_RESET_REQUESTED',
      resource: 'auth',
      details: {
        email: normalizedEmail,
        expiresAt: resetData.expiresAt.toISOString()
      },
      ip: request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown'
    });

    return NextResponse.json(successResponse);

  } catch (error) {
    console.error('Password reset error:', error);
    
    await auditLogger.logSecurity({
      action: 'PASSWORD_RESET_ERROR',
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
