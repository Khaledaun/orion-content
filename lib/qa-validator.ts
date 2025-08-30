
/**
 * QA Validation System for Phase 10
 * Implements rulebook-based content validation with structured reporting
 */

import { redactSensitive } from './redact'
import { logger } from './logger'

export interface QAViolation {
  rule: string
  severity: 'error' | 'warning' | 'info'
  message: string
  location?: string
  suggestions?: string[]
}

export interface QAReport {
  status: 'PASSED' | 'FAILED' | 'WARNING'
  score: number // 0-100
  violations: QAViolation[]
  summary: {
    errors: number
    warnings: number
    infos: number
  }
  passedRules: string[]
  metadata: {
    validatedAt: string
    version: string
    contentLength: number
  }
}

export interface ContentData {
  title: string
  content: string
  metaTitle?: string
  metaDescription?: string
  targetKeywords?: string[]
  images?: Array<{
    src: string
    alt?: string
  }>
}

export class QAValidator {
  private rules: Array<{
    id: string
    name: string
    severity: 'error' | 'warning' | 'info'
    validator: (content: ContentData) => QAViolation[]
  }>

  constructor() {
    this.rules = [
      {
        id: 'heading-hierarchy',
        name: 'Heading Hierarchy',
        severity: 'error',
        validator: this.validateHeadingHierarchy.bind(this)
      },
      {
        id: 'keyword-placement',
        name: 'Keyword Placement',
        severity: 'error',
        validator: this.validateKeywordPlacement.bind(this)
      },
      {
        id: 'meta-title-length',
        name: 'Meta Title Length',
        severity: 'error',
        validator: this.validateMetaTitle.bind(this)
      },
      {
        id: 'meta-description-length',
        name: 'Meta Description Length',
        severity: 'error',
        validator: this.validateMetaDescription.bind(this)
      },
      {
        id: 'image-alt-text',
        name: 'Image Alt Text',
        severity: 'warning',
        validator: this.validateImageAltText.bind(this)
      },
      {
        id: 'internal-links',
        name: 'Internal Link Placeholders',
        severity: 'warning',
        validator: this.validateInternalLinks.bind(this)
      },
      {
        id: 'content-length',
        name: 'Content Length',
        severity: 'info',
        validator: this.validateContentLength.bind(this)
      }
    ]
  }

  async validate(content: ContentData): Promise<QAReport> {
    try {
      const violations: QAViolation[] = []
      const passedRules: string[] = []

      // Run all validation rules
      for (const rule of this.rules) {
        try {
          const ruleViolations = rule.validator(content)
          if (ruleViolations.length > 0) {
            violations.push(...ruleViolations)
          } else {
            passedRules.push(rule.name)
          }
        } catch (error) {
          logger.error({ 
            error: redactSensitive(error), 
            rule: rule.id 
          }, 'QA rule validation failed')
          violations.push({
            rule: rule.id,
            severity: 'error',
            message: `Rule validation failed: ${rule.name}`,
            suggestions: ['Contact system administrator']
          })
        }
      }

      // Calculate summary
      const summary = {
        errors: violations.filter(v => v.severity === 'error').length,
        warnings: violations.filter(v => v.severity === 'warning').length,
        infos: violations.filter(v => v.severity === 'info').length
      }

      // Calculate score (100 - penalty points)
      let score = 100
      score -= summary.errors * 15    // -15 points per error
      score -= summary.warnings * 5   // -5 points per warning
      score -= summary.infos * 1       // -1 point per info
      score = Math.max(0, score)       // Don't go below 0

      // Determine overall status
      let status: 'PASSED' | 'FAILED' | 'WARNING' = 'PASSED'
      if (summary.errors > 0) {
        status = 'FAILED'
      } else if (summary.warnings > 0) {
        status = 'WARNING'
      }

      return {
        status,
        score,
        violations,
        summary,
        passedRules,
        metadata: {
          validatedAt: new Date().toISOString(),
          version: '1.0.0',
          contentLength: content.content?.length || 0
        }
      }
    } catch (error) {
      logger.error({ error: redactSensitive(error) }, 'QA validation failed')
      return {
        status: 'FAILED',
        score: 0,
        violations: [{
          rule: 'system',
          severity: 'error',
          message: 'QA validation system error',
          suggestions: ['Contact system administrator']
        }],
        summary: { errors: 1, warnings: 0, infos: 0 },
        passedRules: [],
        metadata: {
          validatedAt: new Date().toISOString(),
          version: '1.0.0',
          contentLength: content.content?.length || 0
        }
      }
    }
  }

  private validateHeadingHierarchy(content: ContentData): QAViolation[] {
    const violations: QAViolation[] = []
    const htmlContent = content.content || ''
    
    // Extract headings with regex
    const headingRegex = /<h([1-6])[^>]*>(.*?)<\/h[1-6]>/gi
    const headings: Array<{ level: number, text: string }> = []
    
    let match
    while ((match = headingRegex.exec(htmlContent)) !== null) {
      headings.push({
        level: parseInt(match[1]),
        text: match[2].replace(/<[^>]*>/g, '').trim()
      })
    }

    if (headings.length === 0) {
      violations.push({
        rule: 'heading-hierarchy',
        severity: 'error',
        message: 'No headings found in content',
        suggestions: ['Add at least one H1 heading', 'Use proper heading structure (H1, H2, H3...)']
      })
      return violations
    }

    // Check for H1
    const h1Count = headings.filter(h => h.level === 1).length
    if (h1Count === 0) {
      violations.push({
        rule: 'heading-hierarchy',
        severity: 'error',
        message: 'No H1 heading found',
        suggestions: ['Add exactly one H1 heading to the content']
      })
    } else if (h1Count > 1) {
      violations.push({
        rule: 'heading-hierarchy',
        severity: 'error',
        message: `Multiple H1 headings found (${h1Count})`,
        suggestions: ['Use only one H1 heading per page']
      })
    }

    // Check hierarchy sequence
    let prevLevel = 0
    for (let i = 0; i < headings.length; i++) {
      const current = headings[i]
      if (current.level > prevLevel + 1) {
        violations.push({
          rule: 'heading-hierarchy',
          severity: 'warning',
          message: `Heading level skip detected: H${prevLevel} to H${current.level}`,
          location: current.text,
          suggestions: ['Use sequential heading levels (H1 → H2 → H3...)']
        })
      }
      prevLevel = current.level
    }

    return violations
  }

  private validateKeywordPlacement(content: ContentData): QAViolation[] {
    const violations: QAViolation[] = []
    const keywords = content.targetKeywords || []
    
    if (keywords.length === 0) {
      violations.push({
        rule: 'keyword-placement',
        severity: 'info',
        message: 'No target keywords specified',
        suggestions: ['Add target keywords for better SEO optimization']
      })
      return violations
    }

    const title = content.title.toLowerCase()
    const contentLower = content.content?.toLowerCase() || ''
    const first100Words = contentLower.split(/\s+/).slice(0, 100).join(' ')
    
    // Extract H1 text
    const h1Match = contentLower.match(/<h1[^>]*>(.*?)<\/h1>/i)
    const h1Text = h1Match ? h1Match[1].replace(/<[^>]*>/g, '').trim() : ''

    for (const keyword of keywords) {
      const keywordLower = keyword.toLowerCase()
      
      // Check title
      if (!title.includes(keywordLower)) {
        violations.push({
          rule: 'keyword-placement',
          severity: 'warning',
          message: `Target keyword "${keyword}" not found in title`,
          suggestions: [`Include "${keyword}" in the page title`]
        })
      }

      // Check H1
      if (h1Text && !h1Text.includes(keywordLower)) {
        violations.push({
          rule: 'keyword-placement',
          severity: 'warning',
          message: `Target keyword "${keyword}" not found in H1`,
          suggestions: [`Include "${keyword}" in the H1 heading`]
        })
      }

      // Check first 100 words
      if (!first100Words.includes(keywordLower)) {
        violations.push({
          rule: 'keyword-placement',
          severity: 'warning',
          message: `Target keyword "${keyword}" not found in first 100 words`,
          suggestions: [`Include "${keyword}" early in the content`]
        })
      }
    }

    return violations
  }

  private validateMetaTitle(content: ContentData): QAViolation[] {
    const violations: QAViolation[] = []
    const metaTitle = content.metaTitle || content.title
    
    if (!metaTitle) {
      violations.push({
        rule: 'meta-title-length',
        severity: 'error',
        message: 'Meta title is missing',
        suggestions: ['Add a meta title for SEO']
      })
      return violations
    }

    if (metaTitle.length > 60) {
      violations.push({
        rule: 'meta-title-length',
        severity: 'error',
        message: `Meta title is too long (${metaTitle.length} characters, max 60)`,
        suggestions: ['Shorten the meta title to 60 characters or less']
      })
    } else if (metaTitle.length < 30) {
      violations.push({
        rule: 'meta-title-length',
        severity: 'warning',
        message: `Meta title is short (${metaTitle.length} characters, recommended 30-60)`,
        suggestions: ['Consider expanding the meta title for better SEO']
      })
    }

    return violations
  }

  private validateMetaDescription(content: ContentData): QAViolation[] {
    const violations: QAViolation[] = []
    const metaDesc = content.metaDescription
    
    if (!metaDesc) {
      violations.push({
        rule: 'meta-description-length',
        severity: 'error',
        message: 'Meta description is missing',
        suggestions: ['Add a meta description for SEO']
      })
      return violations
    }

    if (metaDesc.length > 160) {
      violations.push({
        rule: 'meta-description-length',
        severity: 'error',
        message: `Meta description is too long (${metaDesc.length} characters, max 160)`,
        suggestions: ['Shorten the meta description to 160 characters or less']
      })
    } else if (metaDesc.length < 120) {
      violations.push({
        rule: 'meta-description-length',
        severity: 'warning',
        message: `Meta description is short (${metaDesc.length} characters, recommended 120-160)`,
        suggestions: ['Consider expanding the meta description']
      })
    }

    return violations
  }

  private validateImageAltText(content: ContentData): QAViolation[] {
    const violations: QAViolation[] = []
    const images = content.images || []
    
    // Also extract images from HTML content
    const htmlContent = content.content || ''
    const imgRegex = /<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*>/gi
    const imgNoAltRegex = /<img[^>]*src="([^"]*)"[^>]*>/gi
    
    let match
    const htmlImages = []
    
    // Get images with alt text
    while ((match = imgRegex.exec(htmlContent)) !== null) {
      htmlImages.push({ src: match[1], alt: match[2] })
    }
    
    // Get images without alt text
    const allImgMatches = [...htmlContent.matchAll(imgNoAltRegex)]
    const imagesWithoutAlt = allImgMatches.filter(match => !match[0].includes('alt='))
    
    for (const img of imagesWithoutAlt) {
      violations.push({
        rule: 'image-alt-text',
        severity: 'warning',
        message: 'Image missing alt text',
        location: img[1],
        suggestions: ['Add descriptive alt text to all images for accessibility']
      })
    }

    // Check provided images array
    for (const img of images) {
      if (!img.alt || img.alt.trim().length === 0) {
        violations.push({
          rule: 'image-alt-text',
          severity: 'warning',
          message: 'Image missing alt text',
          location: img.src,
          suggestions: ['Add descriptive alt text to all images']
        })
      }
    }

    return violations
  }

  private validateInternalLinks(content: ContentData): QAViolation[] {
    const violations: QAViolation[] = []
    const htmlContent = content.content || ''
    
    // Look for internal link placeholders
    const placeholderRegex = /\[INTERNAL_LINK:([^\]]*)\]/gi
    const placeholders = [...htmlContent.matchAll(placeholderRegex)]
    
    if (placeholders.length === 0) {
      violations.push({
        rule: 'internal-links',
        severity: 'info',
        message: 'No internal link placeholders found',
        suggestions: ['Consider adding internal link placeholders: [INTERNAL_LINK:target]']
      })
    }

    // Check for actual internal links
    const linkRegex = /<a[^>]*href="([^"]*)"[^>]*>/gi
    const links = [...htmlContent.matchAll(linkRegex)]
    const internalLinks = links.filter(link => !link[1].startsWith('http'))
    
    if (internalLinks.length === 0 && placeholders.length === 0) {
      violations.push({
        rule: 'internal-links',
        severity: 'warning',
        message: 'No internal links or placeholders found',
        suggestions: ['Add internal links to related content for better SEO']
      })
    }

    return violations
  }

  private validateContentLength(content: ContentData): QAViolation[] {
    const violations: QAViolation[] = []
    const plainText = (content.content || '').replace(/<[^>]*>/g, '').trim()
    const wordCount = plainText.split(/\s+/).filter(word => word.length > 0).length
    
    if (wordCount < 300) {
      violations.push({
        rule: 'content-length',
        severity: 'warning',
        message: `Content is short (${wordCount} words, recommended 300+)`,
        suggestions: ['Consider expanding the content for better SEO']
      })
    } else if (wordCount > 3000) {
      violations.push({
        rule: 'content-length',
        severity: 'info',
        message: `Content is very long (${wordCount} words)`,
        suggestions: ['Consider breaking into multiple pages if appropriate']
      })
    }

    return violations
  }
}

// Export singleton instance
export const qaValidator = new QAValidator()
