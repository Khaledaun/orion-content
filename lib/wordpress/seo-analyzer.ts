/**
 * WordPress SEO Analyzer
 * Specialized analyzer for WordPress-specific SEO features
 */

import { CrawlResult } from '@/lib/seo/crawler';
import { logger } from '@/lib/logger';
import { redactSensitive } from '@/lib/redact';

export interface WordPressSEOInfo {
  version: string;
  theme: {
    name: string;
    version: string;
    seoOptimized: boolean;
  };
  plugins: {
    name: string;
    version: string;
    type: 'seo' | 'performance' | 'security' | 'other';
    active: boolean;
  }[];
  seoPlugins: {
    name: string;
    version: string;
    features: string[];
    configured: boolean;
  }[];
  permalinkStructure: string;
  sitemap: {
    exists: boolean;
    url?: string;
    lastModified?: Date;
  };
  robotsTxt: {
    exists: boolean;
    content?: string;
  };
  schemaMarkup: {
    exists: boolean;
    types: string[];
  };
  caching: {
    enabled: boolean;
    plugins: string[];
  };
}

export interface WordPressSEORecommendations {
  critical: string[];
  important: string[];
  optional: string[];
  plugins: {
    install: string[];
    configure: string[];
    update: string[];
  };
}

export class WordPressSEOAnalyzer {
  private readonly seoPlugins = [
    'yoast-seo',
    'wordpress-seo',
    'rankmath',
    'seopress',
    'all-in-one-seo-pack',
    'the-seo-framework',
    'slim-seo',
  ];

  private readonly performancePlugins = [
    'wp-rocket',
    'w3-total-cache',
    'wp-super-cache',
    'litespeed-cache',
    'autoptimize',
    'wp-optimize',
  ];

  analyzeWordPressSEO(pages: CrawlResult[], siteUrl: string): {
    info: WordPressSEOInfo;
    recommendations: WordPressSEORecommendations;
    score: number;
  } {
    logger.info({ siteUrl: redactSensitive(siteUrl) }, 'Analyzing WordPress SEO');

    const info = this.extractWordPressInfo(pages, siteUrl);
    const recommendations = this.generateRecommendations(info);
    const score = this.calculateWordPressSEOScore(info);

    return { info, recommendations, score };
  }

  private extractWordPressInfo(pages: CrawlResult[], siteUrl: string): WordPressSEOInfo {
    const homepage = pages[0];
    if (!homepage) {
      throw new Error('No homepage found for WordPress analysis');
    }

    // Extract WordPress version
    const version = homepage.wordpressVersion || 'Unknown';

    // Extract theme information
    const theme = this.extractThemeInfo(homepage);

    // Extract plugins
    const plugins = this.extractPluginInfo(homepage);

    // Extract SEO plugins
    const seoPlugins = this.extractSEOPluginInfo(homepage);

    // Analyze permalink structure
    const permalinkStructure = this.analyzePermalinkStructure(homepage.url);

    // Check for sitemap
    const sitemap = this.checkSitemap(siteUrl);

    // Check for robots.txt
    const robotsTxt = this.checkRobotsTxt(siteUrl);

    // Check for schema markup
    const schemaMarkup = this.checkSchemaMarkup(homepage);

    // Check for caching
    const caching = this.checkCaching(homepage);

    return {
      version,
      theme,
      plugins,
      seoPlugins,
      permalinkStructure,
      sitemap,
      robotsTxt,
      schemaMarkup,
      caching,
    };
  }

  private extractThemeInfo(page: CrawlResult): WordPressSEOInfo['theme'] {
    const themeName = page.wordpressTheme || 'Unknown';
    
    // Check if theme is SEO-optimized (basic check)
    const seoOptimized = this.isSEOOptimizedTheme(page);

    return {
      name: themeName,
      version: 'Unknown', // Would need additional parsing
      seoOptimized,
    };
  }

  private extractPluginInfo(page: CrawlResult): WordPressSEOInfo['plugins'] {
    return page.wordpressPlugins.map(plugin => ({
      name: plugin,
      version: 'Unknown', // Would need additional parsing
      type: this.categorizePlugin(plugin),
      active: true, // If detected, assume active
    }));
  }

  private extractSEOPluginInfo(page: CrawlResult): WordPressSEOInfo['seoPlugins'] {
    const seoPlugins = page.wordpressPlugins.filter(plugin =>
      this.seoPlugins.some(seoPlugin => 
        plugin.toLowerCase().includes(seoPlugin.toLowerCase())
      )
    );

    return seoPlugins.map(plugin => ({
      name: plugin,
      version: 'Unknown',
      features: this.getSEOPluginFeatures(plugin),
      configured: this.isSEOPluginConfigured(page, plugin),
    }));
  }

  private categorizePlugin(pluginName: string): 'seo' | 'performance' | 'security' | 'other' {
    const name = pluginName.toLowerCase();
    
    if (this.seoPlugins.some(seo => name.includes(seo))) {
      return 'seo';
    }
    
    if (this.performancePlugins.some(perf => name.includes(perf))) {
      return 'performance';
    }
    
    if (name.includes('security') || name.includes('firewall') || name.includes('malware')) {
      return 'security';
    }
    
    return 'other';
  }

  private isSEOOptimizedTheme(page: CrawlResult): boolean {
    // Basic checks for SEO-optimized theme
    const hasProperHeadings = page.headings.h1.length === 1;
    const hasMetaDescription = !!page.metaDescription;
    const hasTitle = !!page.title;
    const hasSchemaMarkup = page.scripts.some(script => 
      script.includes('schema.org') || script.includes('json-ld')
    );

    return hasProperHeadings && hasMetaDescription && hasTitle && hasSchemaMarkup;
  }

  private getSEOPluginFeatures(pluginName: string): string[] {
    const features: string[] = [];
    const name = pluginName.toLowerCase();

    if (name.includes('yoast')) {
      features.push('meta optimization', 'sitemap generation', 'breadcrumbs', 'social media');
    } else if (name.includes('rankmath')) {
      features.push('meta optimization', 'sitemap generation', 'analytics integration', 'local SEO');
    } else if (name.includes('seopress')) {
      features.push('meta optimization', 'sitemap generation', 'analytics', 'social media');
    }

    return features;
  }

  private isSEOPluginConfigured(page: CrawlResult, pluginName: string): boolean {
    // Basic check - if plugin is detected and page has good SEO elements, assume configured
    const hasGoodSEO = !!page.title && !!page.metaDescription && page.headings.h1.length === 1;
    return hasGoodSEO;
  }

  private analyzePermalinkStructure(url: string): string {
    // Analyze URL structure to determine permalink format
    if (url.includes('/?p=')) {
      return 'Plain';
    } else if (url.includes('/?page_id=')) {
      return 'Numeric';
    } else if (url.includes('/category/') || url.includes('/tag/')) {
      return 'Category and tag bases';
    } else if (url.match(/\/\d{4}\/\d{2}\//)) {
      return 'Date and name based';
    } else if (url.match(/\/\d{4}\/\d{2}\/\d{2}\//)) {
      return 'Date and name based (with day)';
    } else {
      return 'Post name';
    }
  }

  private checkSitemap(siteUrl: string): WordPressSEOInfo['sitemap'] {
    // This would typically make HTTP requests to check for sitemaps
    // For now, return basic structure
    return {
      exists: false, // Would be determined by actual HTTP check
    };
  }

  private checkRobotsTxt(siteUrl: string): WordPressSEOInfo['robotsTxt'] {
    // This would typically make HTTP requests to check robots.txt
    // For now, return basic structure
    return {
      exists: false, // Would be determined by actual HTTP check
    };
  }

  private checkSchemaMarkup(page: CrawlResult): WordPressSEOInfo['schemaMarkup'] {
    const hasSchema = page.scripts.some(script => 
      script.includes('schema.org') || script.includes('json-ld')
    );

    const types: string[] = [];
    if (hasSchema) {
      // Basic schema type detection
      if (page.scripts.some(script => script.includes('Article'))) {
        types.push('Article');
      }
      if (page.scripts.some(script => script.includes('Organization'))) {
        types.push('Organization');
      }
      if (page.scripts.some(script => script.includes('WebSite'))) {
        types.push('WebSite');
      }
    }

    return {
      exists: hasSchema,
      types,
    };
  }

  private checkCaching(page: CrawlResult): WordPressSEOInfo['caching'] {
    const cachingPlugins = page.wordpressPlugins.filter(plugin =>
      this.performancePlugins.some(cachePlugin => 
        plugin.toLowerCase().includes(cachePlugin.toLowerCase())
      )
    );

    return {
      enabled: cachingPlugins.length > 0,
      plugins: cachingPlugins,
    };
  }

  private generateRecommendations(info: WordPressSEOInfo): WordPressSEORecommendations {
    const critical: string[] = [];
    const important: string[] = [];
    const optional: string[] = [];

    // Critical recommendations
    if (info.seoPlugins.length === 0) {
      critical.push('Install a WordPress SEO plugin like Yoast SEO or RankMath');
    }

    if (!info.sitemap.exists) {
      critical.push('Generate and submit an XML sitemap');
    }

    if (!info.robotsTxt.exists) {
      critical.push('Create a robots.txt file');
    }

    // Important recommendations
    if (!info.caching.enabled) {
      important.push('Install a caching plugin to improve page speed');
    }

    if (!info.schemaMarkup.exists) {
      important.push('Add structured data (schema markup) to your content');
    }

    if (info.permalinkStructure === 'Plain' || info.permalinkStructure === 'Numeric') {
      important.push('Change permalink structure to "Post name" for better SEO');
    }

    // Optional recommendations
    if (info.theme.seoOptimized === false) {
      optional.push('Consider switching to an SEO-optimized theme');
    }

    if (info.version === 'Unknown' || this.isOutdatedWordPress(info.version)) {
      optional.push('Update WordPress to the latest version');
    }

    // Plugin recommendations
    const pluginsToInstall: string[] = [];
    const pluginsToConfigure: string[] = [];
    const pluginsToUpdate: string[] = [];

    if (info.seoPlugins.length === 0) {
      pluginsToInstall.push('Yoast SEO', 'RankMath', 'SEOPress');
    }

    info.seoPlugins.forEach(plugin => {
      if (!plugin.configured) {
        pluginsToConfigure.push(plugin.name);
      }
    });

    if (!info.caching.enabled) {
      pluginsToInstall.push('WP Rocket', 'W3 Total Cache', 'LiteSpeed Cache');
    }

    return {
      critical,
      important,
      optional,
      plugins: {
        install: pluginsToInstall,
        configure: pluginsToConfigure,
        update: pluginsToUpdate,
      },
    };
  }

  private calculateWordPressSEOScore(info: WordPressSEOInfo): number {
    let score = 100;

    // Deduct points for missing critical elements
    if (info.seoPlugins.length === 0) score -= 30;
    if (!info.sitemap.exists) score -= 20;
    if (!info.robotsTxt.exists) score -= 15;
    if (!info.schemaMarkup.exists) score -= 10;
    if (!info.caching.enabled) score -= 10;
    if (info.permalinkStructure === 'Plain' || info.permalinkStructure === 'Numeric') score -= 10;
    if (!info.theme.seoOptimized) score -= 5;

    return Math.max(0, score);
  }

  private isOutdatedWordPress(version: string): boolean {
    // Simple version comparison
    const currentYear = new Date().getFullYear();
    const versionYear = parseInt(version.split('.')[0]);
    return versionYear < currentYear - 2;
  }
}
