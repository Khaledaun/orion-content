
export interface StageMetrics {
  stage: string
  model: string
  tokens_input: number
  tokens_output: number
  latency_ms: number
  cost_usd: number
  success: boolean
  error?: string
}

export interface ObservabilityReport {
  pipeline_id: string
  site_id: string
  content_title: string
  total_latency_ms: number
  total_cost_usd: number
  total_tokens: number
  stages: StageMetrics[]
  quality_score?: number
  flags: Record<string, any>
  created_at: string
}

// PII redaction for observability logs
function redactSensitive(text: string): string {
  return text
    .replace(/Bearer\s+[A-Za-z0-9+/=_-]+/gi, 'Bearer [REDACTED]')
    .replace(/api[_-]?key['":\s=]+['"]\w+['"]/gi, 'api_key: "[REDACTED]"')
    .replace(/password['":\s=]+['"]\w+['"]/gi, 'password: "[REDACTED]"')
    .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL_REDACTED]')
}

export class ObservabilityTracker {
  private stages: StageMetrics[] = []
  private startTime: number = Date.now()
  
  constructor(
    private pipelineId: string,
    private siteId: string,
    private contentTitle: string
  ) {}
  
  startStage(stageName: string): StageTracker {
    return new StageTracker(stageName, (metrics) => {
      this.stages.push(metrics)
    })
  }
  
  async finalize(qualityScore?: number, flags: Record<string, any> = {}): Promise<ObservabilityReport> {
    const totalLatency = Date.now() - this.startTime
    const totalCost = this.stages.reduce((sum, stage) => sum + stage.cost_usd, 0)
    const totalTokens = this.stages.reduce((sum, stage) => sum + stage.tokens_input + stage.tokens_output, 0)
    
    const report: ObservabilityReport = {
      pipeline_id: this.pipelineId,
      site_id: this.siteId,
      content_title: redactSensitive(this.contentTitle),
      total_latency_ms: totalLatency,
      total_cost_usd: totalCost,
      total_tokens: totalTokens,
      stages: this.stages.map(stage => ({
        ...stage,
        error: stage.error ? redactSensitive(stage.error) : undefined
      })),
      quality_score: qualityScore,
      flags,
      created_at: new Date().toISOString()
    }
    
    // Log structured observability data
    console.log('OBSERVABILITY_REPORT:', JSON.stringify(report, null, 2))
    
    return report
  }
}

export class StageTracker {
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
    error?: string
  ) {
    const metrics: StageMetrics = {
      stage: this.stageName,
      model,
      tokens_input: tokensInput,
      tokens_output: tokensOutput,
      latency_ms: Date.now() - this.startTime,
      cost_usd: costUsd,
      success,
      error
    }
    
    this.onComplete(metrics)
    return metrics
  }
}

// Cost estimation for different models
export const MODEL_COSTS = {
  'gpt-4': { input: 0.03 / 1000, output: 0.06 / 1000 },
  'gpt-4-turbo': { input: 0.01 / 1000, output: 0.03 / 1000 },
  'gpt-3.5-turbo': { input: 0.0015 / 1000, output: 0.002 / 1000 },
  'claude-3': { input: 0.015 / 1000, output: 0.075 / 1000 },
} as const

export function calculateCost(
  model: string,
  inputTokens: number,
  outputTokens: number
): number {
  const costs = MODEL_COSTS[model as keyof typeof MODEL_COSTS]
  if (!costs) {
    return 0 // Unknown model
  }
  
  return (inputTokens * costs.input) + (outputTokens * costs.output)
}
