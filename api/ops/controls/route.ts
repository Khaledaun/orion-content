
import { NextRequest, NextResponse } from 'next/server'
import { requireBearerToken } from '@/lib/enhanced-auth'
import { getAuditLogger } from '@/lib/audit-prod'
import { getRedisStore } from '@/lib/redis-store'
import { getPrismaClient } from "@/lib/prisma";

export const dynamic = 'force-dynamic'

interface ControlAction {
  action: 'disable_enforcement' | 'enable_enforcement' | 'set_dry_run' | 'emergency_rollback'
  duration?: number // minutes
  reason?: string
  targetVersion?: number
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireBearerToken(request, {
      role: 'admin',
      rateLimitConfig: { windowMs: 300000, limit: 10 } // 10 operations per 5 minutes
    })

    const body: ControlAction = await request.json()
    const auditLogger = getAuditLogger()
    const redisStore = getRedisStore()

    // Validate action
    const validActions = ['disable_enforcement', 'enable_enforcement', 'set_dry_run', 'emergency_rollback']
    if (!validActions.includes(body.action)) {
      return NextResponse.json(
        { error: 'Invalid action' },
        { status: 400 }
      )
    }

    let result: any = {}

    switch (body.action) {
      case 'disable_enforcement':
        result = await disableEnforcement(body.duration, body.reason)
        break
      case 'enable_enforcement':
        result = await enableEnforcement()
        break
      case 'set_dry_run':
        result = await setDryRunMode(body.duration, body.reason)
        break
      case 'emergency_rollback':
        if (!body.targetVersion) {
          return NextResponse.json(
            { error: 'Target version required for rollback' },
            { status: 400 }
          )
        }
        result = await emergencyRollback(body.targetVersion, body.reason)
        break
    }

    // Audit log the control action
    await auditLogger.log({
      action: `ops_control_${body.action}`,
      actor: user.id,
      route: '/api/ops/controls',
      success: result.success,
      metadata: {
        action: body.action,
        duration: body.duration,
        reason: body.reason,
        targetVersion: body.targetVersion,
        result
      }
    })

    return NextResponse.json(result)

  } catch (error) {
    if (error instanceof NextResponse) {
      return error
    }
    
    console.error('Ops controls error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function disableEnforcement(durationMinutes?: number, reason?: string) {
  const redisStore = getRedisStore()
  
  try {
    const config = {
      disabled: true,
      disabledAt: new Date().toISOString(),
      reason: reason || 'Manual disable via ops dashboard',
      expiresAt: durationMinutes 
        ? new Date(Date.now() + durationMinutes * 60 * 1000).toISOString()
        : null
    }

    const ttl = durationMinutes ? durationMinutes * 60 : undefined
    if (ttl) {
  await redisStore.set('enforcement_disabled', JSON.stringify(config), ttl)
    } else {
      await redisStore.set('enforcement_disabled', JSON.stringify(config))
    }

    console.warn('ENFORCEMENT_DISABLED:', config)

    return {
      success: true,
      message: 'Quality enforcement disabled',
      config,
      expiresInMinutes: durationMinutes || null
    }
  } catch (error) {
    return {
      success: false,
      error: 'Failed to disable enforcement'
    }
  }
}

async function enableEnforcement() {
  const redisStore = getRedisStore()
  
  try {
    await redisStore.del('enforcement_disabled')

    console.info('ENFORCEMENT_ENABLED: Quality enforcement re-enabled')

    return {
      success: true,
      message: 'Quality enforcement enabled'
    }
  } catch (error) {
    return {
      success: false,
      error: 'Failed to enable enforcement'
    }
  }
}

async function setDryRunMode(durationMinutes?: number, reason?: string) {
  const redisStore = getRedisStore()
  
  try {
    const config = {
      dryRun: true,
      enabledAt: new Date().toISOString(),
      reason: reason || 'Dry run mode enabled via ops dashboard',
      expiresAt: durationMinutes 
        ? new Date(Date.now() + durationMinutes * 60 * 1000).toISOString()
        : null
    }

    const ttl = durationMinutes ? durationMinutes * 60 : undefined
    if (ttl) {
  await redisStore.set('dry_run_mode', JSON.stringify(config), ttl)
    } else {
      await redisStore.set('dry_run_mode', JSON.stringify(config))
    }

    console.warn('DRY_RUN_ENABLED:', config)

    return {
      success: true,
      message: 'Dry run mode enabled - no WordPress pushes will occur',
      config,
      expiresInMinutes: durationMinutes || null
    }
  } catch (error) {
    return {
      success: false,
      error: 'Failed to enable dry run mode'
    }
  }
}

async function emergencyRollback(targetVersion: number, reason?: string) {
  const prisma = await getPrismaClient();
  try {
    // Find the target version
    const targetRulebook = await prisma.rulebookVersion.findFirst({
      where: { version: targetVersion }
    })

    if (!targetRulebook) {
      return {
        success: false,
        error: `Rulebook version ${targetVersion} not found`
      }
    }

    // Get current active version
    const currentRulebook = await prisma.globalRulebook.findFirst({
      orderBy: { version: 'desc' }
    })

    // Create new active rulebook with rolled-back rules
    const rollbackRulebook = await prisma.globalRulebook.create({
      data: {
        version: (currentRulebook?.version || 0) + 1,
        rules: targetRulebook.rules as any,
        sources: targetRulebook.sources as any,
        updatedBy: 'emergency_rollback'
      }
    })

    // Record the rollback in version history
    await prisma.rulebookVersion.create({
      data: {
        version: rollbackRulebook.version,
        rules: targetRulebook.rules as any,
        sources: targetRulebook.sources as any,
        notes: `Emergency rollback to v${targetVersion}. Reason: ${reason || 'Manual rollback via ops dashboard'}`
      }
    })

    console.warn('EMERGENCY_ROLLBACK:', {
      fromVersion: currentRulebook?.version,
      toVersion: targetVersion,
      newActiveVersion: rollbackRulebook.version,
      reason
    })

    return {
      success: true,
      message: `Emergency rollback completed`,
      rollback: {
        fromVersion: currentRulebook?.version || 'unknown',
        rolledBackToVersion: targetVersion,
        newActiveVersion: rollbackRulebook.version,
        reason: reason || 'Manual rollback'
      }
    }

  } catch (error) {
    return {
      success: false,
      error: `Rollback failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  }
}

// GET endpoint to check current control states
export async function GET(request: NextRequest) {
  try {
    const user = await requireBearerToken(request, {
      role: 'admin',
      rateLimitConfig: { windowMs: 60000, limit: 30 }
    })

    const redisStore = getRedisStore()
    const states = {
      enforcementDisabled: false,
      dryRunMode: false,
      disabledConfig: null,
      dryRunConfig: null
    }

    const disabledConfig = await redisStore.get('enforcement_disabled')
    const dryRunConfig = await redisStore.get('dry_run_mode')

    if (disabledConfig) {
      states.enforcementDisabled = true
      states.disabledConfig = JSON.parse(disabledConfig)
    }

    if (dryRunConfig) {
      states.dryRunMode = true
      states.dryRunConfig = JSON.parse(dryRunConfig)
    }

    return NextResponse.json(states)

  } catch (error) {
    if (error instanceof NextResponse) {
      return error
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
