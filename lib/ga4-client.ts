
import { BetaAnalyticsDataClient } from '@google-analytics/data'
import { logger } from './logger'

interface GA4Config {
  propertyId: string
  serviceAccountKey?: string
}

interface GA4Metrics {
  sessions: number
  pageviews: number
  users: number
  bounceRate: number
}

interface GA4Report {
  dimensionValues: { value: string }[]
  metricValues: { value: string }[]
}

export class GA4Client {
  private client: BetaAnalyticsDataClient
  private propertyId: string

  constructor(config: GA4Config) {
    this.propertyId = config.propertyId
    
    if (config.serviceAccountKey) {
      const credentials = JSON.parse(config.serviceAccountKey)
      this.client = new BetaAnalyticsDataClient({
        credentials
      })
    } else {
      this.client = new BetaAnalyticsDataClient()
    }
  }

  static fromEnvironment(): GA4Client | null {
    if (!process.env.GOOGLE_ANALYTICS_PROPERTY_ID) {
      return null
    }

    return new GA4Client({
      propertyId: process.env.GOOGLE_ANALYTICS_PROPERTY_ID,
      serviceAccountKey: process.env.GOOGLE_SERVICE_ACCOUNT_KEY
    })
  }

  async getReport(startDate: string, endDate: string, metrics: string[]): Promise<GA4Report[]> {
    return this.getPageReport(startDate, endDate)
  }

  async getPropertyInfo(): Promise<{ id: string; name: string }> {
    return {
      id: this.propertyId,
      name: `Property ${this.propertyId}`
    }
  }

  async getMetrics(startDate: string, endDate: string): Promise<GA4Metrics> {
    try {
      const [response] = await this.client.runReport({
        property: `properties/${this.propertyId}`,
        dateRanges: [{ startDate, endDate }],
        metrics: [
          { name: 'sessions' },
          { name: 'screenPageViews' },
          { name: 'activeUsers' },
          { name: 'bounceRate' }
        ]
      })

      const row = response.rows?.[0]
      if (!row) {
        return { sessions: 0, pageviews: 0, users: 0, bounceRate: 0 }
      }

      return {
        sessions: parseInt(row.metricValues?.[0]?.value || '0'),
        pageviews: parseInt(row.metricValues?.[1]?.value || '0'),
        users: parseInt(row.metricValues?.[2]?.value || '0'),
        bounceRate: parseFloat(row.metricValues?.[3]?.value || '0')
      }
    } catch (error) {
      logger.error({ error }, 'GA4 metrics error')
      return { sessions: 0, pageviews: 0, users: 0, bounceRate: 0 }
    }
  }

  async getPageReport(startDate: string, endDate: string): Promise<GA4Report[]> {
    try {
      const [response] = await this.client.runReport({
        property: `properties/${this.propertyId}`,
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: 'pagePath' }],
        metrics: [
          { name: 'screenPageViews' },
          { name: 'activeUsers' }
        ],
        limit: 100
      })

      return (response.rows || []).map(row => ({
        dimensionValues: (row.dimensionValues || []).map(dv => ({ 
          value: dv.value || '' 
        })),
        metricValues: (row.metricValues || []).map(mv => ({ 
          value: mv.value || '0' 
        }))
      }))
    } catch (error) {
      logger.error({ error }, 'GA4 page report error')
      return []
    }
  }

  async getTrafficSourceReport(startDate: string, endDate: string): Promise<GA4Report[]> {
    try {
      const [response] = await this.client.runReport({
        property: `properties/${this.propertyId}`,
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: 'sessionSource' }],
        metrics: [
          { name: 'sessions' },
          { name: 'activeUsers' }
        ],
        limit: 50
      })

      return (response.rows || []).map(row => ({
        dimensionValues: (row.dimensionValues || []).map(dv => ({ 
          value: dv.value || '' 
        })),
        metricValues: (row.metricValues || []).map(mv => ({ 
          value: mv.value || '0' 
        }))
      }))
    } catch (error) {
      logger.error({ error }, 'GA4 traffic source report error')
      return []
    }
  }
}

let ga4Client: GA4Client | null = null

export function getGA4Client(): GA4Client | null {
  if (!process.env.GOOGLE_ANALYTICS_PROPERTY_ID) {
    return null
  }

  if (!ga4Client) {
    ga4Client = new GA4Client({
      propertyId: process.env.GOOGLE_ANALYTICS_PROPERTY_ID,
      serviceAccountKey: process.env.GOOGLE_SERVICE_ACCOUNT_KEY
    })
  }

  return ga4Client
}

// Legacy export for backward compatibility
export { GA4Client as Ga4Client }
