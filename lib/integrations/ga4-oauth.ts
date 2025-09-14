
import { google } from 'googleapis';
import { prisma } from '../prisma';
import { encrypt, decrypt } from '../crypto';

export interface GA4OAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export interface GA4AuthResult {
  authUrl: string;
  state: string;
}

export interface GA4TokenResult {
  accessToken: string;
  refreshToken: string;
  expiryDate: number;
  scope: string;
}

export interface GA4PropertyData {
  account: string;
  property: string;
  propertyId: string;
  displayName: string;
  industryCategory: string;
  timeZone: string;
}

export class GA4OAuthService {
  private oauth2Client: any;
  private analytics: any;

  constructor(config: GA4OAuthConfig) {
    this.oauth2Client = new google.auth.OAuth2(
      config.clientId,
      config.clientSecret,
      config.redirectUri
    );

    this.analytics = google.analyticsadmin('v1beta');
  }

  // Step 1: Generate OAuth URL
  generateAuthUrl(siteId: string): GA4AuthResult {
    const state = Buffer.from(JSON.stringify({ 
      siteId, 
      timestamp: Date.now() 
    })).toString('base64');

    const authUrl = this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/analytics.readonly',
        'https://www.googleapis.com/auth/analytics.edit',
        'https://www.googleapis.com/auth/analytics'
      ],
      state,
      prompt: 'consent'
    });

    return { authUrl, state };
  }

  // Step 2: Handle OAuth callback
  async handleCallback(code: string, state: string): Promise<{
    siteId: string;
    integration: any;
  }> {
    try {
      // Decode and validate state
      const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
      const { siteId } = stateData;

      // Exchange code for tokens
      const { tokens } = await this.oauth2Client.getToken(code);
      
      if (!tokens.refresh_token) {
        throw new Error('No refresh token received. Please ensure access_type=offline');
      }

      // Set credentials for API calls
      this.oauth2Client.setCredentials(tokens);

      // Get account info
      const accountInfo = await this.getUserInfo();
      
      // Get available properties
      const properties = await this.getProperties();

      // Store integration in database
      const integration = await this.saveIntegration({
        siteId,
        tokens,
        accountInfo,
        properties
      });

      return { siteId, integration };

    } catch (error) {
      console.error('GA4 OAuth callback error:', error);
      throw error;
    }
  }

  // Get user account information
  private async getUserInfo() {
    try {
      const oauth2 = google.oauth2('v2');
      const { data } = await oauth2.userinfo.get({
        auth: this.oauth2Client
      });

      return {
        email: data.email,
        name: data.name,
        picture: data.picture
      };
    } catch (error) {
      console.error('Error getting user info:', error);
      throw error;
    }
  }

  // Get available GA4 properties
  private async getProperties(): Promise<GA4PropertyData[]> {
    try {
      // Get accounts
      const accountsResponse = await this.analytics.accounts.list({
        auth: this.oauth2Client
      });

      const properties: GA4PropertyData[] = [];

      for (const account of accountsResponse.data.accounts || []) {
        // Get properties for each account
        const propertiesResponse = await this.analytics.properties.list({
          filter: `parent:${account.name}`,
          auth: this.oauth2Client
        });

        for (const property of propertiesResponse.data.properties || []) {
          properties.push({
            account: account.displayName || '',
            property: property.name || '',
            propertyId: property.name?.split('/')[1] || '',
            displayName: property.displayName || '',
            industryCategory: property.industryCategory || '',
            timeZone: property.timeZone || ''
          });
        }
      }

      return properties;
    } catch (error) {
      console.error('Error getting GA4 properties:', error);
      throw error;
    }
  }

  // Save integration to database
  private async saveIntegration(data: {
    siteId: string;
    tokens: any;
    accountInfo: any;
    properties: GA4PropertyData[];
  }) {
    try {
      // Encrypt sensitive data
      const encryptedRefreshToken = await encrypt(data.tokens.refresh_token);
      
      const integration = await prisma.ga4Integration.create({
        data: {
          siteId: data.siteId,
          propertyId: data.properties[0]?.propertyId || '',
          refreshToken: encryptedRefreshToken,
          accessToken: data.tokens.access_token || null,
          tokenExpiry: data.tokens.expiry_date ? new Date(data.tokens.expiry_date) : null,
          accountEmail: data.accountInfo.email || '',
          viewId: data.properties[0]?.propertyId || null,
          isActive: true,
          permissions: data.tokens.scope?.split(' ') || [],
          configuration: {
            availableProperties: data.properties,
            userInfo: data.accountInfo
          }
        }
      });

      return integration;
    } catch (error) {
      console.error('Error saving GA4 integration:', error);
      throw error;
    }
  }

  // Get integration for a site
  async getIntegration(siteId: string) {
    try {
      return await prisma.ga4Integration.findUnique({
        where: { siteId },
        include: { site: true }
      });
    } catch (error) {
      console.error('Error getting GA4 integration:', error);
      return null;
    }
  }

  // Refresh access token
  async refreshAccessToken(integrationId: string) {
    try {
      const integration = await prisma.ga4Integration.findUnique({
        where: { id: integrationId }
      });

      if (!integration) {
        throw new Error('Integration not found');
      }

      // Decrypt refresh token
      const refreshToken = await decrypt(integration.refreshToken);
      
      // Set up OAuth client with refresh token
      this.oauth2Client.setCredentials({
        refresh_token: refreshToken
      });

      // Refresh the access token
      const { credentials } = await this.oauth2Client.refreshAccessToken();

      // Update database
      await prisma.ga4Integration.update({
        where: { id: integrationId },
        data: {
          accessToken: credentials.access_token || null,
          tokenExpiry: credentials.expiry_date ? new Date(credentials.expiry_date) : null,
          lastSync: new Date(),
          syncError: null
        }
      });

      return credentials;
    } catch (error) {
      console.error('Error refreshing GA4 access token:', error);
      
      // Update with error
      await prisma.ga4Integration.update({
        where: { id: integrationId },
        data: {
          syncError: error instanceof Error ? error.message : 'Token refresh failed'
        }
      });
      
      throw error;
    }
  }

  // Get authenticated analytics client
  async getAnalyticsClient(siteId: string) {
    try {
      const integration = await this.getIntegration(siteId);
      if (!integration || !integration.isActive) {
        throw new Error('No active GA4 integration found');
      }

      // Check if token needs refresh
      const now = new Date();
      const tokenExpiry = integration.tokenExpiry;
      
      if (!tokenExpiry || now >= tokenExpiry) {
        await this.refreshAccessToken(integration.id);
        // Refetch integration with updated tokens
        const updatedIntegration = await this.getIntegration(siteId);
        if (!updatedIntegration) throw new Error('Integration refresh failed');
        
        this.oauth2Client.setCredentials({
          access_token: updatedIntegration.accessToken,
          refresh_token: await decrypt(updatedIntegration.refreshToken)
        });
      } else {
        this.oauth2Client.setCredentials({
          access_token: integration.accessToken,
          refresh_token: await decrypt(integration.refreshToken)
        });
      }

      return google.analyticsdata('v1beta');
    } catch (error) {
      console.error('Error getting analytics client:', error);
      throw error;
    }
  }

  // Fetch GA4 metrics
  async fetchMetrics(siteId: string, options: {
    startDate: string;
    endDate: string;
    metrics: string[];
    dimensions?: string[];
    filters?: any[];
  }) {
    try {
      const analyticsData = await this.getAnalyticsClient(siteId);
      const integration = await this.getIntegration(siteId);
      
      if (!integration) {
        throw new Error('No GA4 integration found');
      }

      const requestBody = {
        dateRanges: [{
          startDate: options.startDate,
          endDate: options.endDate
        }],
        metrics: options.metrics.map(name => ({ name })),
        dimensions: options.dimensions?.map(name => ({ name })) || [],
      };

      const response = await analyticsData.properties.runReport({
        property: `properties/${integration.propertyId}`,
        requestBody,
        auth: this.oauth2Client
      });

      return {
        rows: response.data.rows || [],
        metadata: response.data.metadata,
        totals: response.data.totals
      };
    } catch (error) {
      console.error('Error fetching GA4 metrics:', error);
      throw error;
    }
  }

  // Disconnect integration
  async disconnect(siteId: string) {
    try {
      await prisma.ga4Integration.update({
        where: { siteId },
        data: {
          isActive: false,
          lastSync: new Date()
        }
      });

      return { success: true };
    } catch (error) {
      console.error('Error disconnecting GA4 integration:', error);
      throw error;
    }
  }

  // Test connection
  async testConnection(siteId: string) {
    try {
      const result = await this.fetchMetrics(siteId, {
        startDate: '7daysAgo',
        endDate: 'today',
        metrics: ['activeUsers', 'sessions']
      });

      // Update last sync time
      await prisma.ga4Integration.update({
        where: { siteId },
        data: {
          lastSync: new Date(),
          syncError: null
        }
      });

      return {
        success: true,
        data: result
      };
    } catch (error) {
      console.error('GA4 connection test failed:', error);
      
      // Update with error
      await prisma.ga4Integration.update({
        where: { siteId },
        data: {
          syncError: error instanceof Error ? error.message : 'Connection test failed'
        }
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Connection test failed'
      };
    }
  }
}

// Common GA4 metrics and dimensions
export const GA4_METRICS = {
  USERS: 'activeUsers',
  NEW_USERS: 'newUsers',
  SESSIONS: 'sessions',
  PAGEVIEWS: 'screenPageViews',
  BOUNCE_RATE: 'bounceRate',
  SESSION_DURATION: 'averageSessionDuration',
  CONVERSIONS: 'conversions',
  CONVERSION_RATE: 'conversionRate',
  REVENUE: 'totalRevenue',
  ECOMMERCE_PURCHASES: 'ecommercePurchases'
} as const;

export const GA4_DIMENSIONS = {
  DATE: 'date',
  COUNTRY: 'country',
  CITY: 'city',
  DEVICE_CATEGORY: 'deviceCategory',
  BROWSER: 'browser',
  OS: 'operatingSystem',
  PAGE_PATH: 'pagePath',
  PAGE_TITLE: 'pageTitle',
  SOURCE: 'sessionSource',
  MEDIUM: 'sessionMedium',
  CAMPAIGN: 'sessionCampaignName'
} as const;
