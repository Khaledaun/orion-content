import { logger } from "@/lib/logger";

interface CompetitorSite {
  id: string;
  name: string;
  url: string;
  industry: string;
  lastCrawled?: Date;
  isActive: boolean;
}

interface CrawlResult {
  siteId: string;
  url: string;
  timestamp: Date;
  content: {
    title: string;
    description: string;
    keywords: string[];
    headings: string[];
    wordCount: number;
  };
  seo: {
    metaTags: Record<string, string>;
    structuredData: any[];
    loadTime: number;
    mobileOptimized: boolean;
  };
  social: {
    shares: number;
    engagement: number;
    mentions: string[];
  };
}

interface CompetitiveInsight {
  type:
    | "content_gap"
    | "keyword_opportunity"
    | "trending_topic"
    | "seo_improvement";
  priority: "high" | "medium" | "low";
  title: string;
  description: string;
  actionable: string;
  data: any;
}

class CompetitiveCrawler {
  private competitors: Map<string, CompetitorSite> = new Map();
  private crawlResults: Map<string, CrawlResult[]> = new Map();
  private isRunning = false;

  constructor() {
    this.initializeDefaultCompetitors();
  }

  private initializeDefaultCompetitors() {
    const defaultCompetitors: CompetitorSite[] = [
      {
        id: "comp_1",
        name: "Industry Leader",
        url: "https://example-competitor1.com",
        industry: "content_marketing",
        isActive: true,
      },
      {
        id: "comp_2",
        name: "Rising Star",
        url: "https://example-competitor2.com",
        industry: "content_marketing",
        isActive: true,
      },
    ];

    defaultCompetitors.forEach((comp) => {
      this.competitors.set(comp.id, comp);
    });
  }

  async addCompetitor(competitor: Omit<CompetitorSite, "id">): Promise<string> {
    const id = `comp_${Date.now()}`;
    const newCompetitor: CompetitorSite = {
      ...competitor,
      id,
    };

    this.competitors.set(id, newCompetitor);
    this.crawlResults.set(id, []);

    logger.info(`Added new competitor: ${competitor.name}`, {
      id,
      url: competitor.url,
    });
    return id;
  }

  async crawlCompetitor(competitorId: string): Promise<CrawlResult | null> {
    const competitor = this.competitors.get(competitorId);
    if (!competitor || !competitor.isActive) {
      logger.warn(`Competitor not found or inactive: ${competitorId}`);
      return null;
    }

    try {
      logger.info(`Starting crawl for competitor: ${competitor.name}`);

      // Simulate web crawling - replace with actual implementation
      const crawlResult: CrawlResult = await this.simulateCrawl(competitor);

      // Store result
      const results = this.crawlResults.get(competitorId) || [];
      results.push(crawlResult);

      // Keep only last 50 results per competitor
      if (results.length > 50) {
        results.splice(0, results.length - 50);
      }

      this.crawlResults.set(competitorId, results);

      // Update last crawled timestamp
      competitor.lastCrawled = new Date();
      this.competitors.set(competitorId, competitor);

      logger.info(`Completed crawl for competitor: ${competitor.name}`);
      return crawlResult;
    } catch (error) {
      logger.error(`Failed to crawl competitor ${competitor.name}`, {
        error,
        competitorId,
      });
      return null;
    }
  }

  private async simulateCrawl(
    competitor: CompetitorSite,
  ): Promise<CrawlResult> {
    // Simulate network delay
    await new Promise((resolve) =>
      setTimeout(resolve, 1000 + Math.random() * 2000),
    );

    return {
      siteId: competitor.id,
      url: competitor.url,
      timestamp: new Date(),
      content: {
        title: `${competitor.name} - Latest Content`,
        description: "Simulated competitor content description",
        keywords: ["content marketing", "SEO", "digital strategy"],
        headings: ["Main Heading", "Secondary Heading", "Call to Action"],
        wordCount: Math.floor(Math.random() * 2000) + 500,
      },
      seo: {
        metaTags: {
          "og:title": `${competitor.name} - Social Title`,
          "og:description": "Social media description",
          "twitter:card": "summary_large_image",
        },
        structuredData: [{ "@type": "Organization", name: competitor.name }],
        loadTime: Math.random() * 3 + 1,
        mobileOptimized: Math.random() > 0.3,
      },
      social: {
        shares: Math.floor(Math.random() * 1000),
        engagement: Math.floor(Math.random() * 500),
        mentions: ["twitter", "linkedin", "facebook"],
      },
    };
  }

  async crawlAllCompetitors(): Promise<CrawlResult[]> {
    if (this.isRunning) {
      logger.warn("Competitive crawl already running");
      return [];
    }

    this.isRunning = true;
    const results: CrawlResult[] = [];

    try {
      const activeCompetitors = Array.from(this.competitors.values()).filter(
        (comp) => comp.isActive,
      );

      logger.info(`Starting crawl for ${activeCompetitors.length} competitors`);

      for (const competitor of activeCompetitors) {
        const result = await this.crawlCompetitor(competitor.id);
        if (result) {
          results.push(result);
        }

        // Add delay between crawls to be respectful
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      logger.info(`Completed crawling ${results.length} competitors`);
      return results;
    } finally {
      this.isRunning = false;
    }
  }

  generateCompetitiveInsights(): CompetitiveInsight[] {
    const insights: CompetitiveInsight[] = [];
    const allResults = Array.from(this.crawlResults.values()).flat();

    if (allResults.length === 0) {
      return insights;
    }

    // Analyze content gaps
    const competitorKeywords = new Set<string>();
    allResults.forEach((result) => {
      result.content.keywords.forEach((keyword) =>
        competitorKeywords.add(keyword),
      );
    });

    insights.push({
      type: "keyword_opportunity",
      priority: "high",
      title: "Keyword Opportunities Identified",
      description: `Found ${competitorKeywords.size} keywords used by competitors`,
      actionable:
        "Consider creating content targeting these high-performing keywords",
      data: { keywords: Array.from(competitorKeywords).slice(0, 10) },
    });

    // Analyze content length trends
    const avgWordCount =
      allResults.reduce((sum, result) => sum + result.content.wordCount, 0) /
      allResults.length;

    insights.push({
      type: "content_gap",
      priority: "medium",
      title: "Content Length Analysis",
      description: `Competitors average ${Math.round(avgWordCount)} words per page`,
      actionable:
        "Consider adjusting content length to match or exceed competitor standards",
      data: { averageWordCount: avgWordCount },
    });

    // Analyze SEO performance
    const mobileOptimizedCount = allResults.filter(
      (result) => result.seo.mobileOptimized,
    ).length;
    const mobileOptimizationRate = mobileOptimizedCount / allResults.length;

    if (mobileOptimizationRate > 0.8) {
      insights.push({
        type: "seo_improvement",
        priority: "high",
        title: "Mobile Optimization Critical",
        description: `${Math.round(mobileOptimizationRate * 100)}% of competitors are mobile-optimized`,
        actionable:
          "Ensure all your content is fully mobile-optimized to remain competitive",
        data: { optimizationRate: mobileOptimizationRate },
      });
    }

    return insights;
  }

  getCompetitors(): CompetitorSite[] {
    return Array.from(this.competitors.values());
  }

  getCompetitorResults(competitorId: string): CrawlResult[] {
    return this.crawlResults.get(competitorId) || [];
  }

  async removeCompetitor(competitorId: string): Promise<boolean> {
    const removed = this.competitors.delete(competitorId);
    if (removed) {
      this.crawlResults.delete(competitorId);
      logger.info(`Removed competitor: ${competitorId}`);
    }
    return removed;
  }
}

// Export singleton instance
export const competitiveCrawler = new CompetitiveCrawler();
