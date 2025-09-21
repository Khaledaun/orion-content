/**
 * SEO Audit Engine
 * Main orchestrator for comprehensive SEO analysis
 */

import { SEOCrawler, SiteStructure } from './crawler';
import { ServerlessSEOCrawler } from './crawler-serverless';
import { SEOAnalyzer, SEOAuditResult } from './analyzer';
import { logger } from '@/lib/logger';
import { redactSensitive } from '@/lib/redact';

export interface SEOAuditOptions {
  maxPages?: number;
  maxDepth?: number;
  timeout?: number;
  includePerformance?: boolean;
  includeAccessibility?: boolean;
  includeWordPress?: boolean;
}

export interface SEOAuditProgress {
  stage: 'crawling' | 'analyzing' | 'generating_report' | 'complete';
  progress: number; // 0-100
  message: string;
  currentPage?: string;
  pagesCrawled?: number;
  totalPages?: number;
}

export class SEOAuditEngine {
  private crawler: SEOCrawler | ServerlessSEOCrawler;
  private analyzer: SEOAnalyzer;

  constructor() {
    // Use serverless crawler on Vercel, regular crawler in development
    if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
      this.crawler = new ServerlessSEOCrawler();
    } else {
      this.crawler = new SEOCrawler();
    }
    this.analyzer = new SEOAnalyzer();
  }

  async performAudit(
    siteUrl: string,
    options: SEOAuditOptions = {},
    onProgress?: (progress: SEOAuditProgress) => void
  ): Promise<SEOAuditResult> {
    const startTime = Date.now();
    
    logger.info(
      { siteUrl: redactSensitive(siteUrl), options },
      'Starting comprehensive SEO audit'
    );

    try {
      // Stage 1: Crawling
      onProgress?.({
        stage: 'crawling',
        progress: 0,
        message: 'Starting site crawl...',
      });

      const siteStructure = await this.crawlSite(siteUrl, options, onProgress);

      // Stage 2: Analysis
      onProgress?.({
        stage: 'analyzing',
        progress: 50,
        message: 'Analyzing SEO data...',
      });

      const auditResult = this.analyzer.analyzeSite(siteStructure, siteUrl);

      // Stage 3: Generate Report
      onProgress?.({
        stage: 'generating_report',
        progress: 90,
        message: 'Generating audit report...',
      });

      // Add additional analysis if requested
      if (options.includePerformance) {
        await this.enhanceWithPerformanceData(auditResult, siteStructure);
      }

      if (options.includeWordPress) {
        await this.enhanceWithWordPressData(auditResult, siteStructure);
      }

      // Complete
      onProgress?.({
        stage: 'complete',
        progress: 100,
        message: 'SEO audit completed successfully',
      });

      const totalTime = Date.now() - startTime;
      logger.info(
        {
          siteUrl: redactSensitive(siteUrl),
          totalTime,
          overallScore: auditResult.score.overall,
          totalIssues: auditResult.issues.length,
        },
        'SEO audit completed successfully'
      );

      return auditResult;
    } catch (error) {
      logger.error(
        { error: redactSensitive(error), siteUrl: redactSensitive(siteUrl) },
        'SEO audit failed'
      );
      throw error;
    } finally {
      await this.cleanup();
    }
  }

  private async crawlSite(
    siteUrl: string,
    options: SEOAuditOptions,
    onProgress?: (progress: SEOAuditProgress) => void
  ): Promise<SiteStructure> {
    // Configure crawler based on options
    if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
      this.crawler = new ServerlessSEOCrawler({
        maxPages: options.maxPages || 50,
        maxDepth: options.maxDepth || 3,
        timeout: options.timeout || 30000,
      });
    } else {
      this.crawler = new SEOCrawler({
        maxPages: options.maxPages || 50,
        maxDepth: options.maxDepth || 3,
        timeout: options.timeout || 30000,
      });
    }

    // Start crawling with progress updates
    const crawlPromise = this.crawler.crawlSite(siteUrl);
    
    // Simulate progress updates during crawling
    const progressInterval = setInterval(() => {
      onProgress?.({
        stage: 'crawling',
        progress: Math.min(40, Math.random() * 40), // 0-40% during crawling
        message: 'Crawling website pages...',
      });
    }, 1000);

    try {
      const result = await crawlPromise;
      clearInterval(progressInterval);
      
      onProgress?.({
        stage: 'crawling',
        progress: 40,
        message: `Crawled ${result.pages.length} pages successfully`,
        pagesCrawled: result.pages.length,
        totalPages: result.pages.length,
      });

      return result;
    } catch (error) {
      clearInterval(progressInterval);
      throw error;
    }
  }

  private async enhanceWithPerformanceData(
    auditResult: SEOAuditResult,
    siteStructure: SiteStructure
  ): Promise<void> {
    // This would integrate with Lighthouse or other performance tools
    // For now, we'll use the basic performance data from crawling
    
    logger.info('Enhancing audit with performance data');
    
    // Add performance-specific issues
    const slowPages = siteStructure.slowPages;
    if (slowPages.length > 0) {
      auditResult.issues.push({
        type: 'warning',
        category: 'performance',
        title: 'Performance Issues Detected',
        description: `${slowPages.length} pages have load times over 3 seconds.`,
        impact: 'medium',
        fix: 'Optimize images, enable caching, and minify CSS/JavaScript.',
        affectedPages: slowPages,
        score: 60,
      });
    }
  }

  private async enhanceWithWordPressData(
    auditResult: SEOAuditResult,
    siteStructure: SiteStructure
  ): Promise<void> {
    logger.info('Enhancing audit with WordPress-specific data');
    
    // Analyze WordPress-specific SEO opportunities
    const pages = siteStructure.pages;
    const wordpressIssues: any[] = [];

    // Check for common WordPress SEO issues
    const hasSEOPlugins = auditResult.wordpressInfo.seoPlugins.length > 0;
    if (!hasSEOPlugins) {
      wordpressIssues.push({
        type: 'warning',
        category: 'wordpress',
        title: 'No SEO Plugin Detected',
        description: 'No WordPress SEO plugins were detected. Consider installing Yoast SEO or RankMath.',
        impact: 'medium',
        fix: 'Install and configure a WordPress SEO plugin for better optimization.',
        affectedPages: pages.map(p => p.url),
        score: 70,
      });
    }

    // Check for WordPress version
    const wpVersion = auditResult.wordpressInfo.version;
    if (wpVersion && this.isOutdatedWordPress(wpVersion)) {
      wordpressIssues.push({
        type: 'warning',
        category: 'wordpress',
        title: 'Outdated WordPress Version',
        description: `WordPress version ${wpVersion} may have security and SEO issues.`,
        impact: 'medium',
        fix: 'Update WordPress to the latest version for security and performance improvements.',
        affectedPages: pages.map(p => p.url),
        score: 60,
      });
    }

    // Add WordPress issues to audit result
    auditResult.issues.push(...wordpressIssues);
  }

  private isOutdatedWordPress(version: string): boolean {
    // Simple version comparison - in production, this would be more sophisticated
    const currentYear = new Date().getFullYear();
    const versionYear = parseInt(version.split('.')[0]);
    return versionYear < currentYear - 2; // Consider outdated if more than 2 years old
  }

  private async cleanup(): Promise<void> {
    try {
      await this.crawler.close();
    } catch (error) {
      logger.warn({ error: redactSensitive(error) }, 'Error during crawler cleanup');
    }
  }

  // Utility method for quick SEO checks
  async quickSEOCheck(siteUrl: string): Promise<{
    hasTitle: boolean;
    hasMetaDescription: boolean;
    hasH1: boolean;
    hasImages: boolean;
    loadTime: number;
    statusCode: number;
  }> {
    try {
      const siteStructure = await this.crawler.crawlSite(siteUrl);
      const homepage = siteStructure.pages[0];
      
      if (!homepage) {
        throw new Error('Could not crawl homepage');
      }

      return {
        hasTitle: !!homepage.title,
        hasMetaDescription: !!homepage.metaDescription,
        hasH1: homepage.headings.h1.length > 0,
        hasImages: homepage.images.length > 0,
        loadTime: homepage.loadTime,
        statusCode: homepage.statusCode,
      };
    } catch (error) {
      logger.error(
        { error: redactSensitive(error), siteUrl: redactSensitive(siteUrl) },
        'Quick SEO check failed'
      );
      throw error;
    } finally {
      await this.cleanup();
    }
  }

  // Method to get audit history for a site
  async getAuditHistory(siteUrl: string): Promise<SEOAuditResult[]> {
    // This would typically query a database for previous audit results
    // For now, return empty array
    logger.info({ siteUrl: redactSensitive(siteUrl) }, 'Retrieving audit history');
    return [];
  }

  // Method to compare audits
  compareAudits(current: SEOAuditResult, previous: SEOAuditResult): {
    scoreChange: number;
    issuesResolved: number;
    newIssues: number;
    improvements: string[];
    regressions: string[];
  } {
    const scoreChange = current.score.overall - previous.score.overall;
    const currentIssueTitles = new Set(current.issues.map(i => i.title));
    const previousIssueTitles = new Set(previous.issues.map(i => i.title));
    
    const issuesResolved = [...previousIssueTitles].filter(
      title => !currentIssueTitles.has(title)
    ).length;
    
    const newIssues = [...currentIssueTitles].filter(
      title => !previousIssueTitles.has(title)
    ).length;

    const improvements: string[] = [];
    const regressions: string[] = [];

    // Analyze score changes by category
    Object.keys(current.score).forEach(category => {
      if (category === 'overall') return;
      
      const currentScore = current.score[category as keyof typeof current.score];
      const previousScore = previous.score[category as keyof typeof previous.score];
      const change = currentScore - previousScore;
      
      if (change > 5) {
        improvements.push(`${category} score improved by ${change} points`);
      } else if (change < -5) {
        regressions.push(`${category} score decreased by ${Math.abs(change)} points`);
      }
    });

    return {
      scoreChange,
      issuesResolved,
      newIssues,
      improvements,
      regressions,
    };
  }
}
