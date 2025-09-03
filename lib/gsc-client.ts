
import { google } from 'googleapis';

// Define local types to avoid dependency on Prisma generated types
type GscConnection = {
  id: string;
  siteId: string;
  gscSiteUrl: string;
  credentialsEnc: string;
  verified: boolean;
  createdAt: Date;
  updatedAt: Date;
};

type GscSnapshot = {
  id: string;
  siteId: string;
  dataType: string;
  data: any; // JSON
  capturedAt: Date;
};

interface GscPerformanceData {
  rows: Array<{
    keys: string[];
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
  }>;
}

interface GscSitemapData {
  sitemap: string;
  status: string;
  lastSubmitted: string;
  warnings?: string[];
  errors?: string[];
}

export class GscClient {
  private searchconsole: any;

  constructor(credentials: {
    client_id: string;
    client_secret: string;
    refresh_token: string;
  }) {
    const oauth2Client = new google.auth.OAuth2(
      credentials.client_id,
      credentials.client_secret,
      'urn:ietf:wg:oauth:2.0:oob'
    );

    oauth2Client.setCredentials({
      refresh_token: credentials.refresh_token,
    });

    this.searchconsole = google.searchconsole({
      version: 'v1',
      auth: oauth2Client,
    });
  }

  static fromEnvironment(): GscClient {
    const credentials = {
      client_id: process.env.GSC_CLIENT_ID || '',
      client_secret: process.env.GSC_CLIENT_SECRET || '',
      refresh_token: process.env.GSC_REFRESH_TOKEN || '',
    };

    if (!credentials.client_id || !credentials.client_secret || !credentials.refresh_token) {
      throw new Error('GSC credentials not found in environment');
    }

    return new GscClient(credentials);
  }

  async listSites(): Promise<Array<{ siteUrl: string; permissionLevel: string }>> {
    try {
      const response = await this.searchconsole.sites.list();
      return response.data.siteEntry?.map((site: any) => ({
        siteUrl: site.siteUrl,
        permissionLevel: site.permissionLevel,
      })) || [];
    } catch (error) {
      throw new Error(`GSC API error: ${error}`);
    }
  }

  async submitSitemap(siteUrl: string, sitemapUrl: string): Promise<void> {
    try {
      await this.searchconsole.sitemaps.submit({
        siteUrl,
        feedpath: sitemapUrl,
      });
    } catch (error) {
      throw new Error(`Failed to submit sitemap: ${error}`);
    }
  }

  async getSitemaps(siteUrl: string): Promise<GscSitemapData[]> {
    try {
      const response = await this.searchconsole.sitemaps.list({
        siteUrl,
      });

      return response.data.sitemap?.map((sitemap: any) => ({
        sitemap: sitemap.feedpath,
        status: sitemap.status,
        lastSubmitted: sitemap.lastSubmitted,
        warnings: sitemap.warnings?.map((w: any) => w.message),
        errors: sitemap.errors?.map((e: any) => e.message),
      })) || [];
    } catch (error) {
      throw new Error(`Failed to get sitemaps: ${error}`);
    }
  }

  async getPerformanceData(
    siteUrl: string,
    startDate: string,
    endDate: string,
    dimensions: string[] = ['page']
  ): Promise<GscPerformanceData> {
    try {
      const response = await this.searchconsole.searchanalytics.query({
        siteUrl,
        requestBody: {
          startDate,
          endDate,
          dimensions,
          rowLimit: 1000,
        },
      });

      return {
        rows: response.data.rows?.map((row: any) => ({
          keys: row.keys,
          clicks: row.clicks,
          impressions: row.impressions,
          ctr: row.ctr,
          position: row.position,
        })) || [],
      };
    } catch (error) {
      throw new Error(`Failed to get performance data: ${error}`);
    }
  }

  async verifyProperty(siteUrl: string): Promise<boolean> {
    try {
      const response = await this.searchconsole.sites.get({
        siteUrl,
      });
      return response.data.verified === true;
    } catch (error) {
      return false;
    }
  }
}
