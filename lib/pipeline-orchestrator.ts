
import { createOpenAIClient, OpenAIResponse } from './openai-client'
import { createPerplexityClient, PerplexityResponse } from './perplexity-client'
import { ProductionObservabilityTracker } from './observability-prod'
import { getAuditLogger } from './audit-prod'
import { getRedisStore } from './redis-store'
import { processQualityGating } from '@/lib/wordpress'
import { validateExtendedI18nCompliance, generateExtendedSlug, formatExtendedCitation, generateExtendedArticleSchema } from './i18n-extended'
import { prisma } from '@/lib/prisma'

export interface PipelineRequest {
  siteId: string
  topic: string
  requirements?: {
    minWords?: number
    maxWords?: number
    tone?: string
    audience?: string
    language?: string
    includeResearch?: boolean
    qualityThreshold?: number
  }
  flags?: {
    ignore_rulebook?: boolean
    dry_run?: boolean
    force_research?: boolean
  }
  metadata?: Record<string, any>
}

export interface PipelineResult {
  pipelineId: string
  siteId: string
  title: string
  slug: string
  html: string
  citations: string[]
  schema: object
  qualityScore: number
  qualityDetails: Record<string, any>
  language: string
  observabilityReport: any
  wordpressResult?: {
    postId: number
    link: string
    action: 'published' | 'draft_with_review' | 'bypassed'
    tags: string[]
  }
  success: boolean
  error?: string
}

export class ProductionPipelineOrchestrator {
  private openaiClient = createOpenAIClient()
  private perplexityClient = createPerplexityClient()
  private auditLogger = getAuditLogger()
  private redisStore = getRedisStore()

  async processPipeline(request: PipelineRequest): Promise<PipelineResult> {
    const pipelineId = `pipeline-${Date.now()}-${Math.random().toString(36).substring(2)}`
    
    // Initialize observability tracking
    const observability = new ProductionObservabilityTracker(
      pipelineId,
      request.siteId,
      request.topic
    )

    try {
      await this.auditLogger.log({
        route: '/pipeline/process',
        actor: 'system',
        action: 'pipeline_started',
        metadata: {
          pipelineId,
          siteId: request.siteId,
          topic: request.topic,
          flags: request.flags
        }
      })

      // Step 1: Check enforcement controls
      const shouldContinue = await this.checkEnforcementControls(request.flags)
      if (!shouldContinue.proceed) {
        return this.createFailureResult(pipelineId, request, shouldContinue.reason || 'Quality enforcement temporarily disabled')
      }

      // Step 2: Research phase (if enabled)
      let researchResult: PerplexityResponse | null = null
      if (request.requirements?.includeResearch || request.flags?.force_research) {
        const researchStage = observability.startStage('research')
        try {
          researchResult = await this.perplexityClient.research(
            request.topic,
            ['current trends', 'key facts', 'expert opinions']
          )
          
          researchStage.complete(
            researchResult.usage.model,
            researchResult.usage.promptTokens,
            researchResult.usage.completionTokens,
            researchResult.usage.cost,
            true,
            undefined,
            'perplexity'
          )
        } catch (error) {
          researchStage.complete('perplexity-error', 0, 0, 0, false, error instanceof Error ? error.message : 'Unknown error')
        }
      }

      // Step 3: Content generation
      const contentStage = observability.startStage('content_generation')
      let contentResult: OpenAIResponse

      try {
        const context = researchResult ? researchResult.content : ''
        contentResult = await this.openaiClient.generateContent(
          request.topic,
          context,
          request.requirements || {}
        )

        contentStage.complete(
          contentResult.usage.model,
          contentResult.usage.promptTokens,
          contentResult.usage.completionTokens,
          contentResult.usage.cost,
          true,
          undefined,
          'openai'
        )
      } catch (error) {
        contentStage.complete('openai-error', 0, 0, 0, false, error instanceof Error ? error.message : 'Unknown error')
        throw error
      }

      // Step 4: Content processing and i18n
      const processingStage = observability.startStage('content_processing')
      const language = request.requirements?.language || 'en'
      
      const title = await this.extractTitle(contentResult.content)
      const slug = generateExtendedSlug(title, language)
      const html = await this.formatContentAsHTML(contentResult.content, language)
      const citations = await this.generateCitations(researchResult, language)
      
      processingStage.complete('content-processor', 0, 0, 0, true, undefined, 'internal')

      // Step 5: Quality assessment
      const qualityStage = observability.startStage('quality_assessment')
      const qualityResult = await this.assessQuality(
        { title, html, language, citations },
        request.siteId
      )
      
      qualityStage.complete('quality-checker', 0, 0, 0, true, undefined, 'internal')

      // Step 6: i18n validation
      const i18nStage = observability.startStage('i18n_validation')
      const schema = generateExtendedArticleSchema({
        title,
        description: title.substring(0, 160) + '...',
        content: html,
        author: 'Orion Content System',
        publishedDate: new Date().toISOString(),
        lang: language,
        url: `https://example.com/${slug}`
      })

      const i18nValidation = validateExtendedI18nCompliance({
        title,
        slug,
        html,
        lang: language,
        citations,
        altTexts: [], // Would extract from HTML in real implementation
        schema
      })

      i18nStage.complete('i18n-validator', 0, 0, 0, i18nValidation.valid, 
        i18nValidation.issues.join('; ') || undefined, 'internal')

      // Step 7: WordPress integration (quality gating)
      let wordpressResult
      const wpStage = observability.startStage('wordpress_integration')
      
      try {
        // Check dry run mode
        const isDryRun = await this.checkDryRunMode() || request.flags?.dry_run

        if (isDryRun) {
          wordpressResult = {
            postId: Math.floor(Math.random() * 10000),
            link: `https://example.com/wp-admin/post.php?post=stub&action=edit`,
            action: 'bypassed' as const,
            tags: ['dry-run']
          }
          wpStage.complete('wordpress-stub', 0, 0, 0, true, undefined, 'internal')
        } else {
          // Real WordPress integration would happen here
          // For now, simulate based on quality score
          const threshold = await this.getQualityThreshold(request.siteId)
          
          if (qualityResult.score >= threshold) {
            wordpressResult = {
              postId: Math.floor(Math.random() * 10000),
              link: `https://example.com/wp-admin/post.php?post=stub&action=edit`,
              action: 'published' as const,
              tags: []
            }
          } else {
            wordpressResult = {
              postId: Math.floor(Math.random() * 10000),
              link: `https://example.com/wp-admin/post.php?post=stub&action=edit`,
              action: 'draft_with_review' as const,
              tags: ['review-needed']
            }
          }
          
          wpStage.complete('wordpress-api', 0, 0, 0.001, true, undefined, 'internal')
        }
      } catch (error) {
        wpStage.complete('wordpress-error', 0, 0, 0, false, error instanceof Error ? error.message : 'Unknown error')
        // Don't fail the entire pipeline for WordPress errors
        wordpressResult = {
          postId: 0,
          link: '',
          action: 'bypassed' as const,
          tags: ['wordpress-error']
        }
      }

      // Step 8: Finalize observability
      const observabilityReport = await observability.finalize(
        qualityResult.score,
        {
          ...request.flags,
          i18n_validation: i18nValidation,
          wordpress_action: wordpressResult.action
        },
        request.metadata
      )

      // Step 9: Audit log completion
      await this.auditLogger.log({
        route: '/pipeline/process',
        actor: 'system',
        action: 'pipeline_completed',
        metadata: {
          pipelineId,
          siteId: request.siteId,
          qualityScore: qualityResult.score,
          wordpressAction: wordpressResult.action,
          totalCost: observabilityReport.totalCostUsd,
          language
        },
        success: true,
        latencyMs: observabilityReport.totalLatencyMs,
        cost: observabilityReport.totalCostUsd
      })

      return {
        pipelineId,
        siteId: request.siteId,
        title,
        slug,
        html,
        citations,
        schema,
        qualityScore: qualityResult.score,
        qualityDetails: qualityResult.details,
        language,
        observabilityReport,
        wordpressResult,
        success: true
      }

    } catch (error) {
      // Error handling and cleanup
      const observabilityReport = await observability.finalize(
        0,
        { error: true, ...request.flags },
        request.metadata
      )

      await this.auditLogger.log({
        route: '/pipeline/process',
        actor: 'system',
        action: 'pipeline_failed',
        metadata: {
          pipelineId,
          siteId: request.siteId,
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        success: false
      })

      return this.createFailureResult(
        pipelineId,
        request,
        error instanceof Error ? error.message : 'Unknown error'
      )
    }
  }

  private async checkEnforcementControls(flags?: Record<string, any>): Promise<{ proceed: boolean; reason?: string }> {
    if (!this.redisStore.isAvailable()) {
      return { proceed: true }
    }

    try {
      // Check if enforcement is disabled
      const disabledConfig = await this.redisStore.get('enforcement_disabled')
      if (disabledConfig) {
        const config = JSON.parse(disabledConfig)
        
        // Check if still within disabled window
        if (config.expiresAt && new Date() > new Date(config.expiresAt)) {
          await this.redisStore.del('enforcement_disabled')
        } else {
          return {
            proceed: true, // Proceed but with enforcement disabled
            reason: 'Quality enforcement temporarily disabled'
          }
        }
      }

      return { proceed: true }
    } catch {
      return { proceed: true }
    }
  }

  private async checkDryRunMode(): Promise<boolean> {
    if (!this.redisStore.isAvailable()) {
      return false
    }

    try {
      const dryRunConfig = await this.redisStore.get('dry_run_mode')
      if (!dryRunConfig) return false

      const config = JSON.parse(dryRunConfig)
      
      // Check if still within dry run window
      if (config.expiresAt && new Date() > new Date(config.expiresAt)) {
        await this.redisStore.del('dry_run_mode')
        return false
      }

      return true
    } catch {
      return false
    }
  }

  private async extractTitle(content: string): Promise<string> {
    // Extract the first line or heading as title
    const lines = content.split('\n').filter(line => line.trim())
    const title = lines[0]?.replace(/^#+\s*/, '').trim() || 'Untitled Article'
    
    return title.length > 100 ? title.substring(0, 97) + '...' : title
  }

  private async formatContentAsHTML(content: string, language: string): Promise<string> {
    // Convert markdown-style content to HTML
    let html = content
      .split('\n\n')
      .map(paragraph => {
        if (paragraph.startsWith('#')) {
          const level = paragraph.match(/^#+/)?.[0].length || 1
          const text = paragraph.replace(/^#+\s*/, '')
          return `<h${level}>${text}</h${level}>`
        }
        if (paragraph.trim().startsWith('- ')) {
          const items = paragraph.split('\n- ').map(item => 
            item.replace(/^- /, '').trim()
          )
          const listItems = items.map(item => `<li>${item}</li>`).join('\n')
          return `<ul>\n${listItems}\n</ul>`
        }
        return `<p>${paragraph}</p>`
      })
      .join('\n')

    // Add language and direction attributes for RTL languages
    const rtlLangs = ['ar', 'he', 'fa', 'ur']
    if (rtlLangs.includes(language)) {
      html = `<div lang="${language}" dir="rtl">${html}</div>`
    } else {
      html = `<div lang="${language}">${html}</div>`
    }

    return html
  }

  private async generateCitations(researchResult: PerplexityResponse | null, language: string): Promise<string[]> {
    if (!researchResult || !researchResult.sources.length) {
      return []
    }

    return researchResult.sources.slice(0, 5).map((source, index) => 
      formatExtendedCitation(
        `Source ${index + 1}`,
        `Research Reference ${index + 1}`,
        source,
        language,
        'Research Team',
        new Date().toLocaleDateString()
      )
    )
  }

  private async assessQuality(content: { title: string; html: string; language: string; citations: string[] }, siteId: string): Promise<{ score: number; details: Record<string, any> }> {
    // Simulate quality assessment
    const scores = {
      eeat: 75 + Math.floor(Math.random() * 20), // 75-95
      seo: 70 + Math.floor(Math.random() * 25),  // 70-95
      readability: 80 + Math.floor(Math.random() * 15), // 80-95
      i18n: content.language !== 'en' ? 85 + Math.floor(Math.random() * 10) : 90,
      citations: content.citations.length > 0 ? 90 + Math.floor(Math.random() * 10) : 60
    }

    // Weighted average
    const weights = { eeat: 0.3, seo: 0.25, readability: 0.2, i18n: 0.15, citations: 0.1 }
    const totalScore = Object.entries(scores).reduce((total, [key, score]) => {
      return total + (score * weights[key as keyof typeof weights])
    }, 0)

    return {
      score: Math.round(totalScore),
      details: scores
    }
  }

  private async getQualityThreshold(siteId: string): Promise<number> {
    try {
      // Check site-specific strategy first
      const siteStrategy = await prisma.siteStrategy.findUnique({
        where: { siteId }
      })

      if (siteStrategy && siteStrategy.strategy) {
        const strategy = siteStrategy.strategy as any
        return strategy.enforcement?.quality_threshold || 75
      }

      // Fall back to global rulebook
      const globalRulebook = await prisma.globalRulebook.findFirst({
        orderBy: { version: 'desc' }
      })

      if (globalRulebook && globalRulebook.rules) {
        const rules = globalRulebook.rules as any
        return rules.enforcement?.default_min_quality_score || 75
      }

      return 75 // Default threshold
    } catch {
      return 75 // Default on error
    }
  }

  private createFailureResult(pipelineId: string, request: PipelineRequest, error: string): PipelineResult {
    return {
      pipelineId,
      siteId: request.siteId,
      title: 'Error',
      slug: 'error',
      html: '<p>Pipeline processing failed</p>',
      citations: [],
      schema: {},
      qualityScore: 0,
      qualityDetails: {},
      language: request.requirements?.language || 'en',
      observabilityReport: null,
      success: false,
      error
    }
  }
}

// Factory function
export function createProductionPipeline(): ProductionPipelineOrchestrator {
  return new ProductionPipelineOrchestrator()
}

// Helper function for API integration
export async function processContentPipeline(
  siteId: string,
  topic: string,
  options: {
    language?: string
    includeResearch?: boolean
    qualityThreshold?: number
    dryRun?: boolean
  } = {}
): Promise<PipelineResult> {
  const pipeline = createProductionPipeline()
  
  return pipeline.processPipeline({
    siteId,
    topic,
    requirements: {
      language: options.language || 'en',
      includeResearch: options.includeResearch,
      qualityThreshold: options.qualityThreshold,
      minWords: 500,
      maxWords: 1500,
      tone: 'professional',
      audience: 'general'
    },
    flags: {
      dry_run: options.dryRun
    }
  })
}
