
interface WordPressPost {
  id: number;
  title: { rendered: string };
  content: { rendered: string };
  status: string;
  slug: string;
  tags: number[];
  categories: number[];
  meta: Record<string, any>;
}

interface WordPressMedia {
  id: number;
  source_url: string;
  alt_text: string;
}

export class WordPressClient {
  private baseUrl: string;
  private username: string;
  private appPassword: string;

  constructor(siteUrl: string, credentials: { username: string; appPassword: string }) {
    this.baseUrl = `${siteUrl}/wp-json/wp/v2`;
    this.username = credentials.username;
    this.appPassword = credentials.appPassword;
  }

  private async makeRequest(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const auth = Buffer.from(`${this.username}:${this.appPassword}`).toString('base64');
    
    const config: RequestInit = {
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
        'User-Agent': 'Orion-CMS/1.0',
        ...options.headers,
      },
      ...options,
    };

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
          const errorText = await response.text();
          throw new Error(`WordPress API error: ${response.status} ${response.statusText} - ${errorText}`);
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

  async createDraft(draftData: {
    title: string;
    content: string;
    external_id?: string;
    score?: number;
    needsReview?: boolean;
  }): Promise<WordPressPost> {
    // Prepare tags
    const tags = ['orion-cms'];
    if (draftData.needsReview) {
      tags.push('review-needed');
    }
    if (draftData.score !== undefined && draftData.score < 0.7) {
      tags.push('sub-threshold');
    }

    // Get or create tag IDs
    const tagIds = await this.getOrCreateTags(tags);

    const postData = {
      title: draftData.title,
      content: draftData.content,
      status: 'draft',
      tags: tagIds,
      meta: {
        orion_external_id: draftData.external_id,
        orion_score: draftData.score,
        orion_needs_review: draftData.needsReview,
        orion_created_at: new Date().toISOString(),
      },
    };

    return await this.makeRequest('/posts', {
      method: 'POST',
      body: JSON.stringify(postData),
    });
  }

  async updateDraft(postId: number, draftData: {
    title?: string;
    content?: string;
    score?: number;
    needsReview?: boolean;
  }): Promise<WordPressPost> {
    // Check if post exists first
    const existingPost = await this.getPost(postId);
    
    const updateData: any = {};
    
    if (draftData.title) updateData.title = draftData.title;
    if (draftData.content) updateData.content = draftData.content;
    
    if (draftData.needsReview !== undefined || draftData.score !== undefined) {
      updateData.meta = {
        ...existingPost.meta,
        orion_score: draftData.score ?? existingPost.meta?.orion_score,
        orion_needs_review: draftData.needsReview ?? existingPost.meta?.orion_needs_review,
        orion_updated_at: new Date().toISOString(),
      };
    }

    return await this.makeRequest(`/posts/${postId}`, {
      method: 'POST',
      body: JSON.stringify(updateData),
    });
  }

  async getPost(postId: number): Promise<WordPressPost> {
    return await this.makeRequest(`/posts/${postId}`);
  }

  async uploadMedia(file: Buffer, filename: string, altText?: string): Promise<WordPressMedia> {
    const formData = new FormData();
    formData.append('file', new Blob([file]), filename);
    
    if (altText) {
      formData.append('alt_text', altText);
    }

    const auth = Buffer.from(`${this.username}:${this.appPassword}`).toString('base64');
    
    const response = await fetch(`${this.baseUrl}/media`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Media upload failed: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  }

  private async getOrCreateTags(tagNames: string[]): Promise<number[]> {
    const tagIds: number[] = [];
    
    for (const tagName of tagNames) {
      // Try to find existing tag
      const existingTags = await this.makeRequest(`/tags?search=${encodeURIComponent(tagName)}`);
      
      let tagId: number;
      const existingTag = existingTags.find((tag: any) => tag.name.toLowerCase() === tagName.toLowerCase());
      
      if (existingTag) {
        tagId = existingTag.id;
      } else {
        // Create new tag
        const newTag = await this.makeRequest('/tags', {
          method: 'POST',
          body: JSON.stringify({
            name: tagName,
            slug: tagName.toLowerCase().replace(/\s+/g, '-'),
          }),
        });
        tagId = newTag.id;
      }
      
      tagIds.push(tagId);
    }
    
    return tagIds;
  }
}
