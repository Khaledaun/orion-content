
import { prisma } from './prisma';
import { SubscriptionTier } from '@prisma/client';

export interface FeatureFlagConfig {
  isEnabled: boolean;
  requiredTier: SubscriptionTier;
  configuration: Record<string, any>;
}

export class FeatureFlagsService {
  private cache: Map<string, FeatureFlagConfig> = new Map();
  private cacheExpiry: Map<string, number> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  async isFeatureEnabled(
    key: string, 
    userTier: SubscriptionTier = SubscriptionTier.STARTER
  ): Promise<boolean> {
    const config = await this.getFeatureConfig(key);
    if (!config?.isEnabled) return false;
    
    return this.hasRequiredTier(userTier, config.requiredTier);
  }

  async getFeatureConfig(key: string): Promise<FeatureFlagConfig | null> {
    try {
      // Check cache first
      const cached = this.cache.get(key);
      const cacheTime = this.cacheExpiry.get(key) || 0;
      
      if (cached && Date.now() < cacheTime) {
        return cached;
      }

      // Fetch from database
      const flag = await prisma.featureFlag.findUnique({
        where: { key }
      });

      if (!flag) return null;

      const config: FeatureFlagConfig = {
        isEnabled: flag.isEnabled,
        requiredTier: flag.requiredTier,
        configuration: flag.configuration as Record<string, any>
      };

      // Update cache
      this.cache.set(key, config);
      this.cacheExpiry.set(key, Date.now() + this.CACHE_TTL);

      return config;
    } catch (error) {
      console.error(`Error fetching feature flag ${key}:`, error);
      return null;
    }
  }

  async getUserSubscription(userId: string) {
    try {
      return await prisma.userSubscription.findUnique({
        where: { userId },
        select: {
          tier: true,
          features: true,
          limits: true,
          isActive: true,
          expiresAt: true
        }
      });
    } catch (error) {
      console.error(`Error fetching user subscription:`, error);
      return null;
    }
  }

  private hasRequiredTier(userTier: SubscriptionTier, requiredTier: SubscriptionTier): boolean {
    const tierHierarchy: Record<SubscriptionTier, number> = {
      [SubscriptionTier.STARTER]: 1,
      [SubscriptionTier.PRO]: 2,
      [SubscriptionTier.GURU]: 3
    };

    return tierHierarchy[userTier] >= tierHierarchy[requiredTier];
  }

  async createFeatureFlag(data: {
    key: string;
    name: string;
    description?: string;
    isEnabled: boolean;
    requiredTier: SubscriptionTier;
    configuration?: Record<string, any>;
  }) {
    try {
      const flag = await prisma.featureFlag.create({
        data: {
          key: data.key,
          name: data.name,
          description: data.description,
          isEnabled: data.isEnabled,
          requiredTier: data.requiredTier,
          configuration: data.configuration || {}
        }
      });

      // Invalidate cache
      this.cache.delete(data.key);
      this.cacheExpiry.delete(data.key);

      return flag;
    } catch (error) {
      console.error('Error creating feature flag:', error);
      throw error;
    }
  }

  async updateFeatureFlag(key: string, updates: Partial<{
    isEnabled: boolean;
    requiredTier: SubscriptionTier;
    configuration: Record<string, any>;
  }>) {
    try {
      const flag = await prisma.featureFlag.update({
        where: { key },
        data: updates
      });

      // Invalidate cache
      this.cache.delete(key);
      this.cacheExpiry.delete(key);

      return flag;
    } catch (error) {
      console.error('Error updating feature flag:', error);
      throw error;
    }
  }

  // Clear all cache - useful for testing
  clearCache() {
    this.cache.clear();
    this.cacheExpiry.clear();
  }
}

export const featureFlags = new FeatureFlagsService();

// Feature flag keys constants
export const FEATURE_FLAGS = {
  // Analytics & SEO
  GA4_INTEGRATION: 'ga4-integration',
  GSC_INTEGRATION: 'gsc-integration',
  SEO_AUDIT: 'seo-audit',
  COMPETITIVE_ANALYSIS: 'competitive-analysis',
  
  // AI & Content
  AI_PROMPT_ENGINEER: 'ai-prompt-engineer',
  CONTENT_STRATEGY: 'content-strategy',
  TOPIC_GENERATION: 'topic-generation',
  
  // Article Editor
  ARTICLE_EDITOR: 'article-editor',
  BRAND_PREVIEW: 'brand-preview',
  SEO_ANALYSIS: 'seo-analysis',
  SOCIAL_EMBEDS: 'social-embeds',
  
  // Pro Features
  INTERNAL_LINKING: 'internal-linking',
  BATCH_OPERATIONS: 'batch-operations',
  COLLABORATION: 'collaboration',
  
  // Guru Features
  MONETIZATION: 'monetization',
  BACKLINK_OPPORTUNITIES: 'backlink-opportunities',
  AUTOMATION_CONTROLS: 'automation-controls',
  
  // Integrations
  AFFILIATE_AMAZON: 'affiliate-amazon',
  AFFILIATE_CJ: 'affiliate-cj',
  AFFILIATE_SHAREASALE: 'affiliate-shareasale',
} as const;

// Default feature flags for seeding
export const DEFAULT_FEATURE_FLAGS = [
  // Starter tier features
  {
    key: FEATURE_FLAGS.ARTICLE_EDITOR,
    name: 'Article Editor',
    description: 'Block-based article editor with basic functionality',
    isEnabled: true,
    requiredTier: SubscriptionTier.STARTER,
    configuration: {
      maxDrafts: 10,
      autosave: true
    }
  },
  {
    key: FEATURE_FLAGS.SEO_ANALYSIS,
    name: 'Basic SEO Analysis',
    description: 'Basic SEO scoring and suggestions',
    isEnabled: true,
    requiredTier: SubscriptionTier.STARTER,
    configuration: {
      checks: ['title', 'meta-description', 'headings']
    }
  },
  {
    key: FEATURE_FLAGS.CONTENT_STRATEGY,
    name: 'Content Strategy',
    description: 'Content planning and strategy tools',
    isEnabled: true,
    requiredTier: SubscriptionTier.STARTER,
    configuration: {
      maxTopics: 5
    }
  },
  
  // Pro tier features
  {
    key: FEATURE_FLAGS.GA4_INTEGRATION,
    name: 'Google Analytics 4 Integration',
    description: 'Connect and sync GA4 data',
    isEnabled: true,
    requiredTier: SubscriptionTier.PRO,
    configuration: {
      syncFrequency: 'daily',
      historicalData: true
    }
  },
  {
    key: FEATURE_FLAGS.GSC_INTEGRATION,
    name: 'Google Search Console Integration',
    description: 'Connect and sync GSC data',
    isEnabled: true,
    requiredTier: SubscriptionTier.PRO,
    configuration: {
      syncFrequency: 'daily',
      historicalData: true
    }
  },
  {
    key: FEATURE_FLAGS.SOCIAL_EMBEDS,
    name: 'Social Media Embeds',
    description: 'Embed content from social platforms',
    isEnabled: true,
    requiredTier: SubscriptionTier.PRO,
    configuration: {
      platforms: ['instagram', 'tiktok', 'youtube', 'twitter'],
      caching: true
    }
  },
  {
    key: FEATURE_FLAGS.INTERNAL_LINKING,
    name: 'Smart Internal Linking',
    description: 'AI-powered internal link suggestions',
    isEnabled: true,
    requiredTier: SubscriptionTier.PRO,
    configuration: {
      maxSuggestions: 10,
      autoApply: false
    }
  },
  {
    key: FEATURE_FLAGS.AI_PROMPT_ENGINEER,
    name: 'AI Prompt Engineer',
    description: 'Custom AI prompts and testing',
    isEnabled: true,
    requiredTier: SubscriptionTier.PRO,
    configuration: {
      maxPrompts: 50,
      abTesting: true
    }
  },
  
  // Guru tier features
  {
    key: FEATURE_FLAGS.MONETIZATION,
    name: 'Monetization Tools',
    description: 'Affiliate marketing and monetization features',
    isEnabled: true,
    requiredTier: SubscriptionTier.GURU,
    configuration: {
      networks: ['amazon', 'cj', 'shareasale'],
      tracking: true
    }
  },
  {
    key: FEATURE_FLAGS.BACKLINK_OPPORTUNITIES,
    name: 'Backlink Opportunities',
    description: 'Find and manage backlink opportunities',
    isEnabled: true,
    requiredTier: SubscriptionTier.GURU,
    configuration: {
      sources: ['ahrefs', 'semrush'],
      automation: true
    }
  },
  {
    key: FEATURE_FLAGS.AUTOMATION_CONTROLS,
    name: 'Automation Controls',
    description: 'Advanced automation and workflow controls',
    isEnabled: true,
    requiredTier: SubscriptionTier.GURU,
    configuration: {
      autopilot: true,
      qualityGates: true
    }
  },
  {
    key: FEATURE_FLAGS.SEO_AUDIT,
    name: 'Full SEO Audit',
    description: 'Comprehensive SEO auditing and analysis',
    isEnabled: true,
    requiredTier: SubscriptionTier.GURU,
    configuration: {
      fullSite: true,
      competitor: true,
      automation: true
    }
  }
];
