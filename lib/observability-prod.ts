
import { getRedisStore } from './redis-store'
import { getAuditLogger } from './audit-prod'

export interface StageMetrics {
  stage: string
  model: string
  tokensInput: number
  tokensOutput: number
  latencyMs: number
  costUsd: number
  success: boolean
  error?: string
  provider?: 'openai' | 'perplexity' | 'internal'
}

export interface ObservabilityReport {
  pipelineId: string
  siteId: string
  contentTitle: string
  totalLatencyMs: number
  totalCostUsd: number
  totalTokens: number
  stages: StageMetrics[]
  qualityScore?: number
  flags: Record<string, any>
  createdAt: string
  metadata?: Record<string, any>
}

export interface CostMetrics {
  totalCost: number
  costByProvider: Record<string, number>
  costByModel: Record<string, number>
  tokenUsage: number
  averageLatency: number
  successRate: number
}

// Enhanced observability with Redis persistence and analytics
export class ProductionObservabilityTracker {
  private stages: StageMetrics[] = []
  private startTime: number = Date.now()
  private redisStore = getRedisStore()
  private auditLogger = getAuditLogger()
  
  constructor(
    private pipelineId: string,
    private siteId: string,
    private contentTitle: string
  ) {}
  
  startStage(stageName: string): ProductionStageTracker {
    return new ProductionStageTracker(stageName, (metrics) => {
      this.stages.push(metrics)
    })
  }
  
  async finalize(
    qualityScore?: number, 
    flags: Record<string, any> = {},
    metadata?: Record<string, any>
  ): Promise<ObservabilityReport> {
    const totalLatency = Date.now() - this.startTime
    const totalCost = this.stages.reduce((sum, stage) => sum + stage.costUsd, 0)
    const totalTokens = this.stages.reduce((sum, stage) => sum + stage.tokensInput + stage.tokensOutput, 0)
    
    const report: ObservabilityReport = {
      pipelineId: this.pipelineId,
      siteId: this.siteId,
      contentTitle: this.redactSensitive(this.contentTitle),
      totalLatencyMs: totalLatency,
      totalCostUsd: totalCost,
      totalTokens,
      stages: this.stages.map(stage => ({
        ...stage,
        error: stage.error ? this.redactSensitive(stage.error) : undefined
      })),
      qualityScore,
      flags,
      createdAt: new Date().toISOString(),
      metadata: metadata ? this.redactSensitive(metadata) : undefined
    }
    
    // Log structured observability data
    console.log('OBSERVABILITY_REPORT:', JSON.stringify(report, null, 2))
    
    // Store in Redis for analytics
    if (this.redisStore.isAvailable()) {
      await this.storeReport(report)
    }
    
    // Audit log the pipeline completion
    await this.auditLogger.log({
      route: '/pipeline/observability',
      actor: 'system',
      action: 'pipeline_completed',
      metadata: {
        pipelineId: this.pipelineId,
        siteId: this.siteId,
        totalCost,
        totalLatency,
        qualityScore,
        stageCount: this.stages.length
      },
      success: this.stages.every(s => s.success),
      latencyMs: totalLatency,
      cost: totalCost
    })
    
    return report
  }
  
  private async storeReport(report: ObservabilityReport): Promise<void> {
    try {
      const reportKey = `observability:${report.pipelineId}`
      const reportJson = JSON.stringify(report)
      
      // Store individual report
      await this.redisStore.set(reportKey, reportJson, 24 * 3600) // Keep for 24 hours
      
      // Add to time series for analytics
      const dayKey = `observability_day:${new Date().toISOString().substring(0, 10)}`
      await this.redisStore.zadd(dayKey, Date.now(), report.pipelineId)
      await this.redisStore.expire(dayKey, 30 * 24 * 3600) // Keep for 30 days
      
      // Site-specific metrics
      const siteKey = `observability_site:${report.siteId}`
      await this.redisStore.zadd(siteKey, Date.now(), report.pipelineId)
      await this.redisStore.expire(siteKey, 7 * 24 * 3600) // Keep for 7 days
      
      // Cost tracking
      await this.updateCostMetrics(report)
      
    } catch (error) {
      console.error('Failed to store observability report:', error)
    }
  }
  
  private async updateCostMetrics(report: ObservabilityReport): Promise<void> {
    const today = new Date().toISOString().substring(0, 10)
    const costKey = `cost_metrics:${today}`
    
    try {
      // Increment daily cost
      const currentCostStr = await this.redisStore.get(`${costKey}:total`) || '0'
      const newTotal = parseFloat(currentCostStr) + report.totalCostUsd
      await this.redisStore.set(`${costKey}:total`, newTotal.toString(), 30 * 24 * 3600)
      
      // Update provider costs
      const providerCosts: Record<string, number> = {}
      report.stages.forEach(stage => {
        if (stage.provider) {
          providerCosts[stage.provider] = (providerCosts[stage.provider] || 0) + stage.costUsd
        }
      })
      
      for (const [provider, cost] of Object.entries(providerCosts)) {
        const providerKey = `${costKey}:provider:${provider}`
        const currentStr = await this.redisStore.get(providerKey) || '0'
        const newProviderTotal = parseFloat(currentStr) + cost
        await this.redisStore.set(providerKey, newProviderTotal.toString(), 30 * 24 * 3600)
      }
      
      // Update token usage
      const tokenKey = `${costKey}:tokens`
      const currentTokensStr = await this.redisStore.get(tokenKey) || '0'
      const newTokenTotal = parseInt(currentTokensStr) + report.totalTokens
      await this.redisStore.set(tokenKey, newTokenTotal.toString(), 30 * 24 * 3600)
      
    } catch (error) {
      console.error('Failed to update cost metrics:', error)
    }
  }
  
  private redactSensitive(obj: any): any {
    if (typeof obj === 'string') {
      return obj
        .replace(/Bearer\s+[A-Za-z0-9+/=_-]+/gi, 'Bearer [REDACTED]')
        .replace(/sk-[A-Za-z0-9]{48,}/gi, '[REDACTED_API_KEY]')
        .replace(/pplx-[A-Za-z0-9]{32,}/gi, '[REDACTED_API_KEY]')
    }
    
    if (typeof obj === 'object' && obj !== null) {
      const result: any = Array.isArray(obj) ? [] : {}
      for (const [key, value] of Object.entries(obj)) {
        if (key.toLowerCase().includes('key') || key.toLowerCase().includes('token')) {
          result[key] = '[REDACTED]'
        } else {
          result[key] = this.redactSensitive(value)
        }
      }
      return result
    }
    
    return obj
  }
}

export class ProductionStageTracker {
  private startTime: number = Date.now()
  
  constructor(
    private stageName: string,
    private onComplete: (metrics: StageMetrics) => void
  ) {}
  
  complete(
    model: string,
    tokensInput: number,
    tokensOutput: number,
    costUsd: number,
    success: boolean = true,
    error?: string,
    provider?: 'openai' | 'perplexity' | 'internal'
  ): StageMetrics {
    const metrics: StageMetrics = {
      stage: this.stageName,
      model,
      tokensInput,
      tokensOutput,
      latencyMs: Date.now() - this.startTime,
      costUsd,
      success,
      error,
      provider
    }
    
    this.onComplete(metrics)
    return metrics
  }
}

// Analytics functions for observability data
export async function getCostMetrics(days: number = 7): Promise<CostMetrics> {
  const redisStore = getRedisStore()
  if (!redisStore.isAvailable()) {
    return {
      totalCost: 0,
      costByProvider: {},
      costByModel: {},
      tokenUsage: 0,
      averageLatency: 0,
      successRate: 1
    }
  }
  
  let totalCost = 0
  let totalTokens = 0
  const costByProvider: Record<string, number> = {}
  
  // Aggregate costs over the specified days
  for (let i = 0; i < days; i++) {
    const date = new Date()
    date.setDate(date.getDate() - i)
    const dayKey = `cost_metrics:${date.toISOString().substring(0, 10)}`
    
    const dayCost = parseFloat(await redisStore.get(`${dayKey}:total`) || '0')
    totalCost += dayCost
    
    const dayTokens = parseInt(await redisStore.get(`${dayKey}:tokens`) || '0')
    totalTokens += dayTokens
    
    // Provider costs
    for (const provider of ['openai', 'perplexity']) {
      const providerCost = parseFloat(await redisStore.get(`${dayKey}:provider:${provider}`) || '0')
      costByProvider[provider] = (costByProvider[provider] || 0) + providerCost
    }
  }
  
  return {
    totalCost,
    costByProvider,
    costByModel: {}, // Would need more detailed tracking
    tokenUsage: totalTokens,
    averageLatency: 0, // Would need more detailed tracking
    successRate: 1 // Would need more detailed tracking
  }
}

export async function getObservabilityReports(
  siteId?: string,
  limit: number = 100
): Promise<ObservabilityReport[]> {
  const redisStore = getRedisStore()
  if (!redisStore.isAvailable()) {
    return []
  }
  
  try {
    let pipelineIds: string[]
    
    if (siteId) {
      const siteKey = `observability_site:${siteId}`
      pipelineIds = await redisStore.zrange(siteKey, -limit, -1)
    } else {
      const today = new Date().toISOString().substring(0, 10)
      const dayKey = `observability_day:${today}`
      pipelineIds = await redisStore.zrange(dayKey, -limit, -1)
    }
    
    const reports = await Promise.all(
      pipelineIds.map(async (pipelineId) => {
        const reportKey = `observability:${pipelineId}`
        const reportJson = await redisStore.get(reportKey)
        return reportJson ? JSON.parse(reportJson) : null
      })
    )
    
    return reports.filter(report => report !== null)
  } catch (error) {
    console.error('Failed to retrieve observability reports:', error)
    return []
  }
}
