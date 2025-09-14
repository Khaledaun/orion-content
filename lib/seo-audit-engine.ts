
import { prisma } from './prisma';
import { AIService } from './ai/service';
import { ga4OAuth, gscOAuth } from './integrations';

export interface SEOAuditOptions {
  type: 'full-site' | 'page' | 'competitor';
  targetUrl?: string;
  includeCompetitor?: boolean;
  competitorUrls?: string[];
  includeTechnical?: boolean;
  includeContent?: boolean;
  includePerformance?: boolean;
  includeAccessibility?: boolean;
}

export interface SEOAuditResult {
  overallScore: number;
  reports: {
    technical?: TechnicalSEOReport;
    content?: ContentSEOReport;
    performance?: PerformanceSEOReport;
    accessibility?: AccessibilitySEOReport;
  };
  recommendations: SEORecommendation[];
  competitorAnalysis?: CompetitorAnalysis;
}

export interface TechnicalSEOReport {
  score: number;
  issues: SEOIssue[];
  checks: {
    titleTags: CheckResult;
    metaDescriptions: CheckResult;
    headingStructure: CheckResult;
    urlStructure: CheckResult;
    canonicalTags: CheckResult;
    robotsTxt: CheckResult;
    sitemap: CheckResult;
    schemaMarkup: CheckResult;
    internalLinking: CheckResult;
    mobileOptimization: CheckResult;
  };
}

export interface ContentSEOReport {
  score: number;
  issues: SEOIssue[];
  checks: {
    keywordOptimization: CheckResult;
    contentQuality: CheckResult;
    contentLength: CheckResult;
    readability: CheckResult;
    duplicateContent: CheckResult;
    imageOptimization: CheckResult;
  };
}

export interface PerformanceSEOReport {
  score: number;
  issues: SEOIssue[];
  checks: {
    pageSpeed: CheckResult;
    coreWebVitals: CheckResult;
    serverResponse: CheckResult;
    compression: CheckResult;
    caching: CheckResult;
  };
}

export interface AccessibilitySEOReport {
  score: number;
  issues: SEOIssue[];
  checks: {
    altText: CheckResult;
    headingOrder: CheckResult;
    colorContrast: CheckResult;
    keyboardNavigation: CheckResult;
    ariaLabels: CheckResult;
  };
}

export interface CheckResult {
  passed: boolean;
  score: number;
  message: string;
  details?: any;
  impact: 'low' | 'medium' | 'high';
}

export interface SEOIssue {
  type: 'error' | 'warning' | 'info';
  category: 'technical' | 'content' | 'performance' | 'accessibility';
  title: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
  effort: 'low' | 'medium' | 'high';
  url?: string;
  element?: string;
}

export interface SEORecommendation {
  priority: 'high' | 'medium' | 'low';
  category: 'technical' | 'content' | 'performance' | 'accessibility';
  title: string;
  description: string;
  impact: string;
  effort: string;
  steps: string[];
}

export interface CompetitorAnalysis {
  competitors: CompetitorData[];
  gaps: string[];
  opportunities: string[];
}

export interface CompetitorData {
  url: string;
  score: number;
  strengths: string[];
  weaknesses: string[];
  keywords: string[];
}

export class SEOAuditEngine {
  private aiService: AIService;

  constructor() {
    this.aiService = new AIService();
  }

  async createAudit(siteId: string, options: SEOAuditOptions) {
    try {
      const audit = await prisma.seoAudit.create({
        data: {
          siteId,
          type: options.type,
          targetUrl: options.targetUrl,
          status: 'pending'
        }
      });

      // Start audit process in background
      this.runAudit(audit.id, options).catch(error => {
        console.error(`Audit ${audit.id} failed:`, error);
        this.markAuditFailed(audit.id, error);
      });

      return audit;
    } catch (error) {
      console.error('Error creating SEO audit:', error);
      throw error;
    }
  }

  async runAudit(auditId: string, options: SEOAuditOptions) {
    try {
      // Update status to running
      await prisma.seoAudit.update({
        where: { id: auditId },
        data: { status: 'running' }
      });

      const audit = await prisma.seoAudit.findUnique({
        where: { id: auditId },
        include: { site: true }
      });

      if (!audit) throw new Error('Audit not found');

      // Run different types of audits based on options
      const results: SEOAuditResult = {
        overallScore: 0,
        reports: {},
        recommendations: []
      };

      if (options.includeTechnical !== false) {
        results.reports.technical = await this.runTechnicalAudit(audit.site.key, options.targetUrl);
      }

      if (options.includeContent !== false) {
        results.reports.content = await this.runContentAudit(audit.site.key, options.targetUrl);
      }

      if (options.includePerformance !== false) {
        results.reports.performance = await this.runPerformanceAudit(audit.site.key, options.targetUrl);
      }

      if (options.includeAccessibility !== false) {
        results.reports.accessibility = await this.runAccessibilityAudit(audit.site.key, options.targetUrl);
      }

      // Calculate overall score
      results.overallScore = this.calculateOverallScore(results.reports);

      // Generate AI-powered recommendations
      results.recommendations = await this.generateRecommendations(results.reports);

      // Run competitor analysis if requested
      if (options.includeCompetitor && options.competitorUrls?.length) {
        results.competitorAnalysis = await this.runCompetitorAnalysis(
          options.competitorUrls,
          results
        );
      }

      // Save results and update status
      await prisma.seoAudit.update({
        where: { id: auditId },
        data: {
          status: 'completed',
          overallScore: results.overallScore,
          results: results,
          recommendations: results.recommendations,
          completedAt: new Date()
        }
      });

      // Create individual audit reports
      await this.createAuditReports(auditId, results.reports);

      return results;

    } catch (error) {
      console.error('Error running SEO audit:', error);
      await this.markAuditFailed(auditId, error);
      throw error;
    }
  }

  private async runTechnicalAudit(siteKey: string, targetUrl?: string): Promise<TechnicalSEOReport> {
    const issues: SEOIssue[] = [];
    const checks: TechnicalSEOReport['checks'] = {} as any;

    try {
      // Title tags check
      checks.titleTags = await this.checkTitleTags(siteKey, targetUrl);
      
      // Meta descriptions check
      checks.metaDescriptions = await this.checkMetaDescriptions(siteKey, targetUrl);
      
      // Heading structure check
      checks.headingStructure = await this.checkHeadingStructure(siteKey, targetUrl);
      
      // URL structure check
      checks.urlStructure = await this.checkUrlStructure(siteKey, targetUrl);
      
      // Canonical tags check
      checks.canonicalTags = await this.checkCanonicalTags(siteKey, targetUrl);
      
      // Robots.txt check
      checks.robotsTxt = await this.checkRobotsTxt(siteKey);
      
      // Sitemap check
      checks.sitemap = await this.checkSitemap(siteKey);
      
      // Schema markup check
      checks.schemaMarkup = await this.checkSchemaMarkup(siteKey, targetUrl);
      
      // Internal linking check
      checks.internalLinking = await this.checkInternalLinking(siteKey, targetUrl);
      
      // Mobile optimization check
      checks.mobileOptimization = await this.checkMobileOptimization(siteKey, targetUrl);

      // Calculate technical score
      const scores = Object.values(checks).map(check => check.score);
      const score = scores.reduce((sum, s) => sum + s, 0) / scores.length;

      return { score, issues, checks };

    } catch (error) {
      console.error('Error in technical audit:', error);
      return {
        score: 0,
        issues: [{
          type: 'error',
          category: 'technical',
          title: 'Technical Audit Failed',
          description: 'Unable to complete technical SEO audit',
          impact: 'high',
          effort: 'medium'
        }],
        checks: {} as any
      };
    }
  }

  private async runContentAudit(siteKey: string, targetUrl?: string): Promise<ContentSEOReport> {
    const issues: SEOIssue[] = [];
    const checks: ContentSEOReport['checks'] = {} as any;

    try {
      // Keyword optimization check
      checks.keywordOptimization = await this.checkKeywordOptimization(siteKey, targetUrl);
      
      // Content quality check
      checks.contentQuality = await this.checkContentQuality(siteKey, targetUrl);
      
      // Content length check
      checks.contentLength = await this.checkContentLength(siteKey, targetUrl);
      
      // Readability check
      checks.readability = await this.checkReadability(siteKey, targetUrl);
      
      // Duplicate content check
      checks.duplicateContent = await this.checkDuplicateContent(siteKey, targetUrl);
      
      // Image optimization check
      checks.imageOptimization = await this.checkImageOptimization(siteKey, targetUrl);

      // Calculate content score
      const scores = Object.values(checks).map(check => check.score);
      const score = scores.reduce((sum, s) => sum + s, 0) / scores.length;

      return { score, issues, checks };

    } catch (error) {
      console.error('Error in content audit:', error);
      return {
        score: 0,
        issues: [{
          type: 'error',
          category: 'content',
          title: 'Content Audit Failed',
          description: 'Unable to complete content SEO audit',
          impact: 'high',
          effort: 'medium'
        }],
        checks: {} as any
      };
    }
  }

  private async runPerformanceAudit(siteKey: string, targetUrl?: string): Promise<PerformanceSEOReport> {
    const issues: SEOIssue[] = [];
    const checks: PerformanceSEOReport['checks'] = {} as any;

    try {
      // Page speed check
      checks.pageSpeed = await this.checkPageSpeed(siteKey, targetUrl);
      
      // Core Web Vitals check
      checks.coreWebVitals = await this.checkCoreWebVitals(siteKey, targetUrl);
      
      // Server response check
      checks.serverResponse = await this.checkServerResponse(siteKey, targetUrl);
      
      // Compression check
      checks.compression = await this.checkCompression(siteKey, targetUrl);
      
      // Caching check
      checks.caching = await this.checkCaching(siteKey, targetUrl);

      // Calculate performance score
      const scores = Object.values(checks).map(check => check.score);
      const score = scores.reduce((sum, s) => sum + s, 0) / scores.length;

      return { score, issues, checks };

    } catch (error) {
      console.error('Error in performance audit:', error);
      return {
        score: 0,
        issues: [{
          type: 'error',
          category: 'performance',
          title: 'Performance Audit Failed',
          description: 'Unable to complete performance SEO audit',
          impact: 'high',
          effort: 'medium'
        }],
        checks: {} as any
      };
    }
  }

  private async runAccessibilityAudit(siteKey: string, targetUrl?: string): Promise<AccessibilitySEOReport> {
    const issues: SEOIssue[] = [];
    const checks: AccessibilitySEOReport['checks'] = {} as any;

    try {
      // Alt text check
      checks.altText = await this.checkAltText(siteKey, targetUrl);
      
      // Heading order check
      checks.headingOrder = await this.checkHeadingOrder(siteKey, targetUrl);
      
      // Color contrast check
      checks.colorContrast = await this.checkColorContrast(siteKey, targetUrl);
      
      // Keyboard navigation check
      checks.keyboardNavigation = await this.checkKeyboardNavigation(siteKey, targetUrl);
      
      // ARIA labels check
      checks.ariaLabels = await this.checkAriaLabels(siteKey, targetUrl);

      // Calculate accessibility score
      const scores = Object.values(checks).map(check => check.score);
      const score = scores.reduce((sum, s) => sum + s, 0) / scores.length;

      return { score, issues, checks };

    } catch (error) {
      console.error('Error in accessibility audit:', error);
      return {
        score: 0,
        issues: [{
          type: 'error',
          category: 'accessibility',
          title: 'Accessibility Audit Failed',
          description: 'Unable to complete accessibility SEO audit',
          impact: 'medium',
          effort: 'medium'
        }],
        checks: {} as any
      };
    }
  }

  // Individual check methods (simplified implementations)
  private async checkTitleTags(siteKey: string, targetUrl?: string): Promise<CheckResult> {
    // Implementation would check title tag length, uniqueness, keyword optimization
    return {
      passed: true,
      score: 85,
      message: 'Title tags are well optimized',
      impact: 'high'
    };
  }

  private async checkMetaDescriptions(siteKey: string, targetUrl?: string): Promise<CheckResult> {
    // Implementation would check meta description presence, length, uniqueness
    return {
      passed: false,
      score: 65,
      message: 'Some pages missing meta descriptions',
      impact: 'medium'
    };
  }

  private async checkHeadingStructure(siteKey: string, targetUrl?: string): Promise<CheckResult> {
    // Implementation would analyze H1-H6 structure
    return {
      passed: true,
      score: 90,
      message: 'Heading structure is logical and SEO-friendly',
      impact: 'medium'
    };
  }

  private async checkUrlStructure(siteKey: string, targetUrl?: string): Promise<CheckResult> {
    // Implementation would check URL structure, length, readability
    return {
      passed: true,
      score: 80,
      message: 'URLs are clean and descriptive',
      impact: 'medium'
    };
  }

  private async checkCanonicalTags(siteKey: string, targetUrl?: string): Promise<CheckResult> {
    // Implementation would check canonical tag presence and correctness
    return {
      passed: false,
      score: 70,
      message: 'Some pages missing canonical tags',
      impact: 'medium'
    };
  }

  private async checkRobotsTxt(siteKey: string): Promise<CheckResult> {
    // Implementation would check robots.txt existence and configuration
    return {
      passed: true,
      score: 95,
      message: 'Robots.txt is properly configured',
      impact: 'medium'
    };
  }

  private async checkSitemap(siteKey: string): Promise<CheckResult> {
    // Implementation would check XML sitemap presence and submission to GSC
    return {
      passed: true,
      score: 90,
      message: 'XML sitemap is present and submitted',
      impact: 'high'
    };
  }

  private async checkSchemaMarkup(siteKey: string, targetUrl?: string): Promise<CheckResult> {
    // Implementation would check structured data presence and validity
    return {
      passed: false,
      score: 40,
      message: 'Limited structured data implementation',
      impact: 'medium'
    };
  }

  private async checkInternalLinking(siteKey: string, targetUrl?: string): Promise<CheckResult> {
    // Implementation would analyze internal link structure
    return {
      passed: true,
      score: 75,
      message: 'Good internal linking structure',
      impact: 'medium'
    };
  }

  private async checkMobileOptimization(siteKey: string, targetUrl?: string): Promise<CheckResult> {
    // Implementation would check mobile-friendliness
    return {
      passed: true,
      score: 88,
      message: 'Site is mobile-optimized',
      impact: 'high'
    };
  }

  private async checkKeywordOptimization(siteKey: string, targetUrl?: string): Promise<CheckResult> {
    // Implementation would check keyword density, placement, relevance
    return {
      passed: true,
      score: 78,
      message: 'Keywords are well-integrated',
      impact: 'high'
    };
  }

  private async checkContentQuality(siteKey: string, targetUrl?: string): Promise<CheckResult> {
    // Implementation would use AI to assess content quality
    return {
      passed: true,
      score: 82,
      message: 'Content quality is good',
      impact: 'high'
    };
  }

  private async checkContentLength(siteKey: string, targetUrl?: string): Promise<CheckResult> {
    // Implementation would check if content meets length requirements
    return {
      passed: true,
      score: 85,
      message: 'Content length is appropriate',
      impact: 'medium'
    };
  }

  private async checkReadability(siteKey: string, targetUrl?: string): Promise<CheckResult> {
    // Implementation would assess readability scores
    return {
      passed: true,
      score: 80,
      message: 'Content readability is good',
      impact: 'medium'
    };
  }

  private async checkDuplicateContent(siteKey: string, targetUrl?: string): Promise<CheckResult> {
    // Implementation would check for duplicate content issues
    return {
      passed: true,
      score: 95,
      message: 'No duplicate content detected',
      impact: 'high'
    };
  }

  private async checkImageOptimization(siteKey: string, targetUrl?: string): Promise<CheckResult> {
    // Implementation would check image alt texts, file sizes, formats
    return {
      passed: false,
      score: 60,
      message: 'Some images need optimization',
      impact: 'medium'
    };
  }

  private async checkPageSpeed(siteKey: string, targetUrl?: string): Promise<CheckResult> {
    // Implementation would use PageSpeed Insights API
    return {
      passed: false,
      score: 70,
      message: 'Page speed can be improved',
      impact: 'high'
    };
  }

  private async checkCoreWebVitals(siteKey: string, targetUrl?: string): Promise<CheckResult> {
    // Implementation would check LCP, FID, CLS metrics
    return {
      passed: true,
      score: 85,
      message: 'Core Web Vitals are good',
      impact: 'high'
    };
  }

  private async checkServerResponse(siteKey: string, targetUrl?: string): Promise<CheckResult> {
    // Implementation would check server response times
    return {
      passed: true,
      score: 90,
      message: 'Server response time is excellent',
      impact: 'medium'
    };
  }

  private async checkCompression(siteKey: string, targetUrl?: string): Promise<CheckResult> {
    // Implementation would check GZIP compression
    return {
      passed: true,
      score: 95,
      message: 'GZIP compression is enabled',
      impact: 'medium'
    };
  }

  private async checkCaching(siteKey: string, targetUrl?: string): Promise<CheckResult> {
    // Implementation would check caching headers
    return {
      passed: true,
      score: 88,
      message: 'Caching is properly configured',
      impact: 'medium'
    };
  }

  private async checkAltText(siteKey: string, targetUrl?: string): Promise<CheckResult> {
    // Implementation would check image alt text presence
    return {
      passed: false,
      score: 65,
      message: 'Some images missing alt text',
      impact: 'medium'
    };
  }

  private async checkHeadingOrder(siteKey: string, targetUrl?: string): Promise<CheckResult> {
    // Implementation would check proper heading hierarchy
    return {
      passed: true,
      score: 90,
      message: 'Heading order is correct',
      impact: 'medium'
    };
  }

  private async checkColorContrast(siteKey: string, targetUrl?: string): Promise<CheckResult> {
    // Implementation would check WCAG color contrast requirements
    return {
      passed: true,
      score: 85,
      message: 'Color contrast meets requirements',
      impact: 'low'
    };
  }

  private async checkKeyboardNavigation(siteKey: string, targetUrl?: string): Promise<CheckResult> {
    // Implementation would check keyboard accessibility
    return {
      passed: true,
      score: 80,
      message: 'Keyboard navigation is functional',
      impact: 'medium'
    };
  }

  private async checkAriaLabels(siteKey: string, targetUrl?: string): Promise<CheckResult> {
    // Implementation would check ARIA label usage
    return {
      passed: false,
      score: 70,
      message: 'Some elements need ARIA labels',
      impact: 'medium'
    };
  }

  private calculateOverallScore(reports: SEOAuditResult['reports']): number {
    const scores = Object.values(reports)
      .filter(report => report)
      .map(report => report!.score);

    if (scores.length === 0) return 0;
    return Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);
  }

  private async generateRecommendations(
    reports: SEOAuditResult['reports']
  ): Promise<SEORecommendation[]> {
    try {
      // Use AI to generate personalized recommendations
      const messages = [
        {
          role: 'system' as const,
          content: `You are an SEO expert analyzing audit results and providing actionable recommendations.
          
          Focus on:
          - Prioritizing high-impact, low-effort improvements
          - Providing specific, actionable steps
          - Explaining the business impact of each recommendation`
        },
        {
          role: 'user' as const,
          content: `Based on these SEO audit results, provide prioritized recommendations:
          
          ${JSON.stringify(reports, null, 2)}
          
          Format as JSON array with priority, category, title, description, impact, effort, and steps.`
        }
      ];

      const result = await this.aiService.generateContent(messages);
      
      try {
        return JSON.parse(result.content);
      } catch {
        // Fallback to basic recommendations if AI parsing fails
        return this.getBasicRecommendations(reports);
      }
    } catch (error) {
      console.error('Error generating AI recommendations:', error);
      return this.getBasicRecommendations(reports);
    }
  }

  private getBasicRecommendations(reports: SEOAuditResult['reports']): SEORecommendation[] {
    const recommendations: SEORecommendation[] = [];

    // Basic recommendations based on common issues
    if (reports.technical?.score && reports.technical.score < 80) {
      recommendations.push({
        priority: 'high',
        category: 'technical',
        title: 'Improve Technical SEO',
        description: 'Address technical SEO issues to improve search engine crawling and indexing',
        impact: 'High - Better search engine visibility',
        effort: 'Medium - Requires technical implementation',
        steps: [
          'Fix missing meta descriptions',
          'Add canonical tags to all pages',
          'Implement structured data markup',
          'Optimize URL structure'
        ]
      });
    }

    if (reports.performance?.score && reports.performance.score < 70) {
      recommendations.push({
        priority: 'high',
        category: 'performance',
        title: 'Optimize Page Speed',
        description: 'Improve page loading speed to enhance user experience and search rankings',
        impact: 'High - Better user experience and Core Web Vitals',
        effort: 'Medium - Performance optimization required',
        steps: [
          'Optimize image sizes and formats',
          'Minimize CSS and JavaScript',
          'Enable browser caching',
          'Use CDN for static assets'
        ]
      });
    }

    if (reports.content?.score && reports.content.score < 75) {
      recommendations.push({
        priority: 'medium',
        category: 'content',
        title: 'Enhance Content Quality',
        description: 'Improve content optimization and keyword strategy',
        impact: 'Medium - Better search rankings for target keywords',
        effort: 'Medium - Content creation and optimization',
        steps: [
          'Conduct keyword research for underperforming pages',
          'Optimize content length and structure',
          'Add relevant internal links',
          'Include more engaging multimedia content'
        ]
      });
    }

    return recommendations;
  }

  private async runCompetitorAnalysis(
    competitorUrls: string[],
    currentResults: SEOAuditResult
  ): Promise<CompetitorAnalysis> {
    // Simplified competitor analysis implementation
    return {
      competitors: competitorUrls.map(url => ({
        url,
        score: Math.floor(Math.random() * 40) + 60, // Mock score
        strengths: ['Fast loading speed', 'Good content structure'],
        weaknesses: ['Missing schema markup', 'Poor mobile optimization'],
        keywords: ['example keyword 1', 'example keyword 2']
      })),
      gaps: [
        'Competitors have more comprehensive FAQ sections',
        'Missing comparison pages that competitors rank for'
      ],
      opportunities: [
        'Target long-tail keywords competitors are missing',
        'Create more in-depth guide content'
      ]
    };
  }

  private async createAuditReports(auditId: string, reports: SEOAuditResult['reports']) {
    try {
      const reportPromises = Object.entries(reports).map(async ([category, report]) => {
        if (!report) return;

        await prisma.seoAuditReport.create({
          data: {
            auditId,
            category,
            score: report.score,
            details: report
          }
        });
      });

      await Promise.all(reportPromises);
    } catch (error) {
      console.error('Error creating audit reports:', error);
    }
  }

  private async markAuditFailed(auditId: string, error: any) {
    try {
      await prisma.seoAudit.update({
        where: { id: auditId },
        data: {
          status: 'failed',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          completedAt: new Date()
        }
      });
    } catch (updateError) {
      console.error('Error updating audit status:', updateError);
    }
  }

  async getAudit(auditId: string) {
    try {
      return await prisma.seoAudit.findUnique({
        where: { id: auditId },
        include: {
          auditReports: true,
          site: {
            select: {
              id: true,
              key: true,
              name: true
            }
          }
        }
      });
    } catch (error) {
      console.error('Error getting SEO audit:', error);
      return null;
    }
  }

  async getAuditsForSite(siteId: string, limit = 10) {
    try {
      return await prisma.seoAudit.findMany({
        where: { siteId },
        include: {
          auditReports: {
            select: {
              category: true,
              score: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: limit
      });
    } catch (error) {
      console.error('Error getting site audits:', error);
      return [];
    }
  }
}

export const seoAuditEngine = new SEOAuditEngine();
