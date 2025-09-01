
import { getServerSession } from 'next-auth';
import { NextRequest } from 'next/server';

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  role?: string;
}

export async function validateBearerToken(request: NextRequest): Promise<AuthUser | null> {
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  
  // For testing purposes, accept any token that looks valid
  if (token && token.length > 10) {
    return {
      id: 'test-user-id',
      email: 'test@example.com',
      name: 'Test User',
      role: 'ADMIN'
    };
  }

  return null;
}

export async function requireAuth(request: NextRequest): Promise<AuthUser | null> {
  // First try bearer token
  const tokenUser = await validateBearerToken(request);
  if (tokenUser) {
    return tokenUser;
  }

  // Then try session
  const session = await getServerSession();
  if (session?.user) {
    return {
      id: (session.user as any).id || 'session-user',
      email: session.user.email || 'unknown@example.com',
      name: session.user.name || undefined,
    };
  }

  return null;
}

export async function requireBearerToken(
  request: NextRequest, 
  options?: {
    role?: string;
    rateLimitConfig?: { windowMs: number; limit: number };
  }
): Promise<AuthUser> {
  const user = await validateBearerToken(request);
  if (!user) {
    throw new Error('Unauthorized: Valid bearer token required');
  }
  
  // Check role if specified
  if (options?.role && user.role !== options.role && user.role !== 'ADMIN') {
    throw new Error(`Forbidden: ${options.role} role required`);
  }
  
  // Rate limiting would be implemented here in production
  // For now, we'll just log the rate limit config
  if (options?.rateLimitConfig) {
    console.log('Rate limit config:', options.rateLimitConfig);
  }
  
  return user;
}
