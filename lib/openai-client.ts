
// If you see a module not found error, run: pnpm add openai
import OpenAI from 'openai'
import { getAuditLogger } from './audit-prod'

export interface OpenAIConfig {
  apiKey: string
  model: string
  maxTokens?: number
  temperature?: number
  timeout?: number
}

export interface OpenAIUsage {
  promptTokens: number
  completionTokens: number
  totalTokens: number
  cost: number
  model: string
}

export interface OpenAIResponse {
  content: string
  usage: OpenAIUsage
  latencyMs: number
  requestId: string
}

// OpenAI pricing per 1K tokens (as of 2024)
const PRICING = {
  'gpt-4': { input: 0.03, output: 0.06 },
  'gpt-4-turbo': { input: 0.01, output: 0.03 },
  'gpt-4-turbo-preview': { input: 0.01, output: 0.03 },
  'gpt-3.5-turbo': { input: 0.001, output: 0.002 },
  'gpt-3.5-turbo-16k': { input: 0.003, output: 0.004 }
} as const

export class OpenAIClient {
  private client: OpenAI
  private auditLogger = getAuditLogger()
  
  constructor(config: OpenAIConfig) {
    this.client = new OpenAI({
      apiKey: config.apiKey,
      timeout: config.timeout || 60000,
    })
  }
  
  async complete(
    prompt: string,
    config: Partial<OpenAIConfig> = {}
  ): Promise<OpenAIResponse> {
    const startTime = Date.now()
    const requestId = `openai-${Date.now()}-${Math.random().toString(36).substring(2)}`
    
    const model = config.model || 'gpt-4-turbo'
    const maxTokens = config.maxTokens || 2000
    const temperature = config.temperature || 0.7
    
    try {
      await this.auditLogger.log({
        route: '/openai/complete',
        actor: 'system',
        action: 'api_request_start',
        metadata: {
          requestId,
          model,
          maxTokens,
          promptLength: prompt.length
        }
      })
      
      const response = await this.client.chat.completions.create({
        model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: maxTokens,
        temperature,
      })
      
      const latencyMs = Date.now() - startTime
      const usage = response.usage
      
      if (!usage) {
        throw new Error('No usage data returned from OpenAI')
      }
      
      const cost = this.calculateCost(model, usage.prompt_tokens, usage.completion_tokens)
      const content = response.choices[0]?.message?.content || ''
      
      const result: OpenAIResponse = {
        content,
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
        route: '/openai/complete',
        actor: 'system',
        action: 'api_request_success',
        metadata: {
          requestId,
          model,
          latencyMs,
          cost,
          promptTokens: usage.prompt_tokens,
          completionTokens: usage.completion_tokens,
          totalTokens: usage.total_tokens
        },
        success: true,
        latencyMs,
        cost
      })
      
      return result
      
    } catch (error) {
      const latencyMs = Date.now() - startTime
      
      await this.auditLogger.log({
        route: '/openai/complete',
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
      
      throw new Error(`OpenAI API error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
  
  async generateContent(
    topic: string,
    context: string,
    requirements: {
      minWords?: number
      maxWords?: number
      tone?: string
      audience?: string
      includeReferences?: boolean
    } = {}
  ): Promise<OpenAIResponse> {
    const prompt = this.buildContentPrompt(topic, context, requirements)
    
    return this.complete(prompt, {
      model: 'gpt-4-turbo',
      maxTokens: Math.min(4000, (requirements.maxWords || 1000) * 2),
      temperature: 0.7
    })
  }
  
  async improveContent(
    content: string,
    improvements: string[]
  ): Promise<OpenAIResponse> {
    const prompt = `
Please improve the following content based on these requirements:
${improvements.map(imp => `- ${imp}`).join('\n')}

Original content:
${content}

Please provide the improved version:
`
    
    return this.complete(prompt, {
      model: 'gpt-4-turbo',
      maxTokens: Math.max(2000, content.length * 2),
      temperature: 0.3
    })
  }
  
  private buildContentPrompt(
    topic: string,
    context: string,
    requirements: any
  ): string {
    const {
      minWords = 500,
      maxWords = 1000,
      tone = 'professional',
      audience = 'general',
      includeReferences = true
    } = requirements
    
    return `
Write a comprehensive article about: ${topic}

Context and background:
${context}

Requirements:
- Length: ${minWords}-${maxWords} words
- Tone: ${tone}
- Target audience: ${audience}
- Include references: ${includeReferences}

Please structure the article with:
1. Compelling introduction
2. Well-organized main sections
3. Practical examples where relevant
4. Clear conclusion
${includeReferences ? '5. References section with credible sources' : ''}

Write the complete article now:
`
  }
  
  private calculateCost(model: string, promptTokens: number, completionTokens: number): number {
    const pricing = PRICING[model as keyof typeof PRICING]
    if (!pricing) {
      console.warn(`Unknown model pricing: ${model}`)
      return 0
    }
    
    const promptCost = (promptTokens / 1000) * pricing.input
    const completionCost = (completionTokens / 1000) * pricing.output
    
    return promptCost + completionCost
  }
}

// Factory function with environment validation
export function createOpenAIClient(): OpenAIClient {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY environment variable is required')
  }
  
  return new OpenAIClient({
    apiKey,
    model: 'gpt-4-turbo',
    timeout: 60000
  })
}
