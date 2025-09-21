/**
 * SEO Web Crawler
 * Production-ready web crawler for WordPress site analysis
 */

import puppeteer, { Browser, Page } from 'puppeteer';
import * as cheerio from 'cheerio';
import { logger } from '@/lib/logger';
import { redactSensitive } from '@/lib/redact';

export interface CrawlResult {
  url: string;
  title: string;
  metaDescription: string;
  headings: {
    h1: string[];
    h2: string[];
    h3: string[];
    h4: string[];
    h5: string[];
    h6: string[];
  };
  images: {
    src: string;
    alt: string;
    title?: string;
  }[];
  links: {
    href: string;
    text: string;
    isInternal: boolean;
    isBroken?: boolean;
  }[];
  scripts: string[];
  stylesheets: string[];
  wordpressPlugins: string[];
  wordpressTheme: string;
  wordpressVersion: string;
  sitemapUrl?: string;
  robotsTxt?: string;
  loadTime: number;
  statusCode: number;
  error?: string;
}

export interface SiteStructure {
  pages: CrawlResult[];
  sitemap: string[];
  brokenLinks: string[];
  duplicateContent: string[];
  missingMeta: string[];
  slowPages: string[];
}

export class SEOCrawler {
  private browser: Browser | null = null;
  private maxPages: number = 50;
  private maxDepth: number = 3;
  private timeout: number = 30000;

  constructor(options?: {
    maxPages?: number;
    maxDepth?: number;
    timeout?: number;
  }) {
    this.maxPages = options?.maxPages || 50;
    this.maxDepth = options?.maxDepth || 3;
    this.timeout = options?.timeout || 30000;
  }

  async initialize(): Promise<void> {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: 'new',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu',
        ],
      });
    }
  }

  async crawlSite(baseUrl: string): Promise<SiteStructure> {
    await this.initialize();
    
    const startTime = Date.now();
    const visitedUrls = new Set<string>();
    const pages: CrawlResult[] = [];
    const brokenLinks: string[] = [];
    const duplicateContent: string[] = [];
    const missingMeta: string[] = [];
    const slowPages: string[] = [];

    try {
      logger.info({ baseUrl: redactSensitive(baseUrl) }, 'Starting SEO crawl');

      // Start with homepage
      const homepageResult = await this.crawlPage(baseUrl, 0);
      if (homepageResult) {
        pages.push(homepageResult);
        visitedUrls.add(baseUrl);

        // Check for sitemap
        const sitemapUrl = await this.findSitemap(baseUrl);
        if (sitemapUrl) {
          homepageResult.sitemapUrl = sitemapUrl;
        }

        // Crawl additional pages
        await this.crawlAdditionalPages(homepageResult, pages, visitedUrls, 1);
      }

      // Analyze results
      const sitemap = await this.parseSitemap(baseUrl);
      this.analyzeResults(pages, brokenLinks, duplicateContent, missingMeta, slowPages);

      const crawlTime = Date.now() - startTime;
      logger.info(
        {
          baseUrl: redactSensitive(baseUrl),
          pagesFound: pages.length,
          crawlTime,
        },
        'SEO crawl completed'
      );

      return {
        pages,
        sitemap,
        brokenLinks,
        duplicateContent,
        missingMeta,
        slowPages,
      };
    } catch (error) {
      logger.error(
        { error: redactSensitive(error), baseUrl: redactSensitive(baseUrl) },
        'SEO crawl failed'
      );
      throw error;
    }
  }

  private async crawlPage(url: string, depth: number): Promise<CrawlResult | null> {
    if (!this.browser || depth > this.maxDepth) {
      return null;
    }

    const startTime = Date.now();
    let page: Page | null = null;

    try {
      page = await this.browser.newPage();
      await page.setViewport({ width: 1920, height: 1080 });
      await page.setUserAgent(
        'Mozilla/5.0 (compatible; OrionSEO/1.0; +https://orion-content.com/bot)'
      );

      // Set timeout
      page.setDefaultTimeout(this.timeout);

      // Navigate to page
      const response = await page.goto(url, {
        waitUntil: 'networkidle2',
        timeout: this.timeout,
      });

      const statusCode = response?.status() || 0;
      const loadTime = Date.now() - startTime;

      if (statusCode >= 400) {
        logger.warn({ url: redactSensitive(url), statusCode }, 'Page returned error status');
        return {
          url,
          title: '',
          metaDescription: '',
          headings: { h1: [], h2: [], h3: [], h4: [], h5: [], h6: [] },
          images: [],
          links: [],
          scripts: [],
          stylesheets: [],
          wordpressPlugins: [],
          wordpressTheme: '',
          wordpressVersion: '',
          loadTime,
          statusCode,
          error: `HTTP ${statusCode}`,
        };
      }

      // Get page content
      const content = await page.content();
      const $ = cheerio.load(content);

      // Extract WordPress information
      const wordpressInfo = this.extractWordPressInfo($, content);

      // Extract SEO elements
      const title = $('title').text().trim();
      const metaDescription = $('meta[name="description"]').attr('content') || '';

      // Extract headings
      const headings = {
        h1: $('h1').map((_, el) => $(el).text().trim()).get(),
        h2: $('h2').map((_, el) => $(el).text().trim()).get(),
        h3: $('h3').map((_, el) => $(el).text().trim()).get(),
        h4: $('h4').map((_, el) => $(el).text().trim()).get(),
        h5: $('h5').map((_, el) => $(el).text().trim()).get(),
        h6: $('h6').map((_, el) => $(el).text().trim()).get(),
      };

      // Extract images
      const images = $('img')
        .map((_, el) => ({
          src: $(el).attr('src') || '',
          alt: $(el).attr('alt') || '',
          title: $(el).attr('title') || undefined,
        }))
        .get();

      // Extract links
      const links = $('a[href]')
        .map((_, el) => {
          const href = $(el).attr('href') || '';
          const text = $(el).text().trim();
          const isInternal = this.isInternalLink(href, url);
          return { href, text, isInternal };
        })
        .get();

      // Extract scripts and stylesheets
      const scripts = $('script[src]')
        .map((_, el) => $(el).attr('src') || '')
        .get();
      const stylesheets = $('link[rel="stylesheet"]')
        .map((_, el) => $(el).attr('href') || '')
        .get();

      return {
        url,
        title,
        metaDescription,
        headings,
        images,
        links,
        scripts,
        stylesheets,
        wordpressPlugins: wordpressInfo.plugins,
        wordpressTheme: wordpressInfo.theme,
        wordpressVersion: wordpressInfo.version,
        loadTime,
        statusCode,
      };
    } catch (error) {
      logger.error(
        { error: redactSensitive(error), url: redactSensitive(url) },
        'Failed to crawl page'
      );
      return {
        url,
        title: '',
        metaDescription: '',
        headings: { h1: [], h2: [], h3: [], h4: [], h5: [], h6: [] },
        images: [],
        links: [],
        scripts: [],
        stylesheets: [],
        wordpressPlugins: [],
        wordpressTheme: '',
        wordpressVersion: '',
        loadTime: Date.now() - startTime,
        statusCode: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    } finally {
      if (page) {
        await page.close();
      }
    }
  }

  private async crawlAdditionalPages(
    homepageResult: CrawlResult,
    pages: CrawlResult[],
    visitedUrls: Set<string>,
    depth: number
  ): Promise<void> {
    if (depth > this.maxDepth || pages.length >= this.maxPages) {
      return;
    }

    const internalLinks = homepageResult.links
      .filter(link => link.isInternal && !visitedUrls.has(link.href))
      .slice(0, 10); // Limit to 10 links per page

    for (const link of internalLinks) {
      if (pages.length >= this.maxPages) break;

      const fullUrl = this.resolveUrl(link.href, homepageResult.url);
      if (visitedUrls.has(fullUrl)) continue;

      visitedUrls.add(fullUrl);
      const pageResult = await this.crawlPage(fullUrl, depth);
      
      if (pageResult) {
        pages.push(pageResult);
        
        // Recursively crawl more pages
        await this.crawlAdditionalPages(pageResult, pages, visitedUrls, depth + 1);
      }
    }
  }

  private extractWordPressInfo($: cheerio.CheerioAPI, content: string): {
    plugins: string[];
    theme: string;
    version: string;
  } {
    const plugins: string[] = [];
    const theme = '';
    const version = '';

    // Extract WordPress version from generator meta tag
    const generator = $('meta[name="generator"]').attr('content') || '';
    const wpVersion = generator.match(/WordPress\s+([\d.]+)/)?.[1] || '';

    // Extract plugins from HTML comments and script sources
    const pluginMatches = content.match(/wp-content\/plugins\/([^\/]+)/g);
    if (pluginMatches) {
      pluginMatches.forEach(match => {
        const plugin = match.split('/')[2];
        if (plugin && !plugins.includes(plugin)) {
          plugins.push(plugin);
        }
      });
    }

    // Extract theme from stylesheet URLs
    const themeMatches = content.match(/wp-content\/themes\/([^\/]+)/g);
    const wpTheme = themeMatches?.[0]?.split('/')[2] || '';

    return {
      plugins,
      theme: wpTheme,
      version: wpVersion,
    };
  }

  private async findSitemap(baseUrl: string): Promise<string | undefined> {
    try {
      const response = await fetch(`${baseUrl}/sitemap.xml`);
      if (response.ok) {
        return `${baseUrl}/sitemap.xml`;
      }
    } catch {
      // Try robots.txt
      try {
        const robotsResponse = await fetch(`${baseUrl}/robots.txt`);
        if (robotsResponse.ok) {
          const robotsText = await robotsResponse.text();
          const sitemapMatch = robotsText.match(/Sitemap:\s*(.+)/i);
          if (sitemapMatch) {
            return sitemapMatch[1].trim();
          }
        }
      } catch {
        // No sitemap found
      }
    }
    return undefined;
  }

  private async parseSitemap(baseUrl: string): Promise<string[]> {
    try {
      const sitemapUrl = await this.findSitemap(baseUrl);
      if (!sitemapUrl) return [];

      const response = await fetch(sitemapUrl);
      if (!response.ok) return [];

      const sitemapXml = await response.text();
      const urls: string[] = [];
      
      // Simple XML parsing for URLs
      const urlMatches = sitemapXml.match(/<loc>(.*?)<\/loc>/g);
      if (urlMatches) {
        urlMatches.forEach(match => {
          const url = match.replace(/<\/?loc>/g, '');
          if (url && url.startsWith(baseUrl)) {
            urls.push(url);
          }
        });
      }

      return urls.slice(0, 100); // Limit to 100 URLs
    } catch (error) {
      logger.warn({ error: redactSensitive(error) }, 'Failed to parse sitemap');
      return [];
    }
  }

  private isInternalLink(href: string, baseUrl: string): boolean {
    try {
      const url = new URL(href, baseUrl);
      const base = new URL(baseUrl);
      return url.hostname === base.hostname;
    } catch {
      return false;
    }
  }

  private resolveUrl(href: string, baseUrl: string): string {
    try {
      return new URL(href, baseUrl).href;
    } catch {
      return href;
    }
  }

  private analyzeResults(
    pages: CrawlResult[],
    brokenLinks: string[],
    duplicateContent: string[],
    missingMeta: string[],
    slowPages: string[]
  ): void {
    const titleMap = new Map<string, string[]>();
    const descriptionMap = new Map<string, string[]>();

    pages.forEach(page => {
      // Check for slow pages
      if (page.loadTime > 3000) {
        slowPages.push(page.url);
      }

      // Check for missing meta descriptions
      if (!page.metaDescription) {
        missingMeta.push(page.url);
      }

      // Track duplicate titles
      if (page.title) {
        if (!titleMap.has(page.title)) {
          titleMap.set(page.title, []);
        }
        titleMap.get(page.title)!.push(page.url);
      }

      // Track duplicate descriptions
      if (page.metaDescription) {
        if (!descriptionMap.has(page.metaDescription)) {
          descriptionMap.set(page.metaDescription, []);
        }
        descriptionMap.get(page.metaDescription)!.push(page.url);
      }

      // Check for broken links
      page.links.forEach(link => {
        if (link.isInternal && link.href.includes('#')) {
          // Skip anchor links for now
          return;
        }
        // Note: Actual broken link checking would require additional HTTP requests
        // This is a simplified version
      });
    });

    // Find duplicate content
    titleMap.forEach((urls, title) => {
      if (urls.length > 1) {
        duplicateContent.push(...urls);
      }
    });

    descriptionMap.forEach((urls, description) => {
      if (urls.length > 1) {
        duplicateContent.push(...urls);
      }
    });
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}
