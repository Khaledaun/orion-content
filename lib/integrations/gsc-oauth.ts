
import { google } from 'googleapis';
import { prisma } from '../prisma';
import { encrypt, decrypt } from '../crypto';

export interface GSCOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export interface GSCAuthResult {
  authUrl: string;
  state: string;
}

export interface GSCSiteData {
  siteUrl: string;
  permissionLevel: string;
}

export class GSCOAuthService {
  private oauth2Client: any;
  private searchConsole: any;

  constructor(config: GSCOAuthConfig) {
    this.oauth2Client = new google.auth.OAuth2(
      config.clientId,
      config.clientSecret,
      config.redirectUri
    );

    this.searchConsole = google.searchconsole('v1');
  }

  // Step 1: Generate OAuth URL
  generateAuthUrl(siteId: string): GSCAuthResult {
    const state = Buffer.from(JSON.stringify({ 
      siteId, 
      timestamp: Date.now() 
    })).toString('base64');

    const authUrl = this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/webmasters.readonly',
        'https://www.googleapis.com/auth/webmasters'
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
      
      // Get available sites
      const sites = await this.getSites();

      // Store integration in database
      const integration = await this.saveIntegration({
        siteId,
        tokens,
        accountInfo,
        sites
      });

      return { siteId, integration };

    } catch (error) {
      console.error('GSC OAuth callback error:', error);
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

  // Get available GSC sites
  private async getSites(): Promise<GSCSiteData[]> {
    try {
      const response = await this.searchConsole.sites.list({
        auth: this.oauth2Client
      });

      return (response.data.siteEntry || []).map((site: any) => ({
        siteUrl: site.siteUrl,
        permissionLevel: site.permissionLevel
      }));
    } catch (error) {
      console.error('Error getting GSC sites:', error);
      throw error;
    }
  }

  // Save integration to database
  private async saveIntegration(data: {
    siteId: string;
    tokens: any;
    accountInfo: any;
    sites: GSCSiteData[];
  }) {
    try {
      // Encrypt sensitive data
      const encryptedRefreshToken = await encrypt(data.tokens.refresh_token);
      
      // Try to find the best matching site URL
      const site = await prisma.site.findUnique({
        where: { id: data.siteId }
      });

      const primarySiteUrl = data.sites[0]?.siteUrl || '';
      
      const integration = await prisma.gscIntegration.create({
        data: {
          siteId: data.siteId,
          siteUrl: primarySiteUrl,
          refreshToken: encryptedRefreshToken,
          accessToken: data.tokens.access_token || null,
          tokenExpiry: data.tokens.expiry_date ? new Date(data.tokens.expiry_date) : null,
          accountEmail: data.accountInfo.email || '',
          isActive: true,
          permissions: data.tokens.scope?.split(' ') || [],
          configuration: {
            availableSites: data.sites,
            userInfo: data.accountInfo
          }
        }
      });

      return integration;
    } catch (error) {
      console.error('Error saving GSC integration:', error);
      throw error;
    }
  }

  // Get integration for a site
  async getIntegration(siteId: string) {
    try {
      return await prisma.gscIntegration.findUnique({
        where: { siteId },
        include: { site: true }
      });
    } catch (error) {
      console.error('Error getting GSC integration:', error);
      return null;
    }
  }

  // Refresh access token
  async refreshAccessToken(integrationId: string) {
    try {
      const integration = await prisma.gscIntegration.findUnique({
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
      await prisma.gscIntegration.update({
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
      console.error('Error refreshing GSC access token:', error);
      
      // Update with error
      await prisma.gscIntegration.update({
        where: { id: integrationId },
        data: {
          syncError: error instanceof Error ? error.message : 'Token refresh failed'
        }
      });
      
      throw error;
    }
  }

  // Get authenticated search console client
  async getSearchConsoleClient(siteId: string) {
    try {
      const integration = await this.getIntegration(siteId);
      if (!integration || !integration.isActive) {
        throw new Error('No active GSC integration found');
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

      return this.searchConsole;
    } catch (error) {
      console.error('Error getting search console client:', error);
      throw error;
    }
  }

  // Fetch search analytics data
  async fetchSearchAnalytics(siteId: string, options: {
    startDate: string;
    endDate: string;
    dimensions?: string[];
    type?: 'web' | 'image' | 'video';
    searchType?: 'web' | 'image' | 'video';
    rowLimit?: number;
    startRow?: number;
  }) {
    try {
      const searchConsole = await this.getSearchConsoleClient(siteId);
      const integration = await this.getIntegration(siteId);
      
      if (!integration) {
        throw new Error('No GSC integration found');
      }

      const request = {
        siteUrl: integration.siteUrl,
        requestBody: {
          startDate: options.startDate,
          endDate: options.endDate,
          dimensions: options.dimensions || ['query'],
          type: options.type || 'web',
          searchType: options.searchType || 'web',
          rowLimit: options.rowLimit || 1000,
          startRow: options.startRow || 0
        }
      };

      const response = await searchConsole.searchanalytics.query(request);

      return {
        rows: response.data.rows || [],
        responseAggregationType: response.data.responseAggregationType
      };
    } catch (error) {
      console.error('Error fetching GSC search analytics:', error);
      throw error;
    }
  }

  // Get site sitemaps
  async getSitemaps(siteId: string) {
    try {
      const searchConsole = await this.getSearchConsoleClient(siteId);
      const integration = await this.getIntegration(siteId);
      
      if (!integration) {
        throw new Error('No GSC integration found');
      }

      const response = await searchConsole.sitemaps.list({
        siteUrl: integration.siteUrl
      });

      return response.data.sitemap || [];
    } catch (error) {
      console.error('Error fetching GSC sitemaps:', error);
      throw error;
    }
  }

  // Get URL inspection data
  async inspectUrl(siteId: string, inspectionUrl: string) {
    try {
      const searchConsole = await this.getSearchConsoleClient(siteId);
      const integration = await this.getIntegration(siteId);
      
      if (!integration) {
        throw new Error('No GSC integration found');
      }

      const response = await searchConsole.urlInspection.index.inspect({
        requestBody: {
          inspectionUrl: inspectionUrl,
          siteUrl: integration.siteUrl
        }
      });

      return response.data;
    } catch (error) {
      console.error('Error inspecting URL:', error);
      throw error;
    }
  }

  // Get top queries
  async getTopQueries(siteId: string, options: {
    startDate: string;
    endDate: string;
    limit?: number;
  }) {
    try {
      const result = await this.fetchSearchAnalytics(siteId, {
        startDate: options.startDate,
        endDate: options.endDate,
        dimensions: ['query'],
        rowLimit: options.limit || 100
      });

      return result.rows?.map((row: any) => ({
        query: row.keys?.[0],
        clicks: row.clicks || 0,
        impressions: row.impressions || 0,
        ctr: row.ctr || 0,
        position: row.position || 0
      })) || [];
    } catch (error) {
      console.error('Error getting top queries:', error);
      throw error;
    }
  }

  // Get top pages
  async getTopPages(siteId: string, options: {
    startDate: string;
    endDate: string;
    limit?: number;
  }) {
    try {
      const result = await this.fetchSearchAnalytics(siteId, {
        startDate: options.startDate,
        endDate: options.endDate,
        dimensions: ['page'],
        rowLimit: options.limit || 100
      });

      return result.rows?.map((row: any) => ({
        page: row.keys?.[0],
        clicks: row.clicks || 0,
        impressions: row.impressions || 0,
        ctr: row.ctr || 0,
        position: row.position || 0
      })) || [];
    } catch (error) {
      console.error('Error getting top pages:', error);
      throw error;
    }
  }

  // Disconnect integration
  async disconnect(siteId: string) {
    try {
      await prisma.gscIntegration.update({
        where: { siteId },
        data: {
          isActive: false,
          lastSync: new Date()
        }
      });

      return { success: true };
    } catch (error) {
      console.error('Error disconnecting GSC integration:', error);
      throw error;
    }
  }

  // Test connection
  async testConnection(siteId: string) {
    try {
      const result = await this.getTopQueries(siteId, {
        startDate: '7daysAgo',
        endDate: 'yesterday',
        limit: 10
      });

      // Update last sync time
      await prisma.gscIntegration.update({
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
      console.error('GSC connection test failed:', error);
      
      // Update with error
      await prisma.gscIntegration.update({
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

// Common GSC dimensions
export const GSC_DIMENSIONS = {
  QUERY: 'query',
  PAGE: 'page',
  COUNTRY: 'country',
  DEVICE: 'device',
  DATE: 'date'
} as const;

// GSC search types
export const GSC_SEARCH_TYPES = {
  WEB: 'web',
  IMAGE: 'image',
  VIDEO: 'video'
} as const;
