/**
 * SEO Performance Monitoring System
 * Continuous monitoring and alerting for SEO performance
 */

import { logger } from '@/lib/logger';
import { redactSensitive } from '@/lib/redact';

export interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  trend: 'up' | 'down' | 'stable';
  change: number; // percentage change
  timestamp: Date;
  target?: number;
  status: 'good' | 'warning' | 'critical';
}

export interface SEOAlert {
  id: string;
  type: 'ranking_drop' | 'traffic_decrease' | 'backlink_loss' | 'technical_issue' | 'competitor_gain';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  affectedPages: string[];
  metrics: {
    before: number;
    after: number;
    change: number;
  };
  recommendations: string[];
  timestamp: Date;
  resolved: boolean;
  resolvedAt?: Date;
}

export interface MonitoringDashboard {
  siteId: string;
  domain: string;
  lastUpdated: Date;
  overallHealth: 'excellent' | 'good' | 'warning' | 'critical';
  metrics: {
    organicTraffic: PerformanceMetric;
    averageRanking: PerformanceMetric;
    backlinks: PerformanceMetric;
    domainRating: PerformanceMetric;
    pageSpeed: PerformanceMetric;
    crawlErrors: PerformanceMetric;
  };
  alerts: SEOAlert[];
  trends: {
    traffic: Array<{ date: string; value: number }>;
    rankings: Array<{ date: string; value: number }>;
    backlinks: Array<{ date: string; value: number }>;
  };
  topPages: Array<{
    url: string;
    title: string;
    traffic: number;
    ranking: number;
    change: number;
  }>;
  topKeywords: Array<{
    keyword: string;
    position: number;
    traffic: number;
    change: number;
  }>;
}

export interface MonitoringConfig {
  siteId: string;
  domain: string;
  monitoringFrequency: 'hourly' | 'daily' | 'weekly';
  alertThresholds: {
    trafficDrop: number; // percentage
    rankingDrop: number; // positions
    backlinkLoss: number; // count
    pageSpeedDrop: number; // seconds
  };
  enabledAlerts: string[];
  notificationChannels: {
    email: boolean;
    slack: boolean;
    webhook: boolean;
  };
  webhookUrl?: string;
}

export class SEOPerformanceMonitor {
  private readonly defaultMonitoringFrequency = 'daily';
  private readonly maxAlertsPerDay = 50;

  async setupMonitoring(config: MonitoringConfig): Promise<MonitoringConfig> {
    try {
      logger.info(
        { siteId: config.siteId, domain: redactSensitive(config.domain) },
        'Setting up SEO performance monitoring'
      );

      // Validate configuration
      this.validateConfig(config);

      // Save configuration
      await this.saveMonitoringConfig(config);

      // Schedule monitoring
      await this.scheduleMonitoring(config);

      // Run initial monitoring
      await this.runMonitoring(config.siteId);

      logger.info(
        { siteId: config.siteId, domain: redactSensitive(config.domain) },
        'SEO performance monitoring setup completed'
      );

      return config;
    } catch (error) {
      logger.error(
        { error: redactSensitive(error), siteId: config.siteId },
        'Failed to setup SEO performance monitoring'
      );
      throw error;
    }
  }

  async runMonitoring(siteId: string): Promise<MonitoringDashboard> {
    try {
      logger.info({ siteId }, 'Running SEO performance monitoring');

      // Get monitoring configuration
      const config = await this.getMonitoringConfig(siteId);
      if (!config) {
        throw new Error('Monitoring configuration not found');
      }

      // Collect current metrics
      const metrics = await this.collectMetrics(config.domain);

      // Get historical data for comparison
      const historicalData = await this.getHistoricalData(siteId, 30); // Last 30 days

      // Calculate trends and changes
      const trends = this.calculateTrends(metrics, historicalData);

      // Check for alerts
      const alerts = await this.checkForAlerts(config, metrics, historicalData);

      // Get top performing pages and keywords
      const topPages = await this.getTopPages(config.domain);
      const topKeywords = await this.getTopKeywords(config.domain);

      // Calculate overall health
      const overallHealth = this.calculateOverallHealth(metrics, alerts);

      const dashboard: MonitoringDashboard = {
        siteId,
        domain: config.domain,
        lastUpdated: new Date(),
        overallHealth,
        metrics,
        alerts: alerts.slice(0, 10), // Show only recent alerts
        trends,
        topPages,
        topKeywords,
      };

      // Save dashboard data
      await this.saveDashboardData(dashboard);

      // Send notifications for critical alerts
      await this.sendNotifications(config, alerts.filter(a => a.severity === 'critical'));

      logger.info(
        { siteId, overallHealth, alertsCount: alerts.length },
        'SEO performance monitoring completed'
      );

      return dashboard;
    } catch (error) {
      logger.error(
        { error: redactSensitive(error), siteId },
        'SEO performance monitoring failed'
      );
      throw error;
    }
  }

  async getDashboard(siteId: string): Promise<MonitoringDashboard | null> {
    try {
      // This would typically query the database
      // For now, return mock data
      const config = await this.getMonitoringConfig(siteId);
      if (!config) {
        return null;
      }

      return {
        siteId,
        domain: config.domain,
        lastUpdated: new Date(),
        overallHealth: 'good',
        metrics: {
          organicTraffic: {
            name: 'Organic Traffic',
            value: 15000,
            unit: 'visitors/month',
            trend: 'up',
            change: 12.5,
            timestamp: new Date(),
            target: 20000,
            status: 'good',
          },
          averageRanking: {
            name: 'Average Ranking',
            value: 8.5,
            unit: 'position',
            trend: 'up',
            change: -1.2,
            timestamp: new Date(),
            target: 5,
            status: 'warning',
          },
          backlinks: {
            name: 'Backlinks',
            value: 1250,
            unit: 'links',
            trend: 'up',
            change: 5.2,
            timestamp: new Date(),
            target: 2000,
            status: 'good',
          },
          domainRating: {
            name: 'Domain Rating',
            value: 65,
            unit: 'score',
            trend: 'stable',
            change: 0,
            timestamp: new Date(),
            target: 80,
            status: 'warning',
          },
          pageSpeed: {
            name: 'Page Speed',
            value: 2.8,
            unit: 'seconds',
            trend: 'down',
            change: 0.3,
            timestamp: new Date(),
            target: 2.0,
            status: 'warning',
          },
          crawlErrors: {
            name: 'Crawl Errors',
            value: 5,
            unit: 'errors',
            trend: 'down',
            change: -2,
            timestamp: new Date(),
            target: 0,
            status: 'good',
          },
        },
        alerts: [],
        trends: {
          traffic: Array.from({ length: 30 }, (_, i) => ({
            date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            value: Math.floor(Math.random() * 2000) + 10000,
          })),
          rankings: Array.from({ length: 30 }, (_, i) => ({
            date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            value: Math.random() * 5 + 5,
          })),
          backlinks: Array.from({ length: 30 }, (_, i) => ({
            date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            value: Math.floor(Math.random() * 50) + 1200,
          })),
        },
        topPages: Array.from({ length: 10 }, (_, i) => ({
          url: `/page-${i + 1}`,
          title: `Top Page ${i + 1}`,
          traffic: Math.floor(Math.random() * 2000) + 500,
          ranking: Math.floor(Math.random() * 10) + 1,
          change: Math.random() * 20 - 10,
        })),
        topKeywords: Array.from({ length: 10 }, (_, i) => ({
          keyword: `keyword-${i + 1}`,
          position: Math.floor(Math.random() * 20) + 1,
          traffic: Math.floor(Math.random() * 1000) + 100,
          change: Math.random() * 10 - 5,
        })),
      };
    } catch (error) {
      logger.error(
        { error: redactSensitive(error), siteId },
        'Failed to get monitoring dashboard'
      );
      return null;
    }
  }

  async resolveAlert(alertId: string, resolution: string): Promise<void> {
    try {
      // This would typically update the database
      logger.info({ alertId, resolution: redactSensitive(resolution) }, 'Resolving SEO alert');
    } catch (error) {
      logger.error(
        { error: redactSensitive(error), alertId },
        'Failed to resolve alert'
      );
    }
  }

  async getAlertHistory(siteId: string, days: number = 30): Promise<SEOAlert[]> {
    try {
      // This would typically query the database
      // For now, return mock data
      return Array.from({ length: 20 }, (_, i) => ({
        id: `alert_${i}`,
        type: ['ranking_drop', 'traffic_decrease', 'backlink_loss', 'technical_issue', 'competitor_gain'][i % 5] as any,
        severity: ['low', 'medium', 'high', 'critical'][i % 4] as any,
        title: `SEO Alert ${i + 1}`,
        description: `Description for SEO alert ${i + 1}`,
        affectedPages: [`/page-${i + 1}`, `/page-${i + 2}`],
        metrics: {
          before: Math.floor(Math.random() * 1000) + 100,
          after: Math.floor(Math.random() * 1000) + 100,
          change: Math.random() * 20 - 10,
        },
        recommendations: [
          'Check page content quality',
          'Improve page loading speed',
          'Build more backlinks',
        ],
        timestamp: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
        resolved: i > 10,
        resolvedAt: i > 10 ? new Date(Date.now() - (i - 5) * 24 * 60 * 60 * 1000) : undefined,
      }));
    } catch (error) {
      logger.error(
        { error: redactSensitive(error), siteId },
        'Failed to get alert history'
      );
      return [];
    }
  }

  private async collectMetrics(domain: string): Promise<MonitoringDashboard['metrics']> {
    // This would typically call external APIs (Google Analytics, Search Console, Ahrefs, etc.)
    // For now, return mock data
    return {
      organicTraffic: {
        name: 'Organic Traffic',
        value: Math.floor(Math.random() * 20000) + 10000,
        unit: 'visitors/month',
        trend: 'up',
        change: Math.random() * 20 - 5,
        timestamp: new Date(),
        target: 25000,
        status: 'good',
      },
      averageRanking: {
        name: 'Average Ranking',
        value: Math.random() * 10 + 5,
        unit: 'position',
        trend: 'up',
        change: Math.random() * 2 - 1,
        timestamp: new Date(),
        target: 5,
        status: 'warning',
      },
      backlinks: {
        name: 'Backlinks',
        value: Math.floor(Math.random() * 2000) + 1000,
        unit: 'links',
        trend: 'up',
        change: Math.random() * 10 - 2,
        timestamp: new Date(),
        target: 3000,
        status: 'good',
      },
      domainRating: {
        name: 'Domain Rating',
        value: Math.floor(Math.random() * 40) + 40,
        unit: 'score',
        trend: 'stable',
        change: Math.random() * 2 - 1,
        timestamp: new Date(),
        target: 80,
        status: 'warning',
      },
      pageSpeed: {
        name: 'Page Speed',
        value: Math.random() * 3 + 1,
        unit: 'seconds',
        trend: 'down',
        change: Math.random() * 0.5,
        timestamp: new Date(),
        target: 2.0,
        status: 'warning',
      },
      crawlErrors: {
        name: 'Crawl Errors',
        value: Math.floor(Math.random() * 20),
        unit: 'errors',
        trend: 'down',
        change: Math.random() * 5 - 2,
        timestamp: new Date(),
        target: 0,
        status: 'good',
      },
    };
  }

  private async getHistoricalData(siteId: string, days: number): Promise<any[]> {
    // This would typically query the database for historical metrics
    // For now, return empty array
    return [];
  }

  private calculateTrends(
    currentMetrics: MonitoringDashboard['metrics'],
    historicalData: any[]
  ): MonitoringDashboard['trends'] {
    // This would calculate actual trends from historical data
    // For now, return mock trends
    return {
      traffic: Array.from({ length: 30 }, (_, i) => ({
        date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        value: Math.floor(Math.random() * 2000) + 10000,
      })),
      rankings: Array.from({ length: 30 }, (_, i) => ({
        date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        value: Math.random() * 5 + 5,
      })),
      backlinks: Array.from({ length: 30 }, (_, i) => ({
        date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        value: Math.floor(Math.random() * 50) + 1200,
      })),
    };
  }

  private async checkForAlerts(
    config: MonitoringConfig,
    metrics: MonitoringDashboard['metrics'],
    historicalData: any[]
  ): Promise<SEOAlert[]> {
    const alerts: SEOAlert[] = [];

    // Check traffic drop
    if (metrics.organicTraffic.change < -config.alertThresholds.trafficDrop) {
      alerts.push({
        id: this.generateAlertId(),
        type: 'traffic_decrease',
        severity: metrics.organicTraffic.change < -20 ? 'critical' : 'high',
        title: 'Significant Traffic Drop Detected',
        description: `Organic traffic decreased by ${Math.abs(metrics.organicTraffic.change).toFixed(1)}%`,
        affectedPages: ['/home', '/blog'],
        metrics: {
          before: metrics.organicTraffic.value / (1 + metrics.organicTraffic.change / 100),
          after: metrics.organicTraffic.value,
          change: metrics.organicTraffic.change,
        },
        recommendations: [
          'Check for technical issues',
          'Review recent content changes',
          'Analyze competitor activity',
          'Check for Google algorithm updates',
        ],
        timestamp: new Date(),
        resolved: false,
      });
    }

    // Check ranking drop
    if (metrics.averageRanking.change > config.alertThresholds.rankingDrop) {
      alerts.push({
        id: this.generateAlertId(),
        type: 'ranking_drop',
        severity: metrics.averageRanking.change > 5 ? 'critical' : 'high',
        title: 'Average Ranking Dropped',
        description: `Average ranking dropped by ${metrics.averageRanking.change.toFixed(1)} positions`,
        affectedPages: ['/blog', '/products'],
        metrics: {
          before: metrics.averageRanking.value - metrics.averageRanking.change,
          after: metrics.averageRanking.value,
          change: metrics.averageRanking.change,
        },
        recommendations: [
          'Review keyword strategy',
          'Improve content quality',
          'Check for technical SEO issues',
          'Build more relevant backlinks',
        ],
        timestamp: new Date(),
        resolved: false,
      });
    }

    // Check backlink loss
    if (metrics.backlinks.change < -config.alertThresholds.backlinkLoss) {
      alerts.push({
        id: this.generateAlertId(),
        type: 'backlink_loss',
        severity: metrics.backlinks.change < -10 ? 'critical' : 'medium',
        title: 'Backlinks Lost',
        description: `Lost ${Math.abs(metrics.backlinks.change)} backlinks`,
        affectedPages: ['/'],
        metrics: {
          before: metrics.backlinks.value - metrics.backlinks.change,
          after: metrics.backlinks.value,
          change: metrics.backlinks.change,
        },
        recommendations: [
          'Check for broken links',
          'Reach out to lost link sources',
          'Create link-worthy content',
          'Monitor competitor backlink strategies',
        ],
        timestamp: new Date(),
        resolved: false,
      });
    }

    // Check page speed
    if (metrics.pageSpeed.change > config.alertThresholds.pageSpeedDrop) {
      alerts.push({
        id: this.generateAlertId(),
        type: 'technical_issue',
        severity: 'medium',
        title: 'Page Speed Degraded',
        description: `Page speed increased by ${metrics.pageSpeed.change.toFixed(1)} seconds`,
        affectedPages: ['/home', '/products'],
        metrics: {
          before: metrics.pageSpeed.value - metrics.pageSpeed.change,
          after: metrics.pageSpeed.value,
          change: metrics.pageSpeed.change,
        },
        recommendations: [
          'Optimize images',
          'Minify CSS and JavaScript',
          'Enable browser caching',
          'Use a CDN',
        ],
        timestamp: new Date(),
        resolved: false,
      });
    }

    return alerts;
  }

  private async getTopPages(domain: string): Promise<MonitoringDashboard['topPages']> {
    // This would typically query Google Analytics or Search Console
    // For now, return mock data
    return Array.from({ length: 10 }, (_, i) => ({
      url: `/page-${i + 1}`,
      title: `Top Page ${i + 1}`,
      traffic: Math.floor(Math.random() * 2000) + 500,
      ranking: Math.floor(Math.random() * 10) + 1,
      change: Math.random() * 20 - 10,
    }));
  }

  private async getTopKeywords(domain: string): Promise<MonitoringDashboard['topKeywords']> {
    // This would typically query Google Search Console
    // For now, return mock data
    return Array.from({ length: 10 }, (_, i) => ({
      keyword: `keyword-${i + 1}`,
      position: Math.floor(Math.random() * 20) + 1,
      traffic: Math.floor(Math.random() * 1000) + 100,
      change: Math.random() * 10 - 5,
    }));
  }

  private calculateOverallHealth(
    metrics: MonitoringDashboard['metrics'],
    alerts: SEOAlert[]
  ): MonitoringDashboard['overallHealth'] {
    const criticalAlerts = alerts.filter(a => a.severity === 'critical').length;
    const highAlerts = alerts.filter(a => a.severity === 'high').length;
    const warningMetrics = Object.values(metrics).filter(m => m.status === 'warning').length;

    if (criticalAlerts > 0) {
      return 'critical';
    } else if (highAlerts > 2 || warningMetrics > 3) {
      return 'warning';
    } else if (highAlerts > 0 || warningMetrics > 1) {
      return 'good';
    } else {
      return 'excellent';
    }
  }

  private async sendNotifications(config: MonitoringConfig, alerts: SEOAlert[]): Promise<void> {
    if (alerts.length === 0) return;

    try {
      // Send email notifications
      if (config.notificationChannels.email) {
        await this.sendEmailNotifications(config, alerts);
      }

      // Send Slack notifications
      if (config.notificationChannels.slack) {
        await this.sendSlackNotifications(config, alerts);
      }

      // Send webhook notifications
      if (config.notificationChannels.webhook && config.webhookUrl) {
        await this.sendWebhookNotifications(config, alerts);
      }

      logger.info(
        { siteId: config.siteId, alertsCount: alerts.length },
        'Notifications sent for critical alerts'
      );
    } catch (error) {
      logger.error(
        { error: redactSensitive(error), siteId: config.siteId },
        'Failed to send notifications'
      );
    }
  }

  private async sendEmailNotifications(config: MonitoringConfig, alerts: SEOAlert[]): Promise<void> {
    // This would typically send emails via a service like SendGrid or AWS SES
    logger.info(
      { siteId: config.siteId, alertsCount: alerts.length },
      'Sending email notifications'
    );
  }

  private async sendSlackNotifications(config: MonitoringConfig, alerts: SEOAlert[]): Promise<void> {
    // This would typically send messages to Slack
    logger.info(
      { siteId: config.siteId, alertsCount: alerts.length },
      'Sending Slack notifications'
    );
  }

  private async sendWebhookNotifications(config: MonitoringConfig, alerts: SEOAlert[]): Promise<void> {
    // This would typically send webhook notifications
    logger.info(
      { siteId: config.siteId, alertsCount: alerts.length },
      'Sending webhook notifications'
    );
  }

  private validateConfig(config: MonitoringConfig): void {
    if (!config.siteId) {
      throw new Error('Site ID is required');
    }
    
    if (!config.domain) {
      throw new Error('Domain is required');
    }
    
    if (!config.alertThresholds) {
      throw new Error('Alert thresholds are required');
    }
  }

  private async saveMonitoringConfig(config: MonitoringConfig): Promise<void> {
    // This would typically save to the database
    logger.info(
      { siteId: config.siteId, domain: redactSensitive(config.domain) },
      'Saving monitoring configuration'
    );
  }

  private async scheduleMonitoring(config: MonitoringConfig): Promise<void> {
    // This would typically schedule a cron job or queue task
    logger.info(
      { siteId: config.siteId, frequency: config.monitoringFrequency },
      'Scheduling monitoring'
    );
  }

  private async getMonitoringConfig(siteId: string): Promise<MonitoringConfig | null> {
    // This would typically query the database
    // For now, return mock config
    return {
      siteId,
      domain: 'example.com',
      monitoringFrequency: 'daily',
      alertThresholds: {
        trafficDrop: 15,
        rankingDrop: 3,
        backlinkLoss: 5,
        pageSpeedDrop: 1,
      },
      enabledAlerts: ['traffic_decrease', 'ranking_drop', 'backlink_loss', 'technical_issue'],
      notificationChannels: {
        email: true,
        slack: false,
        webhook: false,
      },
    };
  }

  private async saveDashboardData(dashboard: MonitoringDashboard): Promise<void> {
    // This would typically save to the database
    logger.info(
      { siteId: dashboard.siteId, overallHealth: dashboard.overallHealth },
      'Saving dashboard data'
    );
  }

  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
