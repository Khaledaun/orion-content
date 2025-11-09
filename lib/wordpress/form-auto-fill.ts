/**
 * WordPress Form Auto-Fill System
 * Automatically populates WordPress post forms with optimized SEO data
 */

import { WordPressConnector } from "./connector";
import { logger } from "@/lib/logger";
import { redactSensitive } from "@/lib/redact";

export interface WordPressFormData {
  title: string;
  content: string;
  excerpt?: string;
  slug?: string;
  meta: {
    title?: string;
    description?: string;
    keywords?: string[];
    canonical?: string;
    robots?: string;
    ogTitle?: string;
    ogDescription?: string;
    ogImage?: string;
    twitterTitle?: string;
    twitterDescription?: string;
    twitterImage?: string;
  };
  categories?: number[];
  tags?: number[];
  featuredImage?: number;
  customFields?: Record<string, any>;
}

export interface WordPressPluginConfig {
  yoast: {
    enabled: boolean;
    fields: {
      focusKeyword?: string;
      seoTitle?: string;
      metaDescription?: string;
      socialTitle?: string;
      socialDescription?: string;
      socialImage?: string;
    };
  };
  rankmath: {
    enabled: boolean;
    fields: {
      focusKeyword?: string;
      seoTitle?: string;
      metaDescription?: string;
      socialTitle?: string;
      socialDescription?: string;
      socialImage?: string;
    };
  };
  seopress: {
    enabled: boolean;
    fields: {
      title?: string;
      description?: string;
      keywords?: string;
      socialTitle?: string;
      socialDescription?: string;
      socialImage?: string;
    };
  };
}

export class WordPressFormAutoFill {
  private connector: WordPressConnector;

  constructor(connector: WordPressConnector) {
    this.connector = connector;
  }

  async detectWordPressPlugins(): Promise<WordPressPluginConfig> {
    try {
      // This would typically make API calls to detect installed plugins
      // For now, return a default configuration
      logger.info("Detecting WordPress SEO plugins");

      return {
        yoast: {
          enabled: false, // Would be detected via API
          fields: {},
        },
        rankmath: {
          enabled: false, // Would be detected via API
          fields: {},
        },
        seopress: {
          enabled: false, // Would be detected via API
          fields: {},
        },
      };
    } catch (error) {
      logger.error(
        { error: redactSensitive(error) },
        "Failed to detect WordPress plugins",
      );
      return {
        yoast: { enabled: false, fields: {} },
        rankmath: { enabled: false, fields: {} },
        seopress: { enabled: false, fields: {} },
      };
    }
  }

  async autoFillPost(
    postId: number,
    formData: WordPressFormData,
    pluginConfig: WordPressPluginConfig,
  ): Promise<{ success: boolean; message: string; updatedFields: string[] }> {
    try {
      logger.info(
        { postId, title: redactSensitive(formData.title) },
        "Auto-filling WordPress post",
      );

      const updatedFields: string[] = [];
      const updateData: any = {};

      // Basic post data
      if (formData.title) {
        updateData.title = formData.title;
        updatedFields.push("title");
      }

      if (formData.content) {
        updateData.content = formData.content;
        updatedFields.push("content");
      }

      if (formData.excerpt) {
        updateData.excerpt = formData.excerpt;
        updatedFields.push("excerpt");
      }

      if (formData.slug) {
        updateData.slug = formData.slug;
        updatedFields.push("slug");
      }

      // Categories and tags
      if (formData.categories && formData.categories.length > 0) {
        updateData.categories = formData.categories;
        updatedFields.push("categories");
      }

      if (formData.tags && formData.tags.length > 0) {
        updateData.tags = formData.tags;
        updatedFields.push("tags");
      }

      // Featured image
      if (formData.featuredImage) {
        updateData.featured_media = formData.featuredImage;
        updatedFields.push("featured_image");
      }

      // Meta data
      if (formData.meta) {
        updateData.meta = await this.prepareMetaData(
          formData.meta,
          pluginConfig,
        );
        updatedFields.push("meta");
      }

      // Custom fields
      if (formData.customFields) {
        updateData.meta = {
          ...updateData.meta,
          ...formData.customFields,
        };
        updatedFields.push("custom_fields");
      }

      // Update the post
      const result = await this.connector.updatePost({
        id: postId,
        title: updateData.title || "",
        content: updateData.content || "",
        status: "draft",
        slug: updateData.slug,
        categories: updateData.categories,
        tags: updateData.tags,
        featured_media: updateData.featured_media,
        meta: updateData.meta,
      });

      logger.info(
        { postId, updatedFields },
        "WordPress post auto-filled successfully",
      );

      return {
        success: true,
        message: `Post updated with ${updatedFields.length} fields`,
        updatedFields,
      };
    } catch (error) {
      logger.error(
        { error: redactSensitive(error), postId },
        "Failed to auto-fill WordPress post",
      );
      return {
        success: false,
        message: `Failed to update post: ${error instanceof Error ? error.message : "Unknown error"}`,
        updatedFields: [],
      };
    }
  }

  private async prepareMetaData(
    meta: WordPressFormData["meta"],
    pluginConfig: WordPressPluginConfig,
  ): Promise<Record<string, any>> {
    const metaData: Record<string, any> = {};

    // Basic meta data
    if (meta.title) {
      metaData._yoast_wpseo_title = meta.title;
      metaData._rank_math_title = meta.title;
      metaData._seopress_titles_title = meta.title;
    }

    if (meta.description) {
      metaData._yoast_wpseo_metadesc = meta.description;
      metaData._rank_math_description = meta.description;
      metaData._seopress_titles_desc = meta.description;
    }

    if (meta.keywords && meta.keywords.length > 0) {
      const keywordsString = meta.keywords.join(", ");
      metaData._yoast_wpseo_focuskw = meta.keywords[0]; // Primary keyword
      metaData._rank_math_focus_keyword = meta.keywords[0];
      metaData._seopress_titles_target_kw = keywordsString;
    }

    // Social media meta
    if (meta.ogTitle) {
      metaData["_yoast_wpseo_opengraph-title"] = meta.ogTitle;
      metaData._rank_math_facebook_title = meta.ogTitle;
      metaData._seopress_social_fb_title = meta.ogTitle;
    }

    if (meta.ogDescription) {
      metaData["_yoast_wpseo_opengraph-description"] = meta.ogDescription;
      metaData._rank_math_facebook_description = meta.ogDescription;
      metaData._seopress_social_fb_desc = meta.ogDescription;
    }

    if (meta.ogImage) {
      metaData["_yoast_wpseo_opengraph-image"] = meta.ogImage;
      metaData._rank_math_facebook_image = meta.ogImage;
      metaData._seopress_social_fb_img = meta.ogImage;
    }

    // Twitter meta
    if (meta.twitterTitle) {
      metaData["_yoast_wpseo_twitter-title"] = meta.twitterTitle;
      metaData._rank_math_twitter_title = meta.twitterTitle;
    }

    if (meta.twitterDescription) {
      metaData["_yoast_wpseo_twitter-description"] = meta.twitterDescription;
      metaData._rank_math_twitter_description = meta.twitterDescription;
    }

    if (meta.twitterImage) {
      metaData["_yoast_wpseo_twitter-image"] = meta.twitterImage;
      metaData._rank_math_twitter_image = meta.twitterImage;
    }

    // Canonical URL
    if (meta.canonical) {
      metaData._yoast_wpseo_canonical = meta.canonical;
      metaData._rank_math_canonical_url = meta.canonical;
    }

    // Robots meta
    if (meta.robots) {
      metaData["_yoast_wpseo_meta-robots-noindex"] = meta.robots.includes(
        "noindex",
      )
        ? "1"
        : "0";
      metaData["_yoast_wpseo_meta-robots-nofollow"] = meta.robots.includes(
        "nofollow",
      )
        ? "1"
        : "0";
    }

    return metaData;
  }

  async generateOptimizedFormData(
    title: string,
    content: string,
    keywords: string[],
    siteUrl: string,
  ): Promise<WordPressFormData> {
    try {
      logger.info(
        { title: redactSensitive(title), keywords },
        "Generating optimized form data",
      );

      // Generate SEO-optimized title
      const seoTitle = this.generateSEOTitle(title, keywords[0]);

      // Generate meta description
      const metaDescription = this.generateMetaDescription(content, keywords);

      // Generate slug
      const slug = this.generateSlug(title);

      // Generate excerpt
      const excerpt = this.generateExcerpt(content);

      // Generate social media data
      const ogTitle = seoTitle;
      const ogDescription = metaDescription;
      const ogImage = `${siteUrl}/wp-content/uploads/default-og-image.jpg`; // Default image

      return {
        title,
        content,
        excerpt,
        slug,
        meta: {
          title: seoTitle,
          description: metaDescription,
          keywords,
          ogTitle,
          ogDescription,
          ogImage,
          twitterTitle: ogTitle,
          twitterDescription: ogDescription,
          twitterImage: ogImage,
        },
      };
    } catch (error) {
      logger.error(
        { error: redactSensitive(error) },
        "Failed to generate optimized form data",
      );
      throw error;
    }
  }

  private generateSEOTitle(title: string, primaryKeyword?: string): string {
    let seoTitle = title;

    // Add primary keyword if not present and title is short enough
    if (
      primaryKeyword &&
      !seoTitle.toLowerCase().includes(primaryKeyword.toLowerCase())
    ) {
      if (seoTitle.length + primaryKeyword.length + 3 <= 60) {
        seoTitle = `${seoTitle} - ${primaryKeyword}`;
      }
    }

    // Ensure title is not too long
    if (seoTitle.length > 60) {
      seoTitle = seoTitle.substring(0, 57) + "...";
    }

    return seoTitle;
  }

  private generateMetaDescription(content: string, keywords: string[]): string {
    // Extract first paragraph or create from content
    let description = content.replace(/<[^>]*>/g, "").substring(0, 160);

    // Add primary keyword if not present
    if (
      keywords.length > 0 &&
      !description.toLowerCase().includes(keywords[0].toLowerCase())
    ) {
      const keyword = keywords[0];
      if (description.length + keyword.length + 3 <= 160) {
        description = `${description} ${keyword}`;
      }
    }

    // Ensure description is within optimal length
    if (description.length < 120) {
      description =
        description +
        " Learn more about this topic and discover valuable insights.";
    }

    if (description.length > 160) {
      description = description.substring(0, 157) + "...";
    }

    return description;
  }

  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim();
  }

  private generateExcerpt(content: string): string {
    // Remove HTML tags and get first 150 characters
    const plainText = content.replace(/<[^>]*>/g, "");
    return plainText.substring(0, 150) + (plainText.length > 150 ? "..." : "");
  }

  async getWordPressCategories(): Promise<
    Array<{ id: number; name: string; slug: string }>
  > {
    try {
      // This would typically make API calls to get WordPress categories
      // For now, return empty array
      logger.info("Fetching WordPress categories");
      return [];
    } catch (error) {
      logger.error(
        { error: redactSensitive(error) },
        "Failed to fetch WordPress categories",
      );
      return [];
    }
  }

  async getWordPressTags(): Promise<
    Array<{ id: number; name: string; slug: string }>
  > {
    try {
      // This would typically make API calls to get WordPress tags
      // For now, return empty array
      logger.info("Fetching WordPress tags");
      return [];
    } catch (error) {
      logger.error(
        { error: redactSensitive(error) },
        "Failed to fetch WordPress tags",
      );
      return [];
    }
  }

  async suggestCategories(
    content: string,
    keywords: string[],
  ): Promise<Array<{ name: string; confidence: number }>> {
    try {
      // Simple category suggestion based on keywords and content
      const suggestions: Array<{ name: string; confidence: number }> = [];

      // Analyze content for category suggestions
      const contentLower = content.toLowerCase();

      // Common category patterns
      const categoryPatterns = {
        Technology: ["tech", "software", "app", "digital", "computer"],
        Business: ["business", "marketing", "sales", "strategy", "management"],
        Health: ["health", "fitness", "wellness", "medical", "nutrition"],
        Education: ["education", "learning", "tutorial", "guide", "how-to"],
        Lifestyle: ["lifestyle", "life", "personal", "daily", "routine"],
      };

      Object.entries(categoryPatterns).forEach(([category, patterns]) => {
        const matches = patterns.filter(
          (pattern) =>
            contentLower.includes(pattern) ||
            keywords.some((keyword) => keyword.toLowerCase().includes(pattern)),
        );

        if (matches.length > 0) {
          suggestions.push({
            name: category,
            confidence: matches.length / patterns.length,
          });
        }
      });

      return suggestions.sort((a, b) => b.confidence - a.confidence);
    } catch (error) {
      logger.error(
        { error: redactSensitive(error) },
        "Failed to suggest categories",
      );
      return [];
    }
  }
}
