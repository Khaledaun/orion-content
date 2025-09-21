/**
 * SEO Analysis Engine
 * Comprehensive SEO analysis and scoring system
 */

import { CrawlResult, SiteStructure } from './crawler';
import { logger } from '@/lib/logger';
import { redactSensitive } from '@/lib/redact';

export interface SEOIssue {
  type: 'error' | 'warning' | 'info';
  category: 'technical' | 'content' | 'performance' | 'accessibility' | 'wordpress';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  fix: string;
  affectedPages: string[];
  score: number; // 0-100
}

export interface SEOScore {
  overall: number;
  technical: number;
  content: number;
  performance: number;
  accessibility: number;
  wordpress: number;
}

export interface SEOAuditResult {
  siteUrl: string;
  auditDate: Date;
  score: SEOScore;
  issues: SEOIssue[];
  recommendations: string[];
  wordpressInfo: {
    version: string;
    theme: string;
    plugins: string[];
    seoPlugins: string[];
  };
  summary: {
    totalPages: number;
    totalIssues: number;
    criticalIssues: number;
    averageLoadTime: number;
    mobileFriendly: boolean;
  };
}

export class SEOAnalyzer {
  private readonly maxTitleLength = 60;
  private readonly maxDescriptionLength = 160;
  private readonly minDescriptionLength = 120;
  private readonly maxH1Count = 1;
  private readonly minContentLength = 300;

  analyzeSite(siteStructure: SiteStructure, siteUrl: string): SEOAuditResult {
    const startTime = Date.now();
    
    logger.info({ siteUrl: redactSensitive(siteUrl) }, 'Starting SEO analysis');

    const issues: SEOIssue[] = [];
    const pages = siteStructure.pages;

    // Analyze each page
    pages.forEach(page => {
      issues.push(...this.analyzePage(page));
    });

    // Analyze site-wide issues
    issues.push(...this.analyzeSiteStructure(siteStructure));

    // Calculate scores
    const score = this.calculateScores(issues, pages);

    // Generate recommendations
    const recommendations = this.generateRecommendations(issues, score);

    // Extract WordPress information
    const wordpressInfo = this.extractWordPressInfo(pages);

    // Generate summary
    const summary = this.generateSummary(pages, issues);

    const analysisTime = Date.now() - startTime;
    logger.info(
      {
        siteUrl: redactSensitive(siteUrl),
        totalIssues: issues.length,
        overallScore: score.overall,
        analysisTime,
      },
      'SEO analysis completed'
    );

    return {
      siteUrl,
      auditDate: new Date(),
      score,
      issues,
      recommendations,
      wordpressInfo,
      summary,
    };
  }

  private analyzePage(page: CrawlResult): SEOIssue[] {
    const issues: SEOIssue[] = [];

    // Title analysis
    if (!page.title) {
      issues.push({
        type: 'error',
        category: 'content',
        title: 'Missing Page Title',
        description: 'This page has no title tag, which is critical for SEO.',
        impact: 'high',
        fix: 'Add a descriptive title tag to the page.',
        affectedPages: [page.url],
        score: 0,
      });
    } else if (page.title.length > this.maxTitleLength) {
      issues.push({
        type: 'warning',
        category: 'content',
        title: 'Title Too Long',
        description: `Title is ${page.title.length} characters, should be under ${this.maxTitleLength}.`,
        impact: 'medium',
        fix: 'Shorten the title to under 60 characters.',
        affectedPages: [page.url],
        score: 60,
      });
    }

    // Meta description analysis
    if (!page.metaDescription) {
      issues.push({
        type: 'warning',
        category: 'content',
        title: 'Missing Meta Description',
        description: 'This page has no meta description.',
        impact: 'medium',
        fix: 'Add a compelling meta description between 120-160 characters.',
        affectedPages: [page.url],
        score: 50,
      });
    } else if (page.metaDescription.length < this.minDescriptionLength) {
      issues.push({
        type: 'warning',
        category: 'content',
        title: 'Meta Description Too Short',
        description: `Meta description is ${page.metaDescription.length} characters, should be at least ${this.minDescriptionLength}.`,
        impact: 'medium',
        fix: 'Expand the meta description to at least 120 characters.',
        affectedPages: [page.url],
        score: 70,
      });
    } else if (page.metaDescription.length > this.maxDescriptionLength) {
      issues.push({
        type: 'warning',
        category: 'content',
        title: 'Meta Description Too Long',
        description: `Meta description is ${page.metaDescription.length} characters, should be under ${this.maxDescriptionLength}.`,
        impact: 'medium',
        fix: 'Shorten the meta description to under 160 characters.',
        affectedPages: [page.url],
        score: 70,
      });
    }

    // Heading structure analysis
    if (page.headings.h1.length === 0) {
      issues.push({
        type: 'error',
        category: 'content',
        title: 'Missing H1 Tag',
        description: 'This page has no H1 heading, which is important for SEO.',
        impact: 'high',
        fix: 'Add a single H1 heading to the page.',
        affectedPages: [page.url],
        score: 20,
      });
    } else if (page.headings.h1.length > this.maxH1Count) {
      issues.push({
        type: 'warning',
        category: 'content',
        title: 'Multiple H1 Tags',
        description: `This page has ${page.headings.h1.length} H1 tags, should have only 1.`,
        impact: 'medium',
        fix: 'Use only one H1 tag per page and use H2-H6 for subheadings.',
        affectedPages: [page.url],
        score: 60,
      });
    }

    // Image alt text analysis
    const imagesWithoutAlt = page.images.filter(img => !img.alt);
    if (imagesWithoutAlt.length > 0) {
      issues.push({
        type: 'warning',
        category: 'accessibility',
        title: 'Images Missing Alt Text',
        description: `${imagesWithoutAlt.length} images are missing alt text.`,
        impact: 'medium',
        fix: 'Add descriptive alt text to all images for accessibility and SEO.',
        affectedPages: [page.url],
        score: 70,
      });
    }

    // Performance analysis
    if (page.loadTime > 3000) {
      issues.push({
        type: 'warning',
        category: 'performance',
        title: 'Slow Page Load Time',
        description: `Page loads in ${page.loadTime}ms, should be under 3000ms.`,
        impact: 'medium',
        fix: 'Optimize images, minify CSS/JS, and use caching to improve load time.',
        affectedPages: [page.url],
        score: 60,
      });
    }

    // WordPress-specific analysis
    if (page.wordpressPlugins.length === 0) {
      issues.push({
        type: 'info',
        category: 'wordpress',
        title: 'No WordPress Plugins Detected',
        description: 'No WordPress plugins were detected on this page.',
        impact: 'low',
        fix: 'Consider installing SEO plugins like Yoast or RankMath.',
        affectedPages: [page.url],
        score: 80,
      });
    }

    return issues;
  }

  private analyzeSiteStructure(siteStructure: SiteStructure): SEOIssue[] {
    const issues: SEOIssue[] = [];

    // Broken links analysis
    if (siteStructure.brokenLinks.length > 0) {
      issues.push({
        type: 'error',
        category: 'technical',
        title: 'Broken Internal Links',
        description: `${siteStructure.brokenLinks.length} broken internal links found.`,
        impact: 'high',
        fix: 'Fix or remove broken internal links.',
        affectedPages: siteStructure.brokenLinks,
        score: 30,
      });
    }

    // Duplicate content analysis
    if (siteStructure.duplicateContent.length > 0) {
      issues.push({
        type: 'warning',
        category: 'content',
        title: 'Duplicate Content Detected',
        description: `${siteStructure.duplicateContent.length} pages have duplicate content.`,
        impact: 'medium',
        fix: 'Create unique content for each page or use canonical tags.',
        affectedPages: siteStructure.duplicateContent,
        score: 50,
      });
    }

    // Missing meta descriptions
    if (siteStructure.missingMeta.length > 0) {
      issues.push({
        type: 'warning',
        category: 'content',
        title: 'Pages Missing Meta Descriptions',
        description: `${siteStructure.missingMeta.length} pages are missing meta descriptions.`,
        impact: 'medium',
        fix: 'Add unique meta descriptions to all pages.',
        affectedPages: siteStructure.missingMeta,
        score: 60,
      });
    }

    // Slow pages analysis
    if (siteStructure.slowPages.length > 0) {
      issues.push({
        type: 'warning',
        category: 'performance',
        title: 'Slow Loading Pages',
        description: `${siteStructure.slowPages.length} pages load slower than 3 seconds.`,
        impact: 'medium',
        fix: 'Optimize page speed by compressing images and minifying code.',
        affectedPages: siteStructure.slowPages,
        score: 60,
      });
    }

    return issues;
  }

  private calculateScores(issues: SEOIssue[], pages: CrawlResult[]): SEOScore {
    const categoryScores = {
      technical: 100,
      content: 100,
      performance: 100,
      accessibility: 100,
      wordpress: 100,
    };

    // Calculate category scores based on issues
    issues.forEach(issue => {
      const category = issue.category;
      const impactMultiplier = issue.impact === 'high' ? 0.3 : issue.impact === 'medium' ? 0.6 : 0.8;
      const deduction = (100 - issue.score) * impactMultiplier;
      
      categoryScores[category] = Math.max(0, categoryScores[category] - deduction);
    });

    // Calculate overall score
    const overall = Math.round(
      (categoryScores.technical * 0.25 +
       categoryScores.content * 0.3 +
       categoryScores.performance * 0.2 +
       categoryScores.accessibility * 0.15 +
       categoryScores.wordpress * 0.1)
    );

    return {
      overall,
      technical: Math.round(categoryScores.technical),
      content: Math.round(categoryScores.content),
      performance: Math.round(categoryScores.performance),
      accessibility: Math.round(categoryScores.accessibility),
      wordpress: Math.round(categoryScores.wordpress),
    };
  }

  private generateRecommendations(issues: SEOIssue[], score: SEOScore): string[] {
    const recommendations: string[] = [];

    // High priority recommendations
    const highPriorityIssues = issues.filter(issue => issue.impact === 'high');
    if (highPriorityIssues.length > 0) {
      recommendations.push(
        `Fix ${highPriorityIssues.length} critical issues first - these have the highest impact on SEO.`
      );
    }

    // Category-specific recommendations
    if (score.technical < 70) {
      recommendations.push('Improve technical SEO by fixing broken links and site structure issues.');
    }

    if (score.content < 70) {
      recommendations.push('Enhance content quality by adding missing meta descriptions and optimizing titles.');
    }

    if (score.performance < 70) {
      recommendations.push('Optimize page speed by compressing images and minifying CSS/JavaScript.');
    }

    if (score.accessibility < 70) {
      recommendations.push('Improve accessibility by adding alt text to images and proper heading structure.');
    }

    if (score.wordpress < 70) {
      recommendations.push('Consider installing WordPress SEO plugins like Yoast or RankMath for better optimization.');
    }

    // General recommendations
    if (score.overall < 50) {
      recommendations.push('Focus on fundamental SEO improvements before advanced optimizations.');
    } else if (score.overall < 80) {
      recommendations.push('Good foundation - focus on content quality and technical improvements.');
    } else {
      recommendations.push('Excellent SEO foundation - consider advanced optimizations and content strategy.');
    }

    return recommendations;
  }

  private extractWordPressInfo(pages: CrawlResult[]): {
    version: string;
    theme: string;
    plugins: string[];
    seoPlugins: string[];
  } {
    const allPlugins = new Set<string>();
    const allThemes = new Set<string>();
    const allVersions = new Set<string>();

    pages.forEach(page => {
      page.wordpressPlugins.forEach(plugin => allPlugins.add(plugin));
      if (page.wordpressTheme) allThemes.add(page.wordpressTheme);
      if (page.wordpressVersion) allVersions.add(page.wordpressVersion);
    });

    // Identify SEO plugins
    const seoPlugins = Array.from(allPlugins).filter(plugin =>
      plugin.toLowerCase().includes('yoast') ||
      plugin.toLowerCase().includes('rankmath') ||
      plugin.toLowerCase().includes('seopress') ||
      plugin.toLowerCase().includes('all-in-one-seo') ||
      plugin.toLowerCase().includes('seo')
    );

    return {
      version: Array.from(allVersions)[0] || 'Unknown',
      theme: Array.from(allThemes)[0] || 'Unknown',
      plugins: Array.from(allPlugins),
      seoPlugins,
    };
  }

  private generateSummary(
    pages: CrawlResult[],
    issues: SEOIssue[]
  ): {
    totalPages: number;
    totalIssues: number;
    criticalIssues: number;
    averageLoadTime: number;
    mobileFriendly: boolean;
  } {
    const totalPages = pages.length;
    const totalIssues = issues.length;
    const criticalIssues = issues.filter(issue => issue.impact === 'high').length;
    const averageLoadTime = Math.round(
      pages.reduce((sum, page) => sum + page.loadTime, 0) / totalPages
    );
    const mobileFriendly = true; // This would require additional mobile testing

    return {
      totalPages,
      totalIssues,
      criticalIssues,
      averageLoadTime,
      mobileFriendly,
    };
  }
}
