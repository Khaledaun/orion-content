
import { getAuditLogger } from './audit-prod'

export interface PerplexityConfig {
  apiKey: string
  model: string
  timeout?: number
}

export interface PerplexityUsage {
  promptTokens: number
  completionTokens: number
  totalTokens: number
  cost: number
  model: string
}

export interface PerplexityResponse {
  content: string
  sources: string[]
  usage: PerplexityUsage
  latencyMs: number
  requestId: string
}

// Perplexity pricing per 1K tokens (estimated)
const PERPLEXITY_PRICING = {
  'pplx-7b-online': { input: 0.0002, output: 0.0002 },
  'pplx-70b-online': { input: 0.001, output: 0.001 },
  'pplx-7b-chat': { input: 0.0002, output: 0.0002 },
  'pplx-70b-chat': { input: 0.001, output: 0.001 }
} as const

export class PerplexityClient {
  private auditLogger = getAuditLogger()
  private apiKey: string
  private baseURL = 'https://api.perplexity.ai'
  private timeout: number
  
  constructor(config: PerplexityConfig) {
    this.apiKey = config.apiKey
    this.timeout = config.timeout || 60000
  }
  
  async search(
    query: string,
    config: {
      model?: string
      maxTokens?: number
      temperature?: number
      includeSources?: boolean
    } = {}
  ): Promise<PerplexityResponse> {
    const startTime = Date.now()
    const requestId = `perplexity-${Date.now()}-${Math.random().toString(36).substring(2)}`
    
    const model = config.model || 'pplx-70b-online'
    const maxTokens = config.maxTokens || 1000
    const temperature = config.temperature || 0.7
    
    try {
      await this.auditLogger.log({
        route: '/perplexity/search',
        actor: 'system',
        action: 'api_request_start',
        metadata: {
          requestId,
          model,
          maxTokens,
          queryLength: query.length
        }
      })
      
      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: 'system',
              content: 'You are a helpful research assistant. Provide accurate, well-sourced information and always include relevant sources.'
            },
            {
              role: 'user',
              content: query
            }
          ],
          max_tokens: maxTokens,
          temperature,
          stream: false
        }),
        signal: AbortSignal.timeout(this.timeout)
      })
      
      if (!response.ok) {
        throw new Error(`Perplexity API error: ${response.status} ${response.statusText}`)
      }
      
      const data = await response.json()
      const latencyMs = Date.now() - startTime
      
      const usage = data.usage || {
        prompt_tokens: Math.ceil(query.length / 4),
        completion_tokens: Math.ceil((data.choices[0]?.message?.content || '').length / 4),
        total_tokens: 0
      }
      usage.total_tokens = usage.prompt_tokens + usage.completion_tokens
      
      const cost = this.calculateCost(model, usage.prompt_tokens, usage.completion_tokens)
      const content = data.choices[0]?.message?.content || ''
      
      // Extract sources from content (Perplexity typically includes them)
      const sources = this.extractSources(content)
      
      const result: PerplexityResponse = {
        content,
        sources,
        usage: {
          promptTokens: usage.prompt_tokens,
          completionTokens: usage.completion_tokens,
          totalTokens: usage.total_tokens,
          cost,
          model
        },
        latencyMs,
        requestId
      }
      
      await this.auditLogger.log({
        route: '/perplexity/search',
        actor: 'system',
        action: 'api_request_success',
        metadata: {
          requestId,
          model,
          latencyMs,
          cost,
          promptTokens: usage.prompt_tokens,
          completionTokens: usage.completion_tokens,
          totalTokens: usage.total_tokens,
          sourcesCount: sources.length
        },
        success: true,
        latencyMs,
        cost
      })
      
      return result
      
    } catch (error) {
      const latencyMs = Date.now() - startTime
      
      await this.auditLogger.log({
        route: '/perplexity/search',
        actor: 'system',
        action: 'api_request_failed',
        metadata: {
          requestId,
          model,
          error: error instanceof Error ? error.message : 'Unknown error',
          latencyMs
        },
        success: false,
        latencyMs
      })
      
      throw new Error(`Perplexity API error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
  
  async research(
    topic: string,
    focusAreas: string[] = [],
    maxSources: number = 10
  ): Promise<PerplexityResponse> {
    const query = this.buildResearchQuery(topic, focusAreas)
    
    return this.search(query, {
      model: 'pplx-70b-online',
      maxTokens: 1500,
      temperature: 0.3
    })
  }
  
  async factCheck(
    claims: string[],
    context?: string
  ): Promise<PerplexityResponse> {
    let query = `Please fact-check the following claims:\n\n`
    claims.forEach((claim, index) => {
      query += `${index + 1}. ${claim}\n`
    })
    
    if (context) {
      query += `\nContext: ${context}\n`
    }
    
    query += `\nFor each claim, please provide:
- Verification status (True/False/Partially True/Uncertain)
- Supporting evidence with sources
- Any important nuances or context`
    
    return this.search(query, {
      model: 'pplx-70b-online',
      maxTokens: 2000,
      temperature: 0.1
    })
  }
  
  private buildResearchQuery(topic: string, focusAreas: string[]): string {
    let query = `Research the topic: ${topic}\n\n`
    
    if (focusAreas.length > 0) {
      query += `Please focus on these specific areas:\n`
      focusAreas.forEach(area => {
        query += `- ${area}\n`
      })
      query += '\n'
    }
    
    query += `Please provide:
1. Current state and recent developments
2. Key facts, statistics, and trends
3. Different perspectives or viewpoints
4. Reliable sources and references
5. Practical implications or applications

Ensure all information is accurate and well-sourced.`
    
    return query
  }
  
  private extractSources(content: string): string[] {
    // Extract URLs from content
    const urlRegex = /https?:\/\/[^\s\)]+/g
    const urls = content.match(urlRegex) || []
    
    // Extract citation patterns [1], [2], etc. and try to find corresponding sources
    const citationRegex = /\[(\d+)\][:\s]*([^\n\[]+)/g
    const citations = []
    let match
    
    while ((match = citationRegex.exec(content)) !== null) {
      citations.push(match[2].trim())
    }
    
    // Combine and deduplicate
    const allSources = [...urls, ...citations]
    return Array.from(new Set(allSources)).slice(0, 10) // Limit to top 10 sources
  }
  
  private calculateCost(model: string, promptTokens: number, completionTokens: number): number {
    const pricing = PERPLEXITY_PRICING[model as keyof typeof PERPLEXITY_PRICING]
    if (!pricing) {
      console.warn(`Unknown Perplexity model pricing: ${model}`)
      return 0
    }
    
    const promptCost = (promptTokens / 1000) * pricing.input
    const completionCost = (completionTokens / 1000) * pricing.output
    
    return promptCost + completionCost
  }
}

// Factory function with environment validation
export function createPerplexityClient(): PerplexityClient {
  const apiKey = process.env.PERPLEXITY_API_KEY
  if (!apiKey) {
    throw new Error('PERPLEXITY_API_KEY environment variable is required')
  }
  
  return new PerplexityClient({
    apiKey,
    model: 'pplx-70b-online',
    timeout: 60000
  })
}
