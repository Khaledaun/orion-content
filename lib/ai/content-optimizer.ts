/**
 * AI-Powered Content Optimization System
 * Advanced content improvement suggestions and optimization
 */

import { logger } from '@/lib/logger';
import { redactSensitive } from '@/lib/redact';

export interface ContentOptimizationSuggestion {
  type: 'seo' | 'readability' | 'engagement' | 'structure' | 'keyword' | 'link';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  currentValue: string | number;
  suggestedValue: string | number;
  impact: 'positive' | 'negative' | 'neutral';
  effort: 'low' | 'medium' | 'high';
  examples: string[];
  implementation: string;
}

export interface ContentAnalysis {
  content: string;
  url: string;
  title: string;
  metaDescription: string;
  keywords: string[];
  analysis: {
    seo: {
      score: number; // 0-100
      issues: ContentOptimizationSuggestion[];
      strengths: string[];
    };
    readability: {
      score: number; // 0-100
      gradeLevel: number;
      issues: ContentOptimizationSuggestion[];
      improvements: string[];
    };
    engagement: {
      score: number; // 0-100
      factors: {
        headlineQuality: number;
        contentLength: number;
        visualElements: number;
        callToAction: number;
        socialProof: number;
      };
      suggestions: ContentOptimizationSuggestion[];
    };
    structure: {
      score: number; // 0-100
      headings: number;
      paragraphs: number;
      lists: number;
      images: number;
      issues: ContentOptimizationSuggestion[];
    };
    keyword: {
      score: number; // 0-100
      density: number;
      placement: number;
      variations: number;
      issues: ContentOptimizationSuggestion[];
    };
    link: {
      score: number; // 0-100
      internalLinks: number;
      externalLinks: number;
      anchorText: string[];
      issues: ContentOptimizationSuggestion[];
    };
  };
  overallScore: number; // 0-100
  recommendations: string[];
  priorityActions: ContentOptimizationSuggestion[];
}

export interface ContentOptimizationResult {
  originalContent: string;
  optimizedContent: string;
  changes: Array<{
    type: 'addition' | 'deletion' | 'modification' | 'replacement';
    original: string;
    modified: string;
    reason: string;
    impact: 'high' | 'medium' | 'low';
  }>;
  improvements: {
    seoImprovement: number;
    readabilityImprovement: number;
    engagementImprovement: number;
    overallImprovement: number;
  };
  suggestions: ContentOptimizationSuggestion[];
  estimatedImpact: {
    trafficIncrease: number; // percentage
    rankingImprovement: number; // positions
    engagementIncrease: number; // percentage
  };
}

export interface ContentTemplate {
  id: string;
  name: string;
  type: 'blog' | 'product' | 'landing' | 'news' | 'tutorial';
  structure: {
    sections: Array<{
      name: string;
      required: boolean;
      minLength: number;
      maxLength: number;
      suggestions: string[];
    }>;
  };
  seoRequirements: {
    titleLength: { min: number; max: number };
    metaDescriptionLength: { min: number; max: number };
    keywordDensity: { min: number; max: number };
    internalLinks: { min: number; max: number };
    externalLinks: { min: number; max: number };
  };
  readabilityTargets: {
    gradeLevel: { min: number; max: number };
    sentenceLength: { min: number; max: number };
    paragraphLength: { min: number; max: number };
  };
}

export class ContentOptimizer {
  private readonly maxContentLength = 10000;
  private readonly minContentLength = 300;

  async analyzeContent(
    content: string,
    url: string,
    title: string,
    metaDescription: string,
    keywords: string[]
  ): Promise<ContentAnalysis> {
    try {
      logger.info(
        { url: redactSensitive(url), keywords: redactSensitive(keywords) },
        'Starting content analysis'
      );

      // Analyze different aspects of the content
      const seoAnalysis = this.analyzeSEO(content, title, metaDescription, keywords);
      const readabilityAnalysis = this.analyzeReadability(content);
      const engagementAnalysis = this.analyzeEngagement(content, title);
      const structureAnalysis = this.analyzeStructure(content);
      const keywordAnalysis = this.analyzeKeywords(content, keywords);
      const linkAnalysis = this.analyzeLinks(content);

      // Calculate overall score
      const overallScore = this.calculateOverallScore([
        seoAnalysis.score,
        readabilityAnalysis.score,
        engagementAnalysis.score,
        structureAnalysis.score,
        keywordAnalysis.score,
        linkAnalysis.score,
      ]);

      // Generate recommendations
      const recommendations = this.generateRecommendations([
        ...seoAnalysis.issues,
        ...readabilityAnalysis.issues,
        ...engagementAnalysis.suggestions,
        ...structureAnalysis.issues,
        ...keywordAnalysis.issues,
        ...linkAnalysis.issues,
      ]);

      // Get priority actions
      const priorityActions = this.getPriorityActions([
        ...seoAnalysis.issues,
        ...readabilityAnalysis.issues,
        ...engagementAnalysis.suggestions,
        ...structureAnalysis.issues,
        ...keywordAnalysis.issues,
        ...linkAnalysis.issues,
      ]);

      const analysis: ContentAnalysis = {
        content,
        url,
        title,
        metaDescription,
        keywords,
        analysis: {
          seo: seoAnalysis,
          readability: readabilityAnalysis,
          engagement: engagementAnalysis,
          structure: structureAnalysis,
          keyword: keywordAnalysis,
          link: linkAnalysis,
        },
        overallScore,
        recommendations,
        priorityActions,
      };

      logger.info(
        { url: redactSensitive(url), overallScore },
        'Content analysis completed'
      );

      return analysis;
    } catch (error) {
      logger.error(
        { error: redactSensitive(error), url: redactSensitive(url) },
        'Content analysis failed'
      );
      throw error;
    }
  }

  async optimizeContent(
    content: string,
    analysis: ContentAnalysis,
    targetKeywords: string[]
  ): Promise<ContentOptimizationResult> {
    try {
      logger.info(
        { targetKeywords: redactSensitive(targetKeywords) },
        'Starting content optimization'
      );

      let optimizedContent = content;
      const changes: ContentOptimizationResult['changes'] = [];

      // Apply SEO optimizations
      const seoOptimizations = this.applySEOOptimizations(optimizedContent, analysis, targetKeywords);
      optimizedContent = seoOptimizations.content;
      changes.push(...seoOptimizations.changes);

      // Apply readability optimizations
      const readabilityOptimizations = this.applyReadabilityOptimizations(optimizedContent, analysis);
      optimizedContent = readabilityOptimizations.content;
      changes.push(...readabilityOptimizations.changes);

      // Apply engagement optimizations
      const engagementOptimizations = this.applyEngagementOptimizations(optimizedContent, analysis);
      optimizedContent = engagementOptimizations.content;
      changes.push(...engagementOptimizations.changes);

      // Apply structure optimizations
      const structureOptimizations = this.applyStructureOptimizations(optimizedContent, analysis);
      optimizedContent = structureOptimizations.content;
      changes.push(...structureOptimizations.changes);

      // Apply keyword optimizations
      const keywordOptimizations = this.applyKeywordOptimizations(optimizedContent, analysis, targetKeywords);
      optimizedContent = keywordOptimizations.content;
      changes.push(...keywordOptimizations.changes);

      // Apply link optimizations
      const linkOptimizations = this.applyLinkOptimizations(optimizedContent, analysis);
      optimizedContent = linkOptimizations.content;
      changes.push(...linkOptimizations.changes);

      // Calculate improvements
      const improvements = this.calculateImprovements(content, optimizedContent, analysis);

      // Get optimization suggestions
      const suggestions = this.getOptimizationSuggestions(analysis);

      // Estimate impact
      const estimatedImpact = this.estimateImpact(improvements, changes);

      const result: ContentOptimizationResult = {
        originalContent: content,
        optimizedContent,
        changes,
        improvements,
        suggestions,
        estimatedImpact,
      };

      logger.info(
        { changesCount: changes.length, overallImprovement: improvements.overallImprovement },
        'Content optimization completed'
      );

      return result;
    } catch (error) {
      logger.error(
        { error: redactSensitive(error) },
        'Content optimization failed'
      );
      throw error;
    }
  }

  async generateContentTemplate(
    contentType: string,
    targetKeywords: string[],
    contentLength: 'short' | 'medium' | 'long'
  ): Promise<ContentTemplate> {
    try {
      logger.info(
        { contentType, targetKeywords: redactSensitive(targetKeywords), contentLength },
        'Generating content template'
      );

      const template: ContentTemplate = {
        id: this.generateTemplateId(),
        name: `${contentType} template for ${targetKeywords[0]}`,
        type: contentType as any,
        structure: this.getContentStructure(contentType, contentLength),
        seoRequirements: this.getSEORequirements(contentType),
        readabilityTargets: this.getReadabilityTargets(contentType),
      };

      return template;
    } catch (error) {
      logger.error(
        { error: redactSensitive(error), contentType },
        'Failed to generate content template'
      );
      throw error;
    }
  }

  private analyzeSEO(
    content: string,
    title: string,
    metaDescription: string,
    keywords: string[]
  ): ContentAnalysis['analysis']['seo'] {
    const issues: ContentOptimizationSuggestion[] = [];
    const strengths: string[] = [];
    let score = 100;

    // Title analysis
    if (title.length < 30) {
      issues.push({
        type: 'seo',
        priority: 'high',
        title: 'Title too short',
        description: 'Title should be at least 30 characters for better SEO',
        currentValue: title.length,
        suggestedValue: 30,
        impact: 'positive',
        effort: 'low',
        examples: [`"${title}" → "${title} - Complete Guide"`],
        implementation: 'Add descriptive words to make the title longer and more compelling',
      });
      score -= 15;
    } else if (title.length > 60) {
      issues.push({
        type: 'seo',
        priority: 'medium',
        title: 'Title too long',
        description: 'Title should be under 60 characters to avoid truncation',
        currentValue: title.length,
        suggestedValue: 60,
        impact: 'positive',
        effort: 'low',
        examples: [`"${title}" → "${title.substring(0, 57)}..."`],
        implementation: 'Shorten the title while keeping the main keyword',
      });
      score -= 10;
    } else {
      strengths.push('Title length is optimal');
    }

    // Meta description analysis
    if (metaDescription.length < 120) {
      issues.push({
        type: 'seo',
        priority: 'medium',
        title: 'Meta description too short',
        description: 'Meta description should be at least 120 characters',
        currentValue: metaDescription.length,
        suggestedValue: 120,
        impact: 'positive',
        effort: 'low',
        examples: [`"${metaDescription}" → "${metaDescription} Learn more about this topic and discover valuable insights."`],
        implementation: 'Add compelling description to encourage clicks',
      });
      score -= 10;
    } else if (metaDescription.length > 160) {
      issues.push({
        type: 'seo',
        priority: 'low',
        title: 'Meta description too long',
        description: 'Meta description should be under 160 characters',
        currentValue: metaDescription.length,
        suggestedValue: 160,
        impact: 'positive',
        effort: 'low',
        examples: [`"${metaDescription}" → "${metaDescription.substring(0, 157)}..."`],
        implementation: 'Shorten the meta description while keeping key information',
      });
      score -= 5;
    } else {
      strengths.push('Meta description length is optimal');
    }

    // Keyword analysis
    if (keywords.length > 0) {
      const primaryKeyword = keywords[0];
      const keywordCount = (content.toLowerCase().match(new RegExp(primaryKeyword.toLowerCase(), 'g')) || []).length;
      const wordCount = content.split(/\s+/).length;
      const keywordDensity = keywordCount / wordCount;

      if (keywordDensity < 0.01) {
        issues.push({
          type: 'seo',
          priority: 'high',
          title: 'Low keyword density',
          description: `Primary keyword "${primaryKeyword}" appears too rarely`,
          currentValue: `${(keywordDensity * 100).toFixed(2)}%`,
          suggestedValue: '1-2%',
          impact: 'positive',
          effort: 'medium',
          examples: [`Add "${primaryKeyword}" naturally in the content`],
          implementation: 'Include the primary keyword more naturally throughout the content',
        });
        score -= 20;
      } else if (keywordDensity > 0.03) {
        issues.push({
          type: 'seo',
          priority: 'high',
          title: 'High keyword density',
          description: `Primary keyword "${primaryKeyword}" appears too frequently`,
          currentValue: `${(keywordDensity * 100).toFixed(2)}%`,
          suggestedValue: '1-2%',
          impact: 'positive',
          effort: 'medium',
          examples: [`Reduce "${primaryKeyword}" usage and add synonyms`],
          implementation: 'Use keyword variations and synonyms to avoid over-optimization',
        });
        score -= 15;
      } else {
        strengths.push('Keyword density is optimal');
      }
    }

    return {
      score: Math.max(0, score),
      issues,
      strengths,
    };
  }

  private analyzeReadability(content: string): ContentAnalysis['analysis']['readability'] {
    const issues: ContentOptimizationSuggestion[] = [];
    const improvements: string[] = [];
    let score = 100;

    // Sentence length analysis
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const avgSentenceLength = sentences.reduce((sum, sentence) => sum + sentence.split(/\s+/).length, 0) / sentences.length;

    if (avgSentenceLength > 20) {
      issues.push({
        type: 'readability',
        priority: 'medium',
        title: 'Sentences too long',
        description: 'Average sentence length is too high for good readability',
        currentValue: avgSentenceLength.toFixed(1),
        suggestedValue: 15,
        impact: 'positive',
        effort: 'medium',
        examples: ['Break long sentences into shorter, clearer ones'],
        implementation: 'Split complex sentences into simpler, more digestible parts',
      });
      score -= 15;
    } else {
      improvements.push('Sentence length is good for readability');
    }

    // Paragraph length analysis
    const paragraphs = content.split(/\n\s*\n/).filter(p => p.trim().length > 0);
    const avgParagraphLength = paragraphs.reduce((sum, paragraph) => sum + paragraph.split(/\s+/).length, 0) / paragraphs.length;

    if (avgParagraphLength > 150) {
      issues.push({
        type: 'readability',
        priority: 'medium',
        title: 'Paragraphs too long',
        description: 'Average paragraph length is too high for online reading',
        currentValue: avgParagraphLength.toFixed(0),
        suggestedValue: 100,
        impact: 'positive',
        effort: 'low',
        examples: ['Break long paragraphs into shorter ones'],
        implementation: 'Split long paragraphs into 2-3 shorter paragraphs',
      });
      score -= 10;
    } else {
      improvements.push('Paragraph length is appropriate for online reading');
    }

    // Grade level calculation (simplified Flesch-Kincaid)
    const gradeLevel = this.calculateGradeLevel(content);

    if (gradeLevel > 12) {
      issues.push({
        type: 'readability',
        priority: 'high',
        title: 'Content too complex',
        description: 'Content is written at a college level, which may be too complex for general audience',
        currentValue: gradeLevel,
        suggestedValue: 8,
        impact: 'positive',
        effort: 'high',
        examples: ['Use simpler words and shorter sentences'],
        implementation: 'Simplify vocabulary and sentence structure for broader accessibility',
      });
      score -= 20;
    } else {
      improvements.push('Content complexity is appropriate for general audience');
    }

    return {
      score: Math.max(0, score),
      gradeLevel,
      issues,
      improvements,
    };
  }

  private analyzeEngagement(content: string, title: string): ContentAnalysis['analysis']['engagement'] {
    const suggestions: ContentOptimizationSuggestion[] = [];
    let score = 100;

    // Headline quality
    const headlineQuality = this.analyzeHeadlineQuality(title);
    if (headlineQuality < 70) {
      suggestions.push({
        type: 'engagement',
        priority: 'high',
        title: 'Improve headline',
        description: 'Headline could be more engaging and click-worthy',
        currentValue: headlineQuality,
        suggestedValue: 80,
        impact: 'positive',
        effort: 'low',
        examples: ['Add power words, numbers, or emotional triggers'],
        implementation: 'Rewrite headline to be more compelling and attention-grabbing',
      });
      score -= 20;
    }

    // Content length
    const wordCount = content.split(/\s+/).length;
    if (wordCount < 300) {
      suggestions.push({
        type: 'engagement',
        priority: 'medium',
        title: 'Content too short',
        description: 'Content is too short for comprehensive coverage',
        currentValue: wordCount,
        suggestedValue: 800,
        impact: 'positive',
        effort: 'high',
        examples: ['Add more detailed information and examples'],
        implementation: 'Expand content with more valuable information and examples',
      });
      score -= 15;
    }

    // Visual elements
    const imageCount = (content.match(/!\[.*?\]\(.*?\)/g) || []).length;
    if (imageCount === 0) {
      suggestions.push({
        type: 'engagement',
        priority: 'medium',
        title: 'Add visual elements',
        description: 'Content lacks visual elements that improve engagement',
        currentValue: imageCount,
        suggestedValue: 3,
        impact: 'positive',
        effort: 'medium',
        examples: ['Add relevant images, charts, or infographics'],
        implementation: 'Include relevant images and visual elements to break up text',
      });
      score -= 10;
    }

    // Call to action
    const hasCTA = /(click here|learn more|read more|get started|sign up|download|buy now)/i.test(content);
    if (!hasCTA) {
      suggestions.push({
        type: 'engagement',
        priority: 'medium',
        title: 'Add call to action',
        description: 'Content lacks a clear call to action',
        currentValue: false,
        suggestedValue: true,
        impact: 'positive',
        effort: 'low',
        examples: ['Add a compelling call to action at the end'],
        implementation: 'Include a clear call to action to guide reader behavior',
      });
      score -= 10;
    }

    return {
      score: Math.max(0, score),
      factors: {
        headlineQuality,
        contentLength: wordCount,
        visualElements: imageCount,
        callToAction: hasCTA ? 100 : 0,
        socialProof: 50, // Mock value
      },
      suggestions,
    };
  }

  private analyzeStructure(content: string): ContentAnalysis['analysis']['structure'] {
    const issues: ContentOptimizationSuggestion[] = [];
    let score = 100;

    const headings = (content.match(/^#{1,6}\s/gm) || []).length;
    const paragraphs = content.split(/\n\s*\n/).filter(p => p.trim().length > 0).length;
    const lists = (content.match(/^[\*\-\+]\s/gm) || []).length;
    const images = (content.match(/!\[.*?\]\(.*?\)/g) || []).length;

    // Heading structure
    if (headings < 3) {
      issues.push({
        type: 'structure',
        priority: 'medium',
        title: 'Insufficient headings',
        description: 'Content needs more headings for better structure',
        currentValue: headings,
        suggestedValue: 5,
        impact: 'positive',
        effort: 'medium',
        examples: ['Add H2 and H3 headings to organize content'],
        implementation: 'Break content into logical sections with descriptive headings',
      });
      score -= 15;
    }

    // List usage
    if (lists < 2) {
      issues.push({
        type: 'structure',
        priority: 'low',
        title: 'Add more lists',
        description: 'Lists improve readability and engagement',
        currentValue: lists,
        suggestedValue: 3,
        impact: 'positive',
        effort: 'low',
        examples: ['Convert some paragraphs to bullet points or numbered lists'],
        implementation: 'Use lists to present information in a scannable format',
      });
      score -= 5;
    }

    return {
      score: Math.max(0, score),
      headings,
      paragraphs,
      lists,
      images,
      issues,
    };
  }

  private analyzeKeywords(content: string, keywords: string[]): ContentAnalysis['analysis']['keyword'] {
    const issues: ContentOptimizationSuggestion[] = [];
    let score = 100;

    if (keywords.length === 0) {
      return {
        score: 0,
        density: 0,
        placement: 0,
        variations: 0,
        issues: [{
          type: 'keyword',
          priority: 'high',
          title: 'No keywords specified',
          description: 'Content analysis requires target keywords',
          currentValue: 0,
          suggestedValue: 1,
          impact: 'positive',
          effort: 'low',
          examples: ['Specify target keywords for optimization'],
          implementation: 'Define primary and secondary keywords for the content',
        }],
      };
    }

    const primaryKeyword = keywords[0];
    const wordCount = content.split(/\s+/).length;
    const keywordCount = (content.toLowerCase().match(new RegExp(primaryKeyword.toLowerCase(), 'g')) || []).length;
    const density = keywordCount / wordCount;

    // Keyword density
    if (density < 0.01) {
      issues.push({
        type: 'keyword',
        priority: 'high',
        title: 'Low keyword density',
        description: `Primary keyword "${primaryKeyword}" appears too rarely`,
        currentValue: `${(density * 100).toFixed(2)}%`,
        suggestedValue: '1-2%',
        impact: 'positive',
        effort: 'medium',
        examples: [`Add "${primaryKeyword}" naturally in the content`],
        implementation: 'Include the primary keyword more frequently throughout the content',
      });
      score -= 20;
    }

    // Keyword placement
    const titleHasKeyword = content.toLowerCase().includes(primaryKeyword.toLowerCase());
    const firstParagraphHasKeyword = content.split('\n')[0].toLowerCase().includes(primaryKeyword.toLowerCase());

    if (!titleHasKeyword) {
      issues.push({
        type: 'keyword',
        priority: 'high',
        title: 'Keyword not in title',
        description: `Primary keyword "${primaryKeyword}" should appear in the title`,
        currentValue: false,
        suggestedValue: true,
        impact: 'positive',
        effort: 'low',
        examples: [`Include "${primaryKeyword}" in the title`],
        implementation: 'Add the primary keyword to the title for better SEO',
      });
      score -= 15;
    }

    if (!firstParagraphHasKeyword) {
      issues.push({
        type: 'keyword',
        priority: 'medium',
        title: 'Keyword not in first paragraph',
        description: `Primary keyword "${primaryKeyword}" should appear early in the content`,
        currentValue: false,
        suggestedValue: true,
        impact: 'positive',
        effort: 'low',
        examples: [`Include "${primaryKeyword}" in the first paragraph`],
        implementation: 'Add the primary keyword to the first paragraph',
      });
      score -= 10;
    }

    return {
      score: Math.max(0, score),
      density,
      placement: (titleHasKeyword ? 50 : 0) + (firstParagraphHasKeyword ? 50 : 0),
      variations: keywords.length,
      issues,
    };
  }

  private analyzeLinks(content: string): ContentAnalysis['analysis']['link'] {
    const issues: ContentOptimizationSuggestion[] = [];
    let score = 100;

    const internalLinks = (content.match(/\[([^\]]+)\]\([^http][^)]+\)/g) || []).length;
    const externalLinks = (content.match(/\[([^\]]+)\]\(https?:\/\/[^)]+\)/g) || []).length;
    const anchorTexts = (content.match(/\[([^\]]+)\]/g) || []).map(match => match.slice(1, -1));

    // Internal links
    if (internalLinks < 2) {
      issues.push({
        type: 'link',
        priority: 'medium',
        title: 'Insufficient internal links',
        description: 'Content needs more internal links for better site structure',
        currentValue: internalLinks,
        suggestedValue: 3,
        impact: 'positive',
        effort: 'medium',
        examples: ['Link to related pages on your site'],
        implementation: 'Add internal links to relevant pages on your website',
      });
      score -= 10;
    }

    // External links
    if (externalLinks === 0) {
      issues.push({
        type: 'link',
        priority: 'low',
        title: 'No external links',
        description: 'External links can add authority and value',
        currentValue: externalLinks,
        suggestedValue: 2,
        impact: 'positive',
        effort: 'medium',
        examples: ['Link to authoritative external sources'],
        implementation: 'Add links to relevant external sources and references',
      });
      score -= 5;
    }

    // Anchor text quality
    const genericAnchors = anchorTexts.filter(text => 
      ['click here', 'read more', 'here', 'this', 'link'].includes(text.toLowerCase())
    );

    if (genericAnchors.length > 0) {
      issues.push({
        type: 'link',
        priority: 'medium',
        title: 'Generic anchor text',
        description: 'Some links use generic anchor text',
        currentValue: genericAnchors.length,
        suggestedValue: 0,
        impact: 'positive',
        effort: 'low',
        examples: ['Use descriptive anchor text instead of "click here"'],
        implementation: 'Replace generic anchor text with descriptive, keyword-rich text',
      });
      score -= 10;
    }

    return {
      score: Math.max(0, score),
      internalLinks,
      externalLinks,
      anchorText: anchorTexts,
      issues,
    };
  }

  private calculateOverallScore(scores: number[]): number {
    return Math.floor(scores.reduce((sum, score) => sum + score, 0) / scores.length);
  }

  private generateRecommendations(suggestions: ContentOptimizationSuggestion[]): string[] {
    const recommendations: string[] = [];
    const highPriority = suggestions.filter(s => s.priority === 'high');
    const mediumPriority = suggestions.filter(s => s.priority === 'medium');

    if (highPriority.length > 0) {
      recommendations.push(`Address ${highPriority.length} high-priority issues first`);
    }

    if (mediumPriority.length > 0) {
      recommendations.push(`Focus on ${mediumPriority.length} medium-priority improvements`);
    }

    recommendations.push('Review all suggestions and implement based on your content strategy');
    recommendations.push('Monitor performance after implementing changes');

    return recommendations;
  }

  private getPriorityActions(suggestions: ContentOptimizationSuggestion[]): ContentOptimizationSuggestion[] {
    return suggestions
      .filter(s => s.priority === 'high')
      .sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      })
      .slice(0, 5);
  }

  private calculateGradeLevel(content: string): number {
    // Simplified Flesch-Kincaid Grade Level calculation
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const words = content.split(/\s+/).filter(w => w.length > 0);
    const syllables = words.reduce((sum, word) => sum + this.countSyllables(word), 0);

    const avgWordsPerSentence = words.length / sentences.length;
    const avgSyllablesPerWord = syllables / words.length;

    return Math.round(0.39 * avgWordsPerSentence + 11.8 * avgSyllablesPerWord - 15.59);
  }

  private countSyllables(word: string): number {
    // Simplified syllable counting
    const vowels = 'aeiouy';
    let count = 0;
    let previousWasVowel = false;

    for (let i = 0; i < word.length; i++) {
      const isVowel = vowels.includes(word[i].toLowerCase());
      if (isVowel && !previousWasVowel) {
        count++;
      }
      previousWasVowel = isVowel;
    }

    // Handle silent 'e'
    if (word.toLowerCase().endsWith('e')) {
      count--;
    }

    return Math.max(1, count);
  }

  private analyzeHeadlineQuality(title: string): number {
    let score = 50;

    // Length check
    if (title.length >= 30 && title.length <= 60) {
      score += 20;
    }

    // Power words
    const powerWords = ['ultimate', 'complete', 'essential', 'proven', 'secret', 'guide', 'tips', 'tricks'];
    const hasPowerWords = powerWords.some(word => title.toLowerCase().includes(word));
    if (hasPowerWords) {
      score += 15;
    }

    // Numbers
    const hasNumbers = /\d/.test(title);
    if (hasNumbers) {
      score += 10;
    }

    // Emotional triggers
    const emotionalWords = ['amazing', 'incredible', 'shocking', 'surprising', 'unexpected'];
    const hasEmotionalWords = emotionalWords.some(word => title.toLowerCase().includes(word));
    if (hasEmotionalWords) {
      score += 5;
    }

    return Math.min(100, score);
  }

  private applySEOOptimizations(
    content: string,
    analysis: ContentAnalysis,
    targetKeywords: string[]
  ): { content: string; changes: ContentOptimizationResult['changes'] } {
    let optimizedContent = content;
    const changes: ContentOptimizationResult['changes'] = [];

    // Apply high-priority SEO suggestions
    const seoSuggestions = analysis.analysis.seo.issues.filter(s => s.priority === 'high');
    
    seoSuggestions.forEach(suggestion => {
      if (suggestion.type === 'seo' && suggestion.title.includes('keyword density')) {
        // Add keyword naturally
        const primaryKeyword = targetKeywords[0];
        if (primaryKeyword) {
          const insertPosition = Math.floor(optimizedContent.length * 0.3);
          const beforeText = optimizedContent.substring(0, insertPosition);
          const afterText = optimizedContent.substring(insertPosition);
          optimizedContent = beforeText + ` ${primaryKeyword} ` + afterText;
          
          changes.push({
            type: 'addition',
            original: '',
            modified: primaryKeyword,
            reason: 'Increase keyword density',
            impact: 'high',
          });
        }
      }
    });

    return { content: optimizedContent, changes };
  }

  private applyReadabilityOptimizations(
    content: string,
    analysis: ContentAnalysis
  ): { content: string; changes: ContentOptimizationResult['changes'] } {
    let optimizedContent = content;
    const changes: ContentOptimizationResult['changes'] = [];

    // Apply readability improvements
    const readabilitySuggestions = analysis.analysis.readability.issues.filter(s => s.priority === 'high');
    
    readabilitySuggestions.forEach(suggestion => {
      if (suggestion.title.includes('Sentences too long')) {
        // Break long sentences (simplified)
        optimizedContent = optimizedContent.replace(/([.!?])\s+([A-Z])/g, '$1\n\n$2');
        changes.push({
          type: 'modification',
          original: 'Long sentences',
          modified: 'Shorter sentences',
          reason: 'Improve readability',
          impact: 'medium',
        });
      }
    });

    return { content: optimizedContent, changes };
  }

  private applyEngagementOptimizations(
    content: string,
    analysis: ContentAnalysis
  ): { content: string; changes: ContentOptimizationResult['changes'] } {
    let optimizedContent = content;
    const changes: ContentOptimizationResult['changes'] = [];

    // Add call to action if missing
    const engagementSuggestions = analysis.analysis.engagement.suggestions.filter(s => s.title.includes('call to action'));
    
    if (engagementSuggestions.length > 0) {
      optimizedContent += '\n\n**Ready to get started?** [Learn more about our services](/contact) or [contact us today](/contact) for a free consultation.';
      changes.push({
        type: 'addition',
        original: '',
        modified: 'Call to action',
        reason: 'Improve engagement',
        impact: 'medium',
      });
    }

    return { content: optimizedContent, changes };
  }

  private applyStructureOptimizations(
    content: string,
    analysis: ContentAnalysis
  ): { content: string; changes: ContentOptimizationResult['changes'] } {
    let optimizedContent = content;
    const changes: ContentOptimizationResult['changes'] = [];

    // Add headings if needed
    const structureSuggestions = analysis.analysis.structure.issues.filter(s => s.title.includes('headings'));
    
    if (structureSuggestions.length > 0) {
      // Add a sample heading (in production, this would be more sophisticated)
      optimizedContent = '## Key Points\n\n' + optimizedContent;
      changes.push({
        type: 'addition',
        original: '',
        modified: '## Key Points',
        reason: 'Improve structure',
        impact: 'medium',
      });
    }

    return { content: optimizedContent, changes };
  }

  private applyKeywordOptimizations(
    content: string,
    analysis: ContentAnalysis,
    targetKeywords: string[]
  ): { content: string; changes: ContentOptimizationResult['changes'] } {
    let optimizedContent = content;
    const changes: ContentOptimizationResult['changes'] = [];

    // Apply keyword optimizations
    const keywordSuggestions = analysis.analysis.keyword.issues.filter(s => s.priority === 'high');
    
    keywordSuggestions.forEach(suggestion => {
      if (suggestion.title.includes('not in first paragraph')) {
        const primaryKeyword = targetKeywords[0];
        if (primaryKeyword) {
          const firstParagraph = optimizedContent.split('\n')[0];
          optimizedContent = optimizedContent.replace(firstParagraph, `${primaryKeyword} - ${firstParagraph}`);
          
          changes.push({
            type: 'modification',
            original: firstParagraph,
            modified: `${primaryKeyword} - ${firstParagraph}`,
            reason: 'Add keyword to first paragraph',
            impact: 'high',
          });
        }
      }
    });

    return { content: optimizedContent, changes };
  }

  private applyLinkOptimizations(
    content: string,
    analysis: ContentAnalysis
  ): { content: string; changes: ContentOptimizationResult['changes'] } {
    let optimizedContent = content;
    const changes: ContentOptimizationResult['changes'] = [];

    // Add internal links if needed
    const linkSuggestions = analysis.analysis.link.issues.filter(s => s.title.includes('internal links'));
    
    if (linkSuggestions.length > 0) {
      optimizedContent += '\n\nFor more information, check out our [related articles](/articles) and [resources](/resources).';
      changes.push({
        type: 'addition',
        original: '',
        modified: 'Internal links',
        reason: 'Improve site structure',
        impact: 'medium',
      });
    }

    return { content: optimizedContent, changes };
  }

  private calculateImprovements(
    originalContent: string,
    optimizedContent: string,
    analysis: ContentAnalysis
  ): ContentOptimizationResult['improvements'] {
    // Simplified improvement calculation
    const seoImprovement = 15; // Mock improvement
    const readabilityImprovement = 10; // Mock improvement
    const engagementImprovement = 20; // Mock improvement
    const overallImprovement = Math.floor((seoImprovement + readabilityImprovement + engagementImprovement) / 3);

    return {
      seoImprovement,
      readabilityImprovement,
      engagementImprovement,
      overallImprovement,
    };
  }

  private getOptimizationSuggestions(analysis: ContentAnalysis): ContentOptimizationSuggestion[] {
    return [
      ...analysis.analysis.seo.issues,
      ...analysis.analysis.readability.issues,
      ...analysis.analysis.engagement.suggestions,
      ...analysis.analysis.structure.issues,
      ...analysis.analysis.keyword.issues,
      ...analysis.analysis.link.issues,
    ].slice(0, 10); // Limit to top 10 suggestions
  }

  private estimateImpact(
    improvements: ContentOptimizationResult['improvements'],
    changes: ContentOptimizationResult['changes']
  ): ContentOptimizationResult['estimatedImpact'] {
    // Simplified impact estimation
    const trafficIncrease = Math.min(50, improvements.overallImprovement * 2);
    const rankingImprovement = Math.min(10, Math.floor(improvements.overallImprovement / 5));
    const engagementIncrease = Math.min(30, improvements.engagementImprovement);

    return {
      trafficIncrease,
      rankingImprovement,
      engagementIncrease,
    };
  }

  private getContentStructure(contentType: string, contentLength: string): ContentTemplate['structure'] {
    const baseStructure = {
      sections: [
        {
          name: 'Introduction',
          required: true,
          minLength: 100,
          maxLength: 300,
          suggestions: ['Hook the reader', 'Introduce the topic', 'Preview what they\'ll learn'],
        },
        {
          name: 'Main Content',
          required: true,
          minLength: 500,
          maxLength: 2000,
          suggestions: ['Provide valuable information', 'Use examples', 'Include data'],
        },
        {
          name: 'Conclusion',
          required: true,
          minLength: 100,
          maxLength: 200,
          suggestions: ['Summarize key points', 'Provide next steps', 'Include call to action'],
        },
      ],
    };

    // Adjust based on content length
    if (contentLength === 'long') {
      baseStructure.sections[1].minLength = 1000;
      baseStructure.sections[1].maxLength = 3000;
    } else if (contentLength === 'short') {
      baseStructure.sections[1].minLength = 200;
      baseStructure.sections[1].maxLength = 800;
    }

    return baseStructure;
  }

  private getSEORequirements(contentType: string): ContentTemplate['seoRequirements'] {
    return {
      titleLength: { min: 30, max: 60 },
      metaDescriptionLength: { min: 120, max: 160 },
      keywordDensity: { min: 0.01, max: 0.03 },
      internalLinks: { min: 2, max: 5 },
      externalLinks: { min: 1, max: 3 },
    };
  }

  private getReadabilityTargets(contentType: string): ContentTemplate['readabilityTargets'] {
    return {
      gradeLevel: { min: 6, max: 10 },
      sentenceLength: { min: 10, max: 20 },
      paragraphLength: { min: 50, max: 150 },
    };
  }

  private generateTemplateId(): string {
    return `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
