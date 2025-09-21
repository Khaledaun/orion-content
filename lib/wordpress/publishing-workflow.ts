/**
 * WordPress Publishing Workflow
 * Integrates WordPress publishing with Orion's content pipeline and rulebook QA
 */

import { prisma } from "../prisma";
import { WordPressIntegrationManager } from "./integration-manager";
import { QAValidator } from "../qa-validator";
import { logger } from "../logger";
import { redactSensitive } from "../redact";
import { ProductionObservabilityTracker } from "../observability-prod";

export interface WordPressPublishingOptions {
  siteId: string;
  draftId: string;
  userId: string;
  publishImmediately?: boolean;
  skipRulebookCheck?: boolean;
}

export interface WordPressPublishingResult {
  success: boolean;
  postId?: number;
  postUrl?: string;
  previewUrl?: string;
  error?: string;
  rulebookPassed?: boolean;
  qualityScore?: number;
  violations?: any[];
}

export class WordPressPublishingWorkflow {
  private wpManager: WordPressIntegrationManager;
  private qaValidator: QAValidator;

  constructor() {
    this.wpManager = new WordPressIntegrationManager();
    this.qaValidator = new QAValidator();
  }

  /**
   * Main workflow: Stream draft to WordPress and optionally publish
   */
  async executeWorkflow(options: WordPressPublishingOptions): Promise<WordPressPublishingResult> {
    const { siteId, draftId, userId, publishImmediately = false, skipRulebookCheck = false } = options;
    
    const observability = new ProductionObservabilityTracker(
      `wp-publish-${draftId}`,
      siteId,
      `WordPress Publishing: ${draftId}`
    );

    try {
      // Stage 1: Get draft and validate
      const draftStage = observability.startStage("get_draft");
      const draft = await this.getDraftWithValidation(draftId, siteId);
      draftStage.complete("internal", 0, 0, 0, true);

      // Stage 2: Check WordPress integration
      const integrationStage = observability.startStage("check_integration");
      const integration = await this.wpManager.getWordPressIntegration(siteId);
      if (!integration) {
        throw new Error("No WordPress integration found for this site");
      }
      if (!integration.verified) {
        throw new Error("WordPress integration is not verified");
      }
      integrationStage.complete("internal", 0, 0, 0, true);

      // Stage 3: Rulebook QA check (unless skipped)
      let rulebookResult = { passed: true, score: 100, violations: [] };
      if (!skipRulebookCheck) {
        const qaStage = observability.startStage("rulebook_qa");
        rulebookResult = await this.performRulebookCheck(draft);
        qaStage.complete("internal", 0, 0, 0, rulebookResult.passed);
      }

      // Stage 4: Stream draft to WordPress
      const streamStage = observability.startStage("stream_to_wordpress");
      const streamResult = await this.wpManager.streamDraftToWordPress(siteId, {
        title: draft.title,
        content: draft.content,
        excerpt: draft.excerpt || undefined,
        slug: draft.slug || undefined,
        categories: draft.categories || [],
        tags: draft.tags || [],
        featuredImage: draft.featuredImage ? {
          url: draft.featuredImage.url,
          altText: draft.featuredImage.altText,
        } : undefined,
        meta: {
          ...draft.meta,
          orion_draft_id: draftId,
          orion_quality_score: rulebookResult.score,
          orion_rulebook_passed: rulebookResult.passed,
          orion_published_by: userId,
          orion_published_at: new Date().toISOString(),
        },
      });
      streamStage.complete("internal", 0, 0, 0, streamResult.success);

      if (!streamResult.success) {
        throw new Error(`Failed to stream draft to WordPress: ${streamResult.error}`);
      }

      // Stage 5: Update draft with WordPress post ID
      const updateStage = observability.startStage("update_draft");
      await this.updateDraftWithWordPressInfo(draftId, streamResult.postId!, streamResult.postUrl!);
      updateStage.complete("internal", 0, 0, 0, true);

      // Stage 6: Publish if requested and rulebook passed
      let publishResult = { success: true, postUrl: streamResult.postUrl };
      if (publishImmediately && rulebookResult.passed) {
        const publishStage = observability.startStage("publish_wordpress");
        publishResult = await this.wpManager.publishWordPressPost(siteId, streamResult.postId!);
        publishStage.complete("internal", 0, 0, 0, publishResult.success);

        if (!publishResult.success) {
          // Log the error but don't fail the entire workflow
          logger.warn(
            {
              draftId,
              siteId,
              postId: streamResult.postId,
              error: redactSensitive(publishResult.error),
            },
            "Failed to publish WordPress post, but draft was created successfully"
          );
        }
      }

      // Finalize observability
      await observability.finalize(rulebookResult.score, {
        wordpress_post_id: streamResult.postId,
        wordpress_post_url: publishResult.postUrl,
        rulebook_passed: rulebookResult.passed,
        published_immediately: publishImmediately,
      });

      logger.info(
        {
          draftId,
          siteId,
          postId: streamResult.postId,
          qualityScore: rulebookResult.score,
          rulebookPassed: rulebookResult.passed,
          publishedImmediately: publishImmediately,
        },
        "WordPress publishing workflow completed successfully"
      );

      return {
        success: true,
        postId: streamResult.postId,
        postUrl: publishResult.postUrl,
        previewUrl: streamResult.previewUrl,
        rulebookPassed: rulebookResult.passed,
        qualityScore: rulebookResult.score,
        violations: rulebookResult.violations,
      };

    } catch (error) {
      logger.error(
        {
          error: redactSensitive(error),
          draftId,
          siteId,
          userId,
        },
        "WordPress publishing workflow failed"
      );

      await observability.finalize(0, {
        error: error instanceof Error ? error.message : "Unknown error",
        workflow_failed: true,
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        rulebookPassed: false,
        qualityScore: 0,
      };
    }
  }

  /**
   * Get draft with validation
   */
  private async getDraftWithValidation(draftId: string, siteId: string) {
    const draft = await prisma.draft.findFirst({
      where: {
        id: draftId,
        siteId: siteId,
      },
      include: {
        site: true,
      },
    });

    if (!draft) {
      throw new Error("Draft not found");
    }

    if (draft.status !== "APPROVED") {
      throw new Error(`Draft is not approved for publishing. Current status: ${draft.status}`);
    }

    return draft;
  }

  /**
   * Perform rulebook QA check
   */
  private async performRulebookCheck(draft: any): Promise<{
    passed: boolean;
    score: number;
    violations: any[];
  }> {
    try {
      const qaReport = await this.qaValidator.validate({
        title: draft.title,
        content: draft.content,
        excerpt: draft.excerpt,
        meta: draft.meta,
        images: draft.images || [],
      });

      return {
        passed: qaReport.status !== "FAILED",
        score: qaReport.score,
        violations: qaReport.violations,
      };
    } catch (error) {
      logger.error(
        {
          error: redactSensitive(error),
          draftId: draft.id,
        },
        "Rulebook QA check failed"
      );

      return {
        passed: false,
        score: 0,
        violations: [{
          rule: "rulebook_error",
          severity: "error",
          message: "Rulebook QA check failed",
          suggestions: ["Contact system administrator"],
        }],
      };
    }
  }

  /**
   * Update draft with WordPress post information
   */
  private async updateDraftWithWordPressInfo(draftId: string, postId: number, postUrl: string) {
    await prisma.draft.update({
      where: { id: draftId },
      data: {
        externalId: postId.toString(),
        meta: {
          // Preserve existing meta and add WordPress info
          ...(await prisma.draft.findUnique({ where: { id: draftId } }))?.meta as any || {},
          wordpress_post_id: postId,
          wordpress_post_url: postUrl,
          wordpress_updated_at: new Date().toISOString(),
        },
      },
    });
  }

  /**
   * Publish a WordPress post (separate from workflow)
   */
  async publishWordPressPost(siteId: string, draftId: string, userId: string): Promise<WordPressPublishingResult> {
    try {
      const draft = await this.getDraftWithValidation(draftId, siteId);
      
      if (!draft.externalId) {
        throw new Error("Draft has not been streamed to WordPress yet");
      }

      const postId = parseInt(draft.externalId);
      const publishResult = await this.wpManager.publishWordPressPost(siteId, postId);

      if (publishResult.success) {
        // Update draft status to published
        await prisma.draft.update({
          where: { id: draftId },
          data: {
            status: "PUBLISHED",
            meta: {
              ...(draft.meta as any || {}),
              wordpress_published_at: new Date().toISOString(),
              wordpress_published_by: userId,
            },
          },
        });

        logger.info(
          {
            draftId,
            siteId,
            postId,
            userId,
          },
          "WordPress post published successfully"
        );
      }

      return {
        success: publishResult.success,
        postId: publishResult.postId,
        postUrl: publishResult.postUrl,
        error: publishResult.error,
      };

    } catch (error) {
      logger.error(
        {
          error: redactSensitive(error),
          draftId,
          siteId,
          userId,
        },
        "Failed to publish WordPress post"
      );

      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Get WordPress post status for a draft
   */
  async getWordPressPostStatus(siteId: string, draftId: string): Promise<{
    connected: boolean;
    postId?: number;
    postUrl?: string;
    status?: string;
    lastUpdated?: Date;
  }> {
    try {
      const draft = await prisma.draft.findFirst({
        where: {
          id: draftId,
          siteId: siteId,
        },
      });

      if (!draft || !draft.externalId) {
        return { connected: false };
      }

      const postId = parseInt(draft.externalId);
      const post = await this.wpManager.getWordPressPost(siteId, postId);

      if (!post) {
        return { connected: false };
      }

      return {
        connected: true,
        postId: post.id,
        postUrl: post.link,
        status: post.status,
        lastUpdated: new Date(post.date),
      };

    } catch (error) {
      logger.error(
        {
          error: redactSensitive(error),
          draftId,
          siteId,
        },
        "Failed to get WordPress post status"
      );

      return { connected: false };
    }
  }
}
