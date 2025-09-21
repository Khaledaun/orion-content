/**
 * WordPress REST API Connector
 * Production-grade WordPress integration for Orion
 */

import { logger } from "../logger";
import { redactSensitive } from "../redact";

export interface WordPressCredentials {
  siteUrl: string;
  username: string;
  appPassword: string;
}

export interface WordPressPost {
  id: number;
  title: { rendered: string };
  content: { rendered: string };
  excerpt: { rendered: string };
  status: string;
  date: string;
  link: string;
  slug: string;
  categories: number[];
  tags: number[];
  featured_media: number;
  meta: Record<string, any>;
}

export interface WordPressPostCreate {
  title: string;
  content: string;
  excerpt?: string;
  status: "draft" | "publish" | "private" | "pending";
  slug?: string;
  categories?: number[];
  tags?: number[];
  featured_media?: number;
  meta?: Record<string, any>;
}

export interface WordPressPostUpdate extends Partial<WordPressPostCreate> {
  id: number;
}

export interface WordPressCategory {
  id: number;
  name: string;
  slug: string;
  count: number;
}

export interface WordPressTag {
  id: number;
  name: string;
  slug: string;
  count: number;
}

export interface WordPressMedia {
  id: number;
  title: { rendered: string };
  source_url: string;
  alt_text: string;
  media_type: string;
  mime_type: string;
}

export interface WordPressConnectionTest {
  success: boolean;
  message: string;
  siteInfo?: {
    name: string;
    description: string;
    url: string;
    version: string;
  };
}

export class WordPressConnector {
  private credentials: WordPressCredentials;
  private baseUrl: string;
  private authHeader: string;

  constructor(credentials: WordPressCredentials) {
    this.credentials = credentials;
    this.baseUrl = credentials.siteUrl.replace(/\/$/, ""); // Remove trailing slash
    
    // Create Basic Auth header
    const authString = `${credentials.username}:${credentials.appPassword}`;
    this.authHeader = `Basic ${Buffer.from(authString).toString("base64")}`;
  }

  /**
   * Test WordPress connection and return site information
   */
  async testConnection(): Promise<WordPressConnectionTest> {
    try {
      const response = await fetch(`${this.baseUrl}/wp-json/wp/v2/`, {
        method: "GET",
        headers: {
          "Authorization": this.authHeader,
          "Content-Type": "application/json",
        },
        signal: AbortSignal.timeout(10000), // 10 second timeout
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          message: `WordPress API error: ${response.status} ${response.statusText} - ${errorText}`,
        };
      }

      const siteInfo = await response.json();
      
      return {
        success: true,
        message: "Connection successful",
        siteInfo: {
          name: siteInfo.name || "Unknown Site",
          description: siteInfo.description || "",
          url: siteInfo.url || this.baseUrl,
          version: siteInfo.version || "Unknown",
        },
      };
    } catch (error) {
      logger.error(
        {
          error: redactSensitive(error),
          siteUrl: redactSensitive(this.baseUrl),
        },
        "WordPress connection test failed"
      );
      
      return {
        success: false,
        message: `Connection failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  }

  /**
   * Create a new WordPress post
   */
  async createPost(post: WordPressPostCreate): Promise<WordPressPost> {
    try {
      const response = await fetch(`${this.baseUrl}/wp-json/wp/v2/posts`, {
        method: "POST",
        headers: {
          "Authorization": this.authHeader,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(post),
        signal: AbortSignal.timeout(30000), // 30 second timeout
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`WordPress API error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const result = await response.json();
      
      logger.info(
        {
          postId: result.id,
          title: redactSensitive(post.title),
          status: post.status,
        },
        "WordPress post created successfully"
      );

      return result;
    } catch (error) {
      logger.error(
        {
          error: redactSensitive(error),
          title: redactSensitive(post.title),
          status: post.status,
        },
        "Failed to create WordPress post"
      );
      throw error;
    }
  }

  /**
   * Update an existing WordPress post
   */
  async updatePost(post: WordPressPostUpdate): Promise<WordPressPost> {
    try {
      const { id, ...updateData } = post;
      
      const response = await fetch(`${this.baseUrl}/wp-json/wp/v2/posts/${id}`, {
        method: "POST", // WordPress uses POST for updates
        headers: {
          "Authorization": this.authHeader,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updateData),
        signal: AbortSignal.timeout(30000),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`WordPress API error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const result = await response.json();
      
      logger.info(
        {
          postId: id,
          title: redactSensitive(updateData.title),
        },
        "WordPress post updated successfully"
      );

      return result;
    } catch (error) {
      logger.error(
        {
          error: redactSensitive(error),
          postId: post.id,
          title: redactSensitive(post.title),
        },
        "Failed to update WordPress post"
      );
      throw error;
    }
  }

  /**
   * Get a WordPress post by ID
   */
  async getPost(id: number): Promise<WordPressPost> {
    try {
      const response = await fetch(`${this.baseUrl}/wp-json/wp/v2/posts/${id}`, {
        method: "GET",
        headers: {
          "Authorization": this.authHeader,
          "Content-Type": "application/json",
        },
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`WordPress API error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      logger.error(
        {
          error: redactSensitive(error),
          postId: id,
        },
        "Failed to get WordPress post"
      );
      throw error;
    }
  }

  /**
   * List WordPress posts with optional filtering
   */
  async listPosts(options: {
    per_page?: number;
    page?: number;
    status?: string;
    search?: string;
    categories?: number[];
    tags?: number[];
  } = {}): Promise<WordPressPost[]> {
    try {
      const params = new URLSearchParams();
      
      if (options.per_page) params.append("per_page", options.per_page.toString());
      if (options.page) params.append("page", options.page.toString());
      if (options.status) params.append("status", options.status);
      if (options.search) params.append("search", options.search);
      if (options.categories) params.append("categories", options.categories.join(","));
      if (options.tags) params.append("tags", options.tags.join(","));

      const response = await fetch(`${this.baseUrl}/wp-json/wp/v2/posts?${params}`, {
        method: "GET",
        headers: {
          "Authorization": this.authHeader,
          "Content-Type": "application/json",
        },
        signal: AbortSignal.timeout(15000),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`WordPress API error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      logger.error(
        {
          error: redactSensitive(error),
          options,
        },
        "Failed to list WordPress posts"
      );
      throw error;
    }
  }

  /**
   * Get WordPress categories
   */
  async getCategories(): Promise<WordPressCategory[]> {
    try {
      const response = await fetch(`${this.baseUrl}/wp-json/wp/v2/categories`, {
        method: "GET",
        headers: {
          "Authorization": this.authHeader,
          "Content-Type": "application/json",
        },
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`WordPress API error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      logger.error(
        {
          error: redactSensitive(error),
        },
        "Failed to get WordPress categories"
      );
      throw error;
    }
  }

  /**
   * Get WordPress tags
   */
  async getTags(): Promise<WordPressTag[]> {
    try {
      const response = await fetch(`${this.baseUrl}/wp-json/wp/v2/tags`, {
        method: "GET",
        headers: {
          "Authorization": this.authHeader,
          "Content-Type": "application/json",
        },
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`WordPress API error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      logger.error(
        {
          error: redactSensitive(error),
        },
        "Failed to get WordPress tags"
      );
      throw error;
    }
  }

  /**
   * Upload media to WordPress
   */
  async uploadMedia(file: File, altText?: string): Promise<WordPressMedia> {
    try {
      const formData = new FormData();
      formData.append("file", file);
      if (altText) {
        formData.append("alt_text", altText);
      }

      const response = await fetch(`${this.baseUrl}/wp-json/wp/v2/media`, {
        method: "POST",
        headers: {
          "Authorization": this.authHeader,
        },
        body: formData,
        signal: AbortSignal.timeout(60000), // 60 second timeout for file uploads
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`WordPress API error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const result = await response.json();
      
      logger.info(
        {
          mediaId: result.id,
          filename: file.name,
          mimeType: file.type,
        },
        "WordPress media uploaded successfully"
      );

      return result;
    } catch (error) {
      logger.error(
        {
          error: redactSensitive(error),
          filename: file.name,
          mimeType: file.type,
        },
        "Failed to upload WordPress media"
      );
      throw error;
    }
  }

  /**
   * Get WordPress media by ID
   */
  async getMedia(id: number): Promise<WordPressMedia> {
    try {
      const response = await fetch(`${this.baseUrl}/wp-json/wp/v2/media/${id}`, {
        method: "GET",
        headers: {
          "Authorization": this.authHeader,
          "Content-Type": "application/json",
        },
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`WordPress API error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      logger.error(
        {
          error: redactSensitive(error),
          mediaId: id,
        },
        "Failed to get WordPress media"
      );
      throw error;
    }
  }

  /**
   * Delete a WordPress post
   */
  async deletePost(id: number, force: boolean = false): Promise<boolean> {
    try {
      const params = new URLSearchParams();
      if (force) params.append("force", "true");

      const response = await fetch(`${this.baseUrl}/wp-json/wp/v2/posts/${id}?${params}`, {
        method: "DELETE",
        headers: {
          "Authorization": this.authHeader,
          "Content-Type": "application/json",
        },
        signal: AbortSignal.timeout(15000),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`WordPress API error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      logger.info(
        {
          postId: id,
          force,
        },
        "WordPress post deleted successfully"
      );

      return true;
    } catch (error) {
      logger.error(
        {
          error: redactSensitive(error),
          postId: id,
        },
        "Failed to delete WordPress post"
      );
      throw error;
    }
  }
}
