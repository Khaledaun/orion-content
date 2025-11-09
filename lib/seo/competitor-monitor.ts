/**
 * Competitor Monitoring System
 * Automated competitor tracking and analysis
 */

import { logger } from "@/lib/logger";
import { redactSensitive } from "@/lib/redact";

export interface CompetitorProfile {
  domain: string;
  name: string;
  industry: string;
  lastAnalyzed: Date;
  metrics: {
    domainRating: number;
    organicTraffic: number;
    organicKeywords: number;
    backlinks: number;
    referringDomains: number;
    trafficValue: number;
  };
  topKeywords: Array<{
    keyword: string;
    position: number;
    searchVolume: number;
    difficulty: number;
    traffic: number;
  }>;
  topPages: Array<{
    url: string;
    title: string;
    traffic: number;
    keywords: number;
  }>;
  backlinkProfile: {
    totalBacklinks: number;
    newBacklinks: number;
    lostBacklinks: number;
    topReferringDomains: string[];
  };
  contentStrategy: {
    publishingFrequency: number; // posts per week
    averageContentLength: number;
    topContentTypes: string[];
    socialEngagement: number;
  };
}

export interface CompetitorAlert {
  id: string;
  competitor: string;
  type:
    | "new_keyword"
    | "position_change"
    | "new_backlink"
    | "content_published"
    | "traffic_spike";
  severity: "low" | "medium" | "high";
  title: string;
  description: string;
  data: any;
  timestamp: Date;
  read: boolean;
}

export interface CompetitorComparison {
  yourDomain: string;
  competitors: CompetitorProfile[];
  gaps: Array<{
    type: "keyword" | "backlink" | "content" | "traffic";
    description: string;
    opportunity: string;
    difficulty: "easy" | "medium" | "hard";
    potentialImpact: "low" | "medium" | "high";
  }>;
  recommendations: string[];
  marketPosition: {
    rank: number; // 1 = best, higher = worse
    totalCompetitors: number;
    strengths: string[];
    weaknesses: string[];
  };
}

export interface CompetitorMonitoringConfig {
  domain: string;
  competitors: string[];
  monitoringFrequency: "daily" | "weekly" | "monthly";
  alertThresholds: {
    positionChange: number; // percentage
    trafficChange: number; // percentage
    newBacklinks: number; // count
    newKeywords: number; // count
  };
  enabledAlerts: string[];
  notificationChannels?: {
    email: boolean;
    slack: boolean;
    webhook: boolean;
  };
  webhookUrl?: string;
}

export class CompetitorMonitor {
  private readonly maxCompetitors = 20;
  private readonly defaultMonitoringFrequency = "weekly";

  async setupCompetitorMonitoring(
    config: CompetitorMonitoringConfig,
  ): Promise<CompetitorMonitoringConfig> {
    try {
      logger.info(
        {
          domain: redactSensitive(config.domain),
          competitors: redactSensitive(config.competitors),
        },
        "Setting up competitor monitoring",
      );

      // Validate configuration
      this.validateConfig(config);

      // Save configuration
      await this.saveMonitoringConfig(config);

      // Schedule initial analysis
      await this.scheduleCompetitorAnalysis(config);

      logger.info(
        { domain: redactSensitive(config.domain) },
        "Competitor monitoring setup completed",
      );

      return config;
    } catch (error) {
      logger.error(
        {
          error: redactSensitive(error),
          domain: redactSensitive(config.domain),
        },
        "Failed to setup competitor monitoring",
      );
      throw error;
    }
  }

  async analyzeCompetitors(
    domain: string,
    competitors: string[],
  ): Promise<CompetitorProfile[]> {
    try {
      logger.info(
        {
          domain: redactSensitive(domain),
          competitors: redactSensitive(competitors),
        },
        "Starting competitor analysis",
      );

      const profiles: CompetitorProfile[] = [];

      for (const competitor of competitors) {
        try {
          const profile = await this.analyzeCompetitor(competitor);
          profiles.push(profile);
        } catch (error) {
          logger.warn(
            {
              error: redactSensitive(error),
              competitor: redactSensitive(competitor),
            },
            "Failed to analyze competitor",
          );
        }
      }

      // Save profiles
      await this.saveCompetitorProfiles(profiles);

      logger.info(
        { domain: redactSensitive(domain), profilesAnalyzed: profiles.length },
        "Competitor analysis completed",
      );

      return profiles;
    } catch (error) {
      logger.error(
        { error: redactSensitive(error), domain: redactSensitive(domain) },
        "Competitor analysis failed",
      );
      throw error;
    }
  }

  async compareWithCompetitors(
    domain: string,
    competitors: string[],
  ): Promise<CompetitorComparison> {
    try {
      logger.info(
        {
          domain: redactSensitive(domain),
          competitors: redactSensitive(competitors),
        },
        "Starting competitor comparison",
      );

      // Get your domain profile
      const yourProfile = await this.analyzeCompetitor(domain);

      // Get competitor profiles
      const competitorProfiles = await this.analyzeCompetitors(
        domain,
        competitors,
      );

      // Find gaps and opportunities
      const gaps = this.findCompetitorGaps(yourProfile, competitorProfiles);

      // Generate recommendations
      const recommendations = this.generateCompetitorRecommendations(
        yourProfile,
        competitorProfiles,
        gaps,
      );

      // Calculate market position
      const marketPosition = this.calculateMarketPosition(
        yourProfile,
        competitorProfiles,
      );

      const comparison: CompetitorComparison = {
        yourDomain: domain,
        competitors: competitorProfiles,
        gaps,
        recommendations,
        marketPosition,
      };

      // Save comparison
      await this.saveCompetitorComparison(comparison);

      logger.info(
        { domain: redactSensitive(domain), gapsFound: gaps.length },
        "Competitor comparison completed",
      );

      return comparison;
    } catch (error) {
      logger.error(
        { error: redactSensitive(error), domain: redactSensitive(domain) },
        "Competitor comparison failed",
      );
      throw error;
    }
  }

  async getCompetitorAlerts(
    domain: string,
    limit: number = 50,
  ): Promise<CompetitorAlert[]> {
    try {
      // This would typically query the database
      // For now, return mock alerts
      const alerts: CompetitorAlert[] = Array.from({ length: 10 }, (_, i) => ({
        id: `alert_${i}`,
        competitor: `competitor${i}.com`,
        type: [
          "new_keyword",
          "position_change",
          "new_backlink",
          "content_published",
          "traffic_spike",
        ][i % 5] as any,
        severity: ["low", "medium", "high"][i % 3] as any,
        title: `Competitor Alert ${i + 1}`,
        description: `Description for competitor alert ${i + 1}`,
        data: { value: i },
        timestamp: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
        read: i > 5,
      }));

      return alerts.slice(0, limit);
    } catch (error) {
      logger.error(
        { error: redactSensitive(error), domain: redactSensitive(domain) },
        "Failed to get competitor alerts",
      );
      return [];
    }
  }

  async markAlertAsRead(alertId: string): Promise<void> {
    try {
      // This would typically update the database
      logger.info({ alertId }, "Marking alert as read");
    } catch (error) {
      logger.error(
        { error: redactSensitive(error), alertId },
        "Failed to mark alert as read",
      );
    }
  }

  async getCompetitorTrends(
    domain: string,
    competitor: string,
    days: number = 30,
  ): Promise<{
    traffic: Array<{ date: string; value: number }>;
    keywords: Array<{ date: string; value: number }>;
    backlinks: Array<{ date: string; value: number }>;
  }> {
    try {
      // This would typically query historical data
      // For now, return mock trends
      const trends = {
        traffic: Array.from({ length: days }, (_, i) => ({
          date: new Date(Date.now() - (days - i) * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0],
          value: Math.floor(Math.random() * 10000) + 5000,
        })),
        keywords: Array.from({ length: days }, (_, i) => ({
          date: new Date(Date.now() - (days - i) * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0],
          value: Math.floor(Math.random() * 1000) + 500,
        })),
        backlinks: Array.from({ length: days }, (_, i) => ({
          date: new Date(Date.now() - (days - i) * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0],
          value: Math.floor(Math.random() * 100) + 50,
        })),
      };

      return trends;
    } catch (error) {
      logger.error(
        {
          error: redactSensitive(error),
          domain: redactSensitive(domain),
          competitor: redactSensitive(competitor),
        },
        "Failed to get competitor trends",
      );
      return { traffic: [], keywords: [], backlinks: [] };
    }
  }

  private async analyzeCompetitor(domain: string): Promise<CompetitorProfile> {
    // This would typically call external APIs (Ahrefs, SEMrush, etc.)
    // For now, return mock data
    return {
      domain,
      name: domain.replace(".com", ""),
      industry: "Technology",
      lastAnalyzed: new Date(),
      metrics: {
        domainRating: Math.floor(Math.random() * 100),
        organicTraffic: Math.floor(Math.random() * 100000),
        organicKeywords: Math.floor(Math.random() * 10000),
        backlinks: Math.floor(Math.random() * 50000),
        referringDomains: Math.floor(Math.random() * 5000),
        trafficValue: Math.floor(Math.random() * 100000),
      },
      topKeywords: Array.from({ length: 10 }, (_, i) => ({
        keyword: `keyword${i}`,
        position: Math.floor(Math.random() * 20) + 1,
        searchVolume: Math.floor(Math.random() * 10000),
        difficulty: Math.floor(Math.random() * 100),
        traffic: Math.floor(Math.random() * 1000),
      })),
      topPages: Array.from({ length: 5 }, (_, i) => ({
        url: `https://${domain}/page${i}`,
        title: `Page ${i} Title`,
        traffic: Math.floor(Math.random() * 5000),
        keywords: Math.floor(Math.random() * 100),
      })),
      backlinkProfile: {
        totalBacklinks: Math.floor(Math.random() * 10000),
        newBacklinks: Math.floor(Math.random() * 100),
        lostBacklinks: Math.floor(Math.random() * 50),
        topReferringDomains: Array.from(
          { length: 5 },
          (_, i) => `referrer${i}.com`,
        ),
      },
      contentStrategy: {
        publishingFrequency: Math.floor(Math.random() * 7) + 1,
        averageContentLength: Math.floor(Math.random() * 2000) + 500,
        topContentTypes: ["blog", "tutorial", "review"],
        socialEngagement: Math.floor(Math.random() * 1000),
      },
    };
  }

  private findCompetitorGaps(
    yourProfile: CompetitorProfile,
    competitorProfiles: CompetitorProfile[],
  ): CompetitorComparison["gaps"] {
    const gaps: CompetitorComparison["gaps"] = [];

    // Keyword gaps
    const yourKeywords = new Set(yourProfile.topKeywords.map((k) => k.keyword));
    const competitorKeywords = new Set(
      competitorProfiles.flatMap((cp) => cp.topKeywords.map((k) => k.keyword)),
    );

    const keywordGaps = [...competitorKeywords].filter(
      (k) => !yourKeywords.has(k),
    );
    if (keywordGaps.length > 0) {
      gaps.push({
        type: "keyword",
        description: `${keywordGaps.length} keywords that competitors rank for but you don't`,
        opportunity: "Target these keywords to capture competitor traffic",
        difficulty: "medium",
        potentialImpact: "high",
      });
    }

    // Traffic gaps
    const avgCompetitorTraffic =
      competitorProfiles.reduce(
        (sum, cp) => sum + cp.metrics.organicTraffic,
        0,
      ) / competitorProfiles.length;

    if (yourProfile.metrics.organicTraffic < avgCompetitorTraffic * 0.5) {
      gaps.push({
        type: "traffic",
        description:
          "Your organic traffic is significantly lower than competitors",
        opportunity: "Focus on content marketing and SEO to increase traffic",
        difficulty: "hard",
        potentialImpact: "high",
      });
    }

    // Backlink gaps
    const avgCompetitorBacklinks =
      competitorProfiles.reduce((sum, cp) => sum + cp.metrics.backlinks, 0) /
      competitorProfiles.length;

    if (yourProfile.metrics.backlinks < avgCompetitorBacklinks * 0.7) {
      gaps.push({
        type: "backlink",
        description: "You have fewer backlinks than competitors",
        opportunity: "Implement link building strategy to catch up",
        difficulty: "medium",
        potentialImpact: "high",
      });
    }

    // Content gaps
    const avgCompetitorContent =
      competitorProfiles.reduce(
        (sum, cp) => sum + cp.contentStrategy.publishingFrequency,
        0,
      ) / competitorProfiles.length;

    if (
      yourProfile.contentStrategy.publishingFrequency <
      avgCompetitorContent * 0.8
    ) {
      gaps.push({
        type: "content",
        description: "You publish content less frequently than competitors",
        opportunity: "Increase content publishing frequency",
        difficulty: "easy",
        potentialImpact: "medium",
      });
    }

    return gaps;
  }

  private generateCompetitorRecommendations(
    yourProfile: CompetitorProfile,
    competitorProfiles: CompetitorProfile[],
    gaps: CompetitorComparison["gaps"],
  ): string[] {
    const recommendations: string[] = [];

    // Traffic recommendations
    const avgTraffic =
      competitorProfiles.reduce(
        (sum, cp) => sum + cp.metrics.organicTraffic,
        0,
      ) / competitorProfiles.length;

    if (yourProfile.metrics.organicTraffic < avgTraffic) {
      recommendations.push(
        "Focus on increasing organic traffic through content marketing and SEO",
      );
    }

    // Keyword recommendations
    const keywordGaps = gaps.filter((g) => g.type === "keyword");
    if (keywordGaps.length > 0) {
      recommendations.push(
        "Target competitor keywords that you're not currently ranking for",
      );
    }

    // Backlink recommendations
    const backlinkGaps = gaps.filter((g) => g.type === "backlink");
    if (backlinkGaps.length > 0) {
      recommendations.push("Implement a comprehensive link building strategy");
    }

    // Content recommendations
    const contentGaps = gaps.filter((g) => g.type === "content");
    if (contentGaps.length > 0) {
      recommendations.push(
        "Increase content publishing frequency to match competitors",
      );
    }

    // Domain rating recommendations
    const avgDomainRating =
      competitorProfiles.reduce((sum, cp) => sum + cp.metrics.domainRating, 0) /
      competitorProfiles.length;

    if (yourProfile.metrics.domainRating < avgDomainRating) {
      recommendations.push(
        "Focus on building high-quality backlinks to improve domain rating",
      );
    }

    return recommendations;
  }

  private calculateMarketPosition(
    yourProfile: CompetitorProfile,
    competitorProfiles: CompetitorProfile[],
  ): CompetitorComparison["marketPosition"] {
    const allProfiles = [yourProfile, ...competitorProfiles];

    // Sort by organic traffic
    allProfiles.sort(
      (a, b) => b.metrics.organicTraffic - a.metrics.organicTraffic,
    );

    const yourRank =
      allProfiles.findIndex((p) => p.domain === yourProfile.domain) + 1;

    // Calculate strengths and weaknesses
    const strengths: string[] = [];
    const weaknesses: string[] = [];

    if (yourProfile.metrics.domainRating > 70) {
      strengths.push("Strong domain authority");
    } else {
      weaknesses.push("Low domain authority");
    }

    if (yourProfile.metrics.organicTraffic > 10000) {
      strengths.push("Good organic traffic");
    } else {
      weaknesses.push("Low organic traffic");
    }

    if (yourProfile.metrics.backlinks > 1000) {
      strengths.push("Strong backlink profile");
    } else {
      weaknesses.push("Weak backlink profile");
    }

    return {
      rank: yourRank,
      totalCompetitors: allProfiles.length,
      strengths,
      weaknesses,
    };
  }

  private validateConfig(config: CompetitorMonitoringConfig): void {
    if (!config.domain) {
      throw new Error("Domain is required");
    }

    if (!config.competitors || config.competitors.length === 0) {
      throw new Error("At least one competitor is required");
    }

    if (config.competitors.length > this.maxCompetitors) {
      throw new Error(`Maximum ${this.maxCompetitors} competitors allowed`);
    }
  }

  private async saveMonitoringConfig(
    config: CompetitorMonitoringConfig,
  ): Promise<void> {
    // This would typically save to the database
    logger.info(
      { domain: redactSensitive(config.domain) },
      "Saving competitor monitoring configuration",
    );
  }

  private async scheduleCompetitorAnalysis(
    config: CompetitorMonitoringConfig,
  ): Promise<void> {
    // This would typically schedule a cron job or queue task
    logger.info(
      { domain: redactSensitive(config.domain) },
      "Scheduling competitor analysis",
    );
  }

  private async saveCompetitorProfiles(
    profiles: CompetitorProfile[],
  ): Promise<void> {
    // This would typically save to the database
    logger.info(
      { profilesCount: profiles.length },
      "Saving competitor profiles",
    );
  }

  private async saveCompetitorComparison(
    comparison: CompetitorComparison,
  ): Promise<void> {
    // This would typically save to the database
    logger.info(
      { domain: redactSensitive(comparison.yourDomain) },
      "Saving competitor comparison",
    );
  }
}
