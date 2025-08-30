
import { TenWebSite } from '@prisma/client';

interface TenWebSiteData {
  id: string;
  url: string;
  name: string;
  status: 'active' | 'inactive';
}

interface TenWebSyncResponse {
  success: boolean;
  message: string;
  draftId?: string;
}

export class TenWebClient {
  private apiToken: string;
  private baseUrl = 'https://api.10web.io/v1';

  constructor() {
    this.apiToken = process.env.TENWEB_API_TOKEN || '';
    if (!this.apiToken) {
      throw new Error('TENWEB_API_TOKEN is required');
    }
  }

  private async makeRequest(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const config: RequestInit = {
      headers: {
        'Authorization': `Bearer ${this.apiToken}`,
        'Content-Type': 'application/json',
        'User-Agent': 'Orion-CMS/1.0',
        ...options.headers,
      },
      ...options,
    };

    // Add Idempotency-Key for POST/PUT requests
    if (options.method && ['POST', 'PUT'].includes(options.method)) {
      config.headers = {
        ...config.headers,
        'Idempotency-Key': `orion-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      };
    }

    let attempt = 0;
    const maxRetries = 3;

    while (attempt < maxRetries) {
      try {
        const response = await fetch(url, config);
        
        if (response.status === 429) {
          // Rate limited - wait and retry
          const retryAfter = response.headers.get('retry-after');
          const delay = retryAfter ? parseInt(retryAfter) * 1000 : Math.pow(2, attempt) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
          attempt++;
          continue;
        }

        if (response.status >= 500) {
          // Server error - retry with exponential backoff
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
          attempt++;
          continue;
        }

        if (!response.ok) {
          throw new Error(`10Web API error: ${response.status} ${response.statusText}`);
        }

        return await response.json();
      } catch (error) {
        if (attempt === maxRetries - 1) {
          throw error;
        }
        attempt++;
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }
  }

  async registerSite(siteData: {
    orionSiteId: string;
    name: string;
    url?: string;
  }): Promise<TenWebSiteData> {
    return await this.makeRequest('/sites', {
      method: 'POST',
      body: JSON.stringify({
        name: siteData.name,
        url: siteData.url || `https://${siteData.name.toLowerCase().replace(/\s+/g, '-')}.com`,
        external_id: siteData.orionSiteId,
        platform: 'orion-cms',
      }),
    });
  }

  async syncSite(tenWebSiteId: string): Promise<TenWebSyncResponse> {
    const response = await this.makeRequest(`/sites/${tenWebSiteId}/sync`, {
      method: 'POST',
      body: JSON.stringify({
        action: 'create_draft',
        content: {
          title: 'Hello from Orion CMS',
          content: '<p>This is a test draft created by Orion Content Management System.</p>',
          status: 'draft',
          tags: ['orion-test', 'api-integration'],
        },
      }),
    });

    return {
      success: response.success || false,
      message: response.message || 'Sync completed',
      draftId: response.draft_id,
    };
  }

  async getSiteStatus(tenWebSiteId: string): Promise<TenWebSiteData> {
    return await this.makeRequest(`/sites/${tenWebSiteId}`);
  }

  async listSites(): Promise<TenWebSiteData[]> {
    const response = await this.makeRequest('/sites');
    return response.sites || [];
  }
}
