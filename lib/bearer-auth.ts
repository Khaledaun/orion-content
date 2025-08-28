import { NextRequest } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export interface AuthResult {
  success: boolean
  user?: { id: string; email: string }
  error?: string
}

export async function authenticateBearer(req: NextRequest): Promise<AuthResult> {
  try {
    // Get Authorization header
    const authHeader = req.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { success: false, error: 'Missing or invalid Bearer token format' }
    }

    // Extract token
    const token = authHeader.slice(7).trim()
    if (!token) {
      return { success: false, error: 'Empty Bearer token' }
    }

    // Find stored token in database
    const connection = await prisma.connection.findFirst({
      where: { kind: 'console_api_token' }
    })

    if (!connection) {
      return { success: false, error: 'No API token registered. Use /api/setup/secrets to register.' }
    }

    // Parse stored token data
    let storedData
    try {
      storedData = JSON.parse(connection.dataEnc)
    } catch (error) {
      return { success: false, error: 'Invalid stored token format' }
    }

    // Verify token match
    if (storedData.token !== token) {
      return { success: false, error: 'Invalid Bearer token' }
    }

    // Get admin user (for API access, we use the first admin user)
    const adminUser = await prisma.user.findFirst({
      where: {
        email: process.env.ADMIN_EMAIL || 'john@doe.com'
      }
    })

    if (!adminUser) {
      // Fallback to any user if admin not found
      const anyUser = await prisma.user.findFirst({
        orderBy: { createdAt: 'asc' }
      })
      
      if (!anyUser) {
        return { success: false, error: 'No users found in system' }
      }

      return { 
        success: true, 
        user: { id: anyUser.id, email: anyUser.email }
      }
    }

    return { 
      success: true, 
      user: { id: adminUser.id, email: adminUser.email }
    }

  } catch (error) {
    console.error('Bearer authentication error:', error)
    return { success: false, error: 'Authentication system error' }
  } finally {
    await prisma.$disconnect()
  }
}
