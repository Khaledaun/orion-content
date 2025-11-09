/**
 * WordPress Publishing Telemetry
 * Tracks WordPress publishing costs, performance, and success rates
 */

import { prisma } from "../prisma";
import { logger } from "../logger";
import { redactSensitive } from "../redact";
import { getRedisStore } from "../redis-store";

export interface WordPressPublishingMetrics {
  totalPublishes: number;
  successfulPublishes: number;
  failedPublishes: number;
  successRate: number;
  averagePublishTime: number;
  totalCost: number;
  costPerPublish: number;
  costPerSuccessfulPublish: number;
  wordpressApiCalls: number;
  wordpressApiErrors: number;
  rulebookBlocks: number;
  qualityScoreAverage: number;
}

export interface WordPressSiteMetrics {
  siteId: string;
  siteUrl: string;
  totalPublishes: number;
  successfulPublishes: number;
  failedPublishes: number;
  successRate: number;
  averagePublishTime: number;
  totalCost: number;
  lastPublishAt: Date | null;
  connectionUptime: number;
  averageQualityScore: number;
}

export interface WordPressPublishingEvent {
  id: string;
  siteId: string;
  draftId: string;
  userId: string;
  action: "stream_draft" | "publish" | "stream_and_publish";
  success: boolean;
  error?: string;
  publishTime: number;
  cost: number;
  qualityScore: number;
  rulebookPassed: boolean;
  wordpressPostId?: number;
  wordpressPostUrl?: string;
  timestamp: Date;
}

export class WordPressTelemetry {
  private redisStore = getRedisStore();

  /**
   * Track a WordPress publishing event
   */
  async trackPublishingEvent(
    event: Omit<WordPressPublishingEvent, "id" | "timestamp">,
  ): Promise<void> {
    try {
      const eventId = `wp-event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const fullEvent: WordPressPublishingEvent = {
        ...event,
        id: eventId,
        timestamp: new Date(),
      };

      // Store in Redis for real-time metrics
      await this.storeEventInRedis(fullEvent);

      // Store in database for long-term analytics
      await this.storeEventInDatabase(fullEvent);

      // Update site-specific metrics
      await this.updateSiteMetrics(fullEvent);

      logger.info(
        {
          eventId,
          siteId: event.siteId,
          action: event.action,
          success: event.success,
          publishTime: event.publishTime,
          cost: event.cost,
        },
        "WordPress publishing event tracked",
      );
    } catch (error) {
      logger.error(
        {
          error: redactSensitive(error),
          event: redactSensitive(event),
        },
        "Failed to track WordPress publishing event",
      );
    }
  }

  /**
   * Get WordPress publishing metrics for a site
   */
  async getSiteMetrics(
    siteId: string,
    days: number = 30,
  ): Promise<WordPressSiteMetrics | null> {
    try {
      const since = new Date();
      since.setDate(since.getDate() - days);

      const events = await prisma.wordPressPublishingEvent.findMany({
        where: {
          siteId,
          timestamp: {
            gte: since,
          },
        },
        orderBy: {
          timestamp: "desc",
        },
      });

      if (events.length === 0) {
        return null;
      }

      const successfulEvents = events.filter((e: any) => e.success);
      const failedEvents = events.filter((e: any) => !e.success);

      const totalPublishTime = events.reduce(
        (sum: number, e: any) => sum + e.publishTime,
        0,
      );
      const totalCost = events.reduce((sum: number, e: any) => sum + e.cost, 0);
      const totalQualityScore = events.reduce(
        (sum: number, e: any) => sum + e.qualityScore,
        0,
      );

      // Get site info
      const site = await prisma.site.findUnique({
        where: { id: siteId },
      });

      // Calculate connection uptime (simplified - would need more sophisticated tracking)
      const connectionUptime = successfulEvents.length / events.length;

      return {
        siteId,
        siteUrl: site?.url || "Unknown",
        totalPublishes: events.length,
        successfulPublishes: successfulEvents.length,
        failedPublishes: failedEvents.length,
        successRate:
          events.length > 0 ? successfulEvents.length / events.length : 0,
        averagePublishTime:
          events.length > 0 ? totalPublishTime / events.length : 0,
        totalCost,
        lastPublishAt: events[0]?.timestamp || null,
        connectionUptime,
        averageQualityScore:
          events.length > 0 ? totalQualityScore / events.length : 0,
      };
    } catch (error) {
      logger.error(
        {
          error: redactSensitive(error),
          siteId,
        },
        "Failed to get WordPress site metrics",
      );
      return null;
    }
  }

  /**
   * Get global WordPress publishing metrics
   */
  async getGlobalMetrics(
    days: number = 30,
  ): Promise<WordPressPublishingMetrics> {
    try {
      const since = new Date();
      since.setDate(since.getDate() - days);

      const events = await prisma.wordPressPublishingEvent.findMany({
        where: {
          timestamp: {
            gte: since,
          },
        },
      });

      if (events.length === 0) {
        return {
          totalPublishes: 0,
          successfulPublishes: 0,
          failedPublishes: 0,
          successRate: 0,
          averagePublishTime: 0,
          totalCost: 0,
          costPerPublish: 0,
          costPerSuccessfulPublish: 0,
          wordpressApiCalls: 0,
          wordpressApiErrors: 0,
          rulebookBlocks: 0,
          qualityScoreAverage: 0,
        };
      }

      const successfulEvents = events.filter((e: any) => e.success);
      const failedEvents = events.filter((e: any) => !e.success);
      const rulebookBlockedEvents = events.filter(
        (e: any) => !e.rulebookPassed,
      );

      const totalPublishTime = events.reduce(
        (sum: number, e: any) => sum + e.publishTime,
        0,
      );
      const totalCost = events.reduce((sum: number, e: any) => sum + e.cost, 0);
      const totalQualityScore = events.reduce(
        (sum: number, e: any) => sum + e.qualityScore,
        0,
      );

      return {
        totalPublishes: events.length,
        successfulPublishes: successfulEvents.length,
        failedPublishes: failedEvents.length,
        successRate:
          events.length > 0 ? successfulEvents.length / events.length : 0,
        averagePublishTime:
          events.length > 0 ? totalPublishTime / events.length : 0,
        totalCost,
        costPerPublish: events.length > 0 ? totalCost / events.length : 0,
        costPerSuccessfulPublish:
          successfulEvents.length > 0 ? totalCost / successfulEvents.length : 0,
        wordpressApiCalls: events.length, // Each event represents API calls
        wordpressApiErrors: failedEvents.length,
        rulebookBlocks: rulebookBlockedEvents.length,
        qualityScoreAverage:
          events.length > 0 ? totalQualityScore / events.length : 0,
      };
    } catch (error) {
      logger.error(
        {
          error: redactSensitive(error),
        },
        "Failed to get global WordPress metrics",
      );

      return {
        totalPublishes: 0,
        successfulPublishes: 0,
        failedPublishes: 0,
        successRate: 0,
        averagePublishTime: 0,
        totalCost: 0,
        costPerPublish: 0,
        costPerSuccessfulPublish: 0,
        wordpressApiCalls: 0,
        wordpressApiErrors: 0,
        rulebookBlocks: 0,
        qualityScoreAverage: 0,
      };
    }
  }

  /**
   * Get WordPress publishing trends over time
   */
  async getPublishingTrends(days: number = 30): Promise<
    Array<{
      date: string;
      publishes: number;
      successfulPublishes: number;
      failedPublishes: number;
      totalCost: number;
      averageQualityScore: number;
    }>
  > {
    try {
      const since = new Date();
      since.setDate(since.getDate() - days);

      const events = await prisma.wordPressPublishingEvent.findMany({
        where: {
          timestamp: {
            gte: since,
          },
        },
        orderBy: {
          timestamp: "asc",
        },
      });

      // Group events by date
      const eventsByDate = new Map<string, typeof events>();

      events.forEach((event: any) => {
        const date = event.timestamp.toISOString().split("T")[0];
        if (!eventsByDate.has(date)) {
          eventsByDate.set(date, []);
        }
        eventsByDate.get(date)!.push(event);
      });

      // Calculate metrics for each date
      const trends = Array.from(eventsByDate.entries()).map(
        ([date, dayEvents]) => {
          const successfulEvents = dayEvents.filter((e: any) => e.success);
          const totalCost = dayEvents.reduce(
            (sum: number, e: any) => sum + e.cost,
            0,
          );
          const totalQualityScore = dayEvents.reduce(
            (sum: number, e: any) => sum + e.qualityScore,
            0,
          );

          return {
            date,
            publishes: dayEvents.length,
            successfulPublishes: successfulEvents.length,
            failedPublishes: dayEvents.length - successfulEvents.length,
            totalCost,
            averageQualityScore:
              dayEvents.length > 0 ? totalQualityScore / dayEvents.length : 0,
          };
        },
      );

      return trends.sort((a, b) => a.date.localeCompare(b.date));
    } catch (error) {
      logger.error(
        {
          error: redactSensitive(error),
        },
        "Failed to get WordPress publishing trends",
      );
      return [];
    }
  }

  /**
   * Store event in Redis for real-time metrics
   */
  private async storeEventInRedis(
    event: WordPressPublishingEvent,
  ): Promise<void> {
    if (!this.redisStore.isAvailable()) {
      return;
    }

    try {
      const today = new Date().toISOString().substring(0, 10);
      const eventKey = `wp_events:${today}`;

      // Store event data
      await this.redisStore.set(
        `${eventKey}:${event.id}`,
        JSON.stringify(event),
        7 * 24 * 3600, // 7 days
      );

      // Update daily counters
      await this.redisStore.incr(`${eventKey}:total`);
      if (event.success) {
        await this.redisStore.incr(`${eventKey}:successful`);
      } else {
        await this.redisStore.incr(`${eventKey}:failed`);
      }

      // Update cost tracking
      const currentCost = parseFloat(
        (await this.redisStore.get(`${eventKey}:cost`)) || "0",
      );
      await this.redisStore.set(
        `${eventKey}:cost`,
        (currentCost + event.cost).toString(),
        7 * 24 * 3600,
      );
    } catch (error) {
      logger.error(
        {
          error: redactSensitive(error),
          eventId: event.id,
        },
        "Failed to store WordPress event in Redis",
      );
    }
  }

  /**
   * Store event in database for long-term analytics
   */
  private async storeEventInDatabase(
    event: WordPressPublishingEvent,
  ): Promise<void> {
    try {
      await prisma.wordPressPublishingEvent.create({
        data: {
          id: event.id,
          siteId: event.siteId,
          draftId: event.draftId,
          userId: event.userId,
          action: event.action,
          success: event.success,
          error: event.error,
          publishTime: event.publishTime,
          cost: event.cost,
          qualityScore: event.qualityScore,
          rulebookPassed: event.rulebookPassed,
          wordpressPostId: event.wordpressPostId,
          wordpressPostUrl: event.wordpressPostUrl,
          timestamp: event.timestamp,
        },
      });
    } catch (error) {
      logger.error(
        {
          error: redactSensitive(error),
          eventId: event.id,
        },
        "Failed to store WordPress event in database",
      );
    }
  }

  /**
   * Update site-specific metrics
   */
  private async updateSiteMetrics(
    event: WordPressPublishingEvent,
  ): Promise<void> {
    try {
      const today = new Date().toISOString().substring(0, 10);
      const siteKey = `wp_site_metrics:${event.siteId}:${today}`;

      if (!this.redisStore.isAvailable()) {
        return;
      }

      // Update daily site metrics
      await this.redisStore.incr(`${siteKey}:total`);
      if (event.success) {
        await this.redisStore.incr(`${siteKey}:successful`);
      } else {
        await this.redisStore.incr(`${siteKey}:failed`);
      }

      // Update cost tracking
      const currentCost = parseFloat(
        (await this.redisStore.get(`${siteKey}:cost`)) || "0",
      );
      await this.redisStore.set(
        `${siteKey}:cost`,
        (currentCost + event.cost).toString(),
        30 * 24 * 3600,
      );

      // Update quality score tracking
      const currentQualitySum = parseFloat(
        (await this.redisStore.get(`${siteKey}:quality_sum`)) || "0",
      );
      const currentQualityCount = parseInt(
        (await this.redisStore.get(`${siteKey}:quality_count`)) || "0",
      );

      await this.redisStore.set(
        `${siteKey}:quality_sum`,
        (currentQualitySum + event.qualityScore).toString(),
        30 * 24 * 3600,
      );
      await this.redisStore.incr(`${siteKey}:quality_count`);
    } catch (error) {
      logger.error(
        {
          error: redactSensitive(error),
          siteId: event.siteId,
        },
        "Failed to update WordPress site metrics",
      );
    }
  }
}
