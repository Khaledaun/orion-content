/**
 * WordPress Integration Manager
 * Extends the existing IntegrationManager with WordPress-specific functionality
 */

import { IntegrationManager, IntegrationType, IntegrationCredentials } from "../integration-manager";
import { WordPressConnector, WordPressCredentials, WordPressPost, WordPressPostCreate } from "./connector";
import { prisma } from "../prisma";
import { logger } from "../logger";
import { redactSensitive } from "../redact";

export interface WordPressIntegrationInfo {
  id: string;
  siteId: string;
  siteUrl: string;
  verified: boolean;
  lastTestAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  siteInfo?: {
    name: string;
    description: string;
    url: string;
    version: string;
  };
}

export interface WordPressPublishResult {
  success: boolean;
  postId?: number;
  postUrl?: string;
  error?: string;
  retryable?: boolean;
}

export interface WordPressDraftResult {
  success: boolean;
  postId?: number;
  postUrl?: string;
  previewUrl?: string;
  error?: string;
}

export class WordPressIntegrationManager extends IntegrationManager {
  /**
   * Save WordPress credentials for a site
   */
  async saveWordPressCredentials(
    siteId: string,
    credentials: WordPressCredentials
  ): Promise<WordPressIntegrationInfo> {
    try {
      const integration = await this.saveCredentials(
        IntegrationType.WORDPRESS,
        credentials as unknown as IntegrationCredentials,
        siteId
      );

      // Test the connection immediately
      const testResult = await this.testWordPressConnectionBySite(siteId);
      
      return {
        id: integration.id,
        siteId: integration.siteId || siteId,
        siteUrl: credentials.siteUrl,
        verified: testResult.success,
        lastTestAt: testResult.success ? new Date() : null,
        createdAt: integration.createdAt,
        updatedAt: integration.updatedAt,
        siteInfo: testResult.siteInfo,
      };
    } catch (error) {
      logger.error(
        {
          error: redactSensitive(error),
          siteId,
          siteUrl: redactSensitive(credentials.siteUrl),
        },
        "Failed to save WordPress credentials"
      );
      throw error;
    }
  }

  /**
   * Get WordPress integration info for a site
   */
  async getWordPressIntegration(siteId: string): Promise<WordPressIntegrationInfo | null> {
    try {
      const integration: any = await this.getCredentials(IntegrationType.WORDPRESS, siteId);

      if (!integration) {
        return null;
      }

      const credentials = integration.credentials as WordPressCredentials;

      return {
        id: integration.id,
        siteId: integration.siteId || siteId,
        siteUrl: credentials.siteUrl,
        verified: integration.verified,
        lastTestAt: integration.lastTestAt,
        createdAt: integration.createdAt,
        updatedAt: integration.updatedAt,
      };
    } catch (error) {
      logger.error(
        {
          error: redactSensitive(error),
          siteId,
        },
        "Failed to get WordPress integration"
      );
      return null;
    }
  }

  /**
   * Test WordPress connection for a site
   * Site-specific override that fetches credentials internally
   */
  async testWordPressConnectionBySite(siteId: string): Promise<{
    success: boolean;
    message: string;
    siteInfo?: {
      name: string;
      description: string;
      url: string;
      version: string;
    };
  }> {
    try {
      const credentials = await this.getCredentials(IntegrationType.WORDPRESS, siteId);
      
      if (!credentials) {
        return {
          success: false,
          message: "No WordPress credentials found for this site",
        };
      }

      const wpCredentials = credentials as unknown as WordPressCredentials;
      const connector = new WordPressConnector(wpCredentials);
      
      const testResult = await connector.testConnection();
      
      // Update verification status
      if (testResult.success) {
        await prisma.integration.update({
          where: {
            siteId_type: {
              siteId,
              type: IntegrationType.WORDPRESS,
            },
          },
          data: {
            verified: true,
            lastTestAt: new Date(),
          },
        });
      }

      return testResult;
    } catch (error) {
      logger.error(
        {
          error: redactSensitive(error),
          siteId,
        },
        "WordPress connection test failed"
      );
      
      return {
        success: false,
        message: `Connection test failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  }

  /**
   * Create a WordPress connector for a site
   */
  private async createConnector(siteId: string): Promise<WordPressConnector> {
    const credentials = await this.getCredentials(IntegrationType.WORDPRESS, siteId);
    
    if (!credentials) {
      throw new Error("No WordPress credentials found for this site");
    }

    const wpCredentials = credentials as unknown as WordPressCredentials;
    return new WordPressConnector(wpCredentials);
  }

  /**
   * Stream a draft to WordPress
   */
  async streamDraftToWordPress(
    siteId: string,
    draft: {
      title: string;
      content: string;
      excerpt?: string;
      slug?: string;
      categories?: string[];
      tags?: string[];
      featuredImage?: {
        url: string;
        altText?: string;
      };
      meta?: Record<string, any>;
    }
  ): Promise<WordPressDraftResult> {
    try {
      const connector = await this.createConnector(siteId);
      
      // Map categories and tags to WordPress IDs
      const categoryIds = await this.mapCategoriesToIds(connector, draft.categories || []);
      const tagIds = await this.mapTagsToIds(connector, draft.tags || []);
      
      // Upload featured image if provided
      let featuredMediaId: number | undefined;
      if (draft.featuredImage) {
        try {
          // For now, we'll skip image upload and just store the URL in meta
          // In a full implementation, we'd download and upload the image
          draft.meta = {
            ...draft.meta,
            featured_image_url: draft.featuredImage.url,
            featured_image_alt: draft.featuredImage.altText,
          };
        } catch (error) {
          logger.warn(
            {
              error: redactSensitive(error),
              imageUrl: redactSensitive(draft.featuredImage.url),
            },
            "Failed to upload featured image, continuing without it"
          );
        }
      }

      const postData: WordPressPostCreate = {
        title: draft.title,
        content: draft.content,
        excerpt: draft.excerpt,
        status: "draft",
        slug: draft.slug,
        categories: categoryIds,
        tags: tagIds,
        featured_media: featuredMediaId,
        meta: draft.meta,
      };

      const post = await connector.createPost(postData);
      
      logger.info(
        {
          siteId,
          postId: post.id,
          title: redactSensitive(draft.title),
        },
        "Draft streamed to WordPress successfully"
      );

      return {
        success: true,
        postId: post.id,
        postUrl: post.link,
        previewUrl: `${post.link}?preview=true`,
      };
    } catch (error) {
      logger.error(
        {
          error: redactSensitive(error),
          siteId,
          title: redactSensitive(draft.title),
        },
        "Failed to stream draft to WordPress"
      );
      
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Publish a WordPress post
   */
  async publishWordPressPost(
    siteId: string,
    postId: number
  ): Promise<WordPressPublishResult> {
    try {
      const connector = await this.createConnector(siteId);
      
      const post = await connector.updatePost({
        id: postId,
        status: "publish",
      });
      
      logger.info(
        {
          siteId,
          postId,
          title: redactSensitive(post.title.rendered),
        },
        "WordPress post published successfully"
      );

      return {
        success: true,
        postId: post.id,
        postUrl: post.link,
      };
    } catch (error) {
      logger.error(
        {
          error: redactSensitive(error),
          siteId,
          postId,
        },
        "Failed to publish WordPress post"
      );
      
      // Determine if the error is retryable
      const retryable = this.isRetryableError(error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        retryable,
      };
    }
  }

  /**
   * Update a WordPress post
   */
  async updateWordPressPost(
    siteId: string,
    postId: number,
    updates: Partial<WordPressPostCreate>
  ): Promise<WordPressPublishResult> {
    try {
      const connector = await this.createConnector(siteId);
      
      const post = await connector.updatePost({
        id: postId,
        ...updates,
      });
      
      logger.info(
        {
          siteId,
          postId,
          title: redactSensitive(updates.title),
        },
        "WordPress post updated successfully"
      );

      return {
        success: true,
        postId: post.id,
        postUrl: post.link,
      };
    } catch (error) {
      logger.error(
        {
          error: redactSensitive(error),
          siteId,
          postId,
        },
        "Failed to update WordPress post"
      );
      
      const retryable = this.isRetryableError(error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        retryable,
      };
    }
  }

  /**
   * Get WordPress post by ID
   */
  async getWordPressPost(siteId: string, postId: number): Promise<WordPressPost | null> {
    try {
      const connector = await this.createConnector(siteId);
      return await connector.getPost(postId);
    } catch (error) {
      logger.error(
        {
          error: redactSensitive(error),
          siteId,
          postId,
        },
        "Failed to get WordPress post"
      );
      return null;
    }
  }

  /**
   * List WordPress posts for a site
   */
  async listWordPressPosts(
    siteId: string,
    options: {
      per_page?: number;
      page?: number;
      status?: string;
      search?: string;
    } = {}
  ): Promise<WordPressPost[]> {
    try {
      const connector = await this.createConnector(siteId);
      return await connector.listPosts(options);
    } catch (error) {
      logger.error(
        {
          error: redactSensitive(error),
          siteId,
          options,
        },
        "Failed to list WordPress posts"
      );
      return [];
    }
  }

  /**
   * Map category names to WordPress category IDs
   */
  private async mapCategoriesToIds(
    connector: WordPressConnector,
    categoryNames: string[]
  ): Promise<number[]> {
    if (categoryNames.length === 0) return [];
    
    try {
      const categories = await connector.getCategories();
      const categoryMap = new Map(categories.map(cat => [cat.name.toLowerCase(), cat.id]));
      
      return categoryNames
        .map(name => categoryMap.get(name.toLowerCase()))
        .filter((id): id is number => id !== undefined);
    } catch (error) {
      logger.warn(
        {
          error: redactSensitive(error),
          categoryNames,
        },
        "Failed to map categories, continuing without them"
      );
      return [];
    }
  }

  /**
   * Map tag names to WordPress tag IDs
   */
  private async mapTagsToIds(
    connector: WordPressConnector,
    tagNames: string[]
  ): Promise<number[]> {
    if (tagNames.length === 0) return [];
    
    try {
      const tags = await connector.getTags();
      const tagMap = new Map(tags.map(tag => [tag.name.toLowerCase(), tag.id]));
      
      return tagNames
        .map(name => tagMap.get(name.toLowerCase()))
        .filter((id): id is number => id !== undefined);
    } catch (error) {
      logger.warn(
        {
          error: redactSensitive(error),
          tagNames,
        },
        "Failed to map tags, continuing without them"
      );
      return [];
    }
  }

  /**
   * Determine if an error is retryable
   */
  private isRetryableError(error: unknown): boolean {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      
      // Network errors are retryable
      if (message.includes("network") || message.includes("timeout") || message.includes("connection")) {
        return true;
      }
      
      // Rate limiting is retryable
      if (message.includes("rate limit") || message.includes("too many requests")) {
        return true;
      }
      
      // Server errors (5xx) are retryable
      if (message.includes("500") || message.includes("502") || message.includes("503") || message.includes("504")) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Delete WordPress credentials for a site
   */
  async deleteWordPressCredentials(siteId: string): Promise<boolean> {
    try {
      // TODO: Implement deleteCredentials in base IntegrationManager class
      await prisma.integration.deleteMany({
        where: {
          siteId: siteId,
          type: IntegrationType.WORDPRESS,
        },
      });
      
      logger.info(
        {
          siteId,
        },
        "WordPress credentials deleted successfully"
      );
      
      return true;
    } catch (error) {
      logger.error(
        {
          error: redactSensitive(error),
          siteId,
        },
        "Failed to delete WordPress credentials"
      );
      return false;
    }
  }
}
