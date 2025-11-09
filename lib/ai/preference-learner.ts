/**
 * AI Preference Learning System
 * Machine learning system that learns from user edits and preferences
 */

import { logger } from "@/lib/logger";
import { redactSensitive } from "@/lib/redact";

export interface ContentPreference {
  userId: string;
  siteId: string;
  contentType: "blog" | "product" | "landing" | "news" | "tutorial";
  preferences: {
    tone:
      | "professional"
      | "casual"
      | "technical"
      | "conversational"
      | "authoritative";
    length: "short" | "medium" | "long";
    structure: "list" | "narrative" | "how-to" | "comparison" | "review";
    keywords: {
      primary: string[];
      secondary: string[];
      avoid: string[];
    };
    style: {
      useSubheadings: boolean;
      useBulletPoints: boolean;
      useImages: boolean;
      useCallToAction: boolean;
      paragraphLength: "short" | "medium" | "long";
    };
    seo: {
      keywordDensity: number; // 0-1
      internalLinks: number; // 0-10
      externalLinks: number; // 0-5
      metaDescriptionLength: number; // 120-160
      titleLength: number; // 30-60
    };
  };
  confidence: number; // 0-1
  lastUpdated: Date;
  sampleCount: number;
}

export interface ContentComparison {
  original: string;
  edited: string;
  changes: {
    type: "addition" | "deletion" | "modification" | "replacement";
    original: string;
    modified: string;
    position: number;
  }[];
  userRating?: number; // 1-5
  feedback?: string;
}

export interface LearningInsight {
  pattern: string;
  confidence: number;
  frequency: number;
  examples: string[];
  recommendation: string;
}

export class AIPreferenceLearner {
  private readonly minSamplesForLearning = 5;
  private readonly maxHistoryDays = 90;

  async learnFromComparison(
    userId: string,
    siteId: string,
    comparison: ContentComparison,
    contentType: string,
  ): Promise<ContentPreference | null> {
    try {
      logger.info(
        { userId, siteId, contentType: redactSensitive(contentType) },
        "Learning from content comparison",
      );

      // Analyze the changes to extract patterns
      const patterns = this.analyzeChanges(comparison);

      // Get existing preferences
      const existingPreference = await this.getUserPreferences(userId, siteId);

      // Update preferences based on patterns
      const updatedPreference = this.updatePreferences(
        existingPreference,
        patterns,
        contentType as any,
        comparison.userRating,
      );

      // Save updated preferences
      await this.saveUserPreferences(updatedPreference);

      return updatedPreference;
    } catch (error) {
      logger.error(
        { error: redactSensitive(error), userId, siteId },
        "Failed to learn from content comparison",
      );
      return null;
    }
  }

  async generatePersonalizedContent(
    userId: string,
    siteId: string,
    baseContent: string,
    contentType: string,
    keywords: string[],
  ): Promise<{
    optimizedContent: string;
    confidence: number;
    insights: LearningInsight[];
  }> {
    try {
      logger.info(
        { userId, siteId, contentType: redactSensitive(contentType) },
        "Generating personalized content",
      );

      const preferences = await this.getUserPreferences(userId, siteId);

      if (!preferences || preferences.confidence < 0.3) {
        // Not enough data for personalization
        return {
          optimizedContent: baseContent,
          confidence: 0,
          insights: [],
        };
      }

      // Apply learned preferences to content
      const optimizedContent = this.applyPreferences(
        baseContent,
        preferences,
        keywords,
      );

      // Generate insights about the optimization
      const insights = this.generateInsights(
        preferences,
        baseContent,
        optimizedContent,
      );

      return {
        optimizedContent,
        confidence: preferences.confidence,
        insights,
      };
    } catch (error) {
      logger.error(
        { error: redactSensitive(error), userId, siteId },
        "Failed to generate personalized content",
      );
      return {
        optimizedContent: baseContent,
        confidence: 0,
        insights: [],
      };
    }
  }

  async getLearningInsights(
    userId: string,
    siteId: string,
  ): Promise<LearningInsight[]> {
    try {
      const preferences = await this.getUserPreferences(userId, siteId);

      if (!preferences) {
        return [];
      }

      return this.generateInsights(preferences, "", "");
    } catch (error) {
      logger.error(
        { error: redactSensitive(error), userId, siteId },
        "Failed to get learning insights",
      );
      return [];
    }
  }

  private analyzeChanges(comparison: ContentComparison): {
    toneChanges: string[];
    structureChanges: string[];
    keywordChanges: string[];
    styleChanges: string[];
  } {
    const patterns: {
      toneChanges: string[];
      structureChanges: string[];
      keywordChanges: string[];
      styleChanges: string[];
    } = {
      toneChanges: [],
      structureChanges: [],
      keywordChanges: [],
      styleChanges: [],
    };

    comparison.changes.forEach((change) => {
      // Analyze tone changes
      if (this.isToneChange(change.original, change.modified)) {
        patterns.toneChanges.push(change.modified);
      }

      // Analyze structure changes
      if (this.isStructureChange(change.original, change.modified)) {
        patterns.structureChanges.push(change.modified);
      }

      // Analyze keyword changes
      if (this.isKeywordChange(change.original, change.modified)) {
        patterns.keywordChanges.push(change.modified);
      }

      // Analyze style changes
      if (this.isStyleChange(change.original, change.modified)) {
        patterns.styleChanges.push(change.modified);
      }
    });

    return patterns;
  }

  private isToneChange(original: string, modified: string): boolean {
    // Simple tone detection based on word patterns
    const professionalWords = [
      "utilize",
      "implement",
      "facilitate",
      "optimize",
    ];
    const casualWords = ["use", "make", "help", "improve"];
    const technicalWords = [
      "algorithm",
      "implementation",
      "optimization",
      "configuration",
    ];

    const originalWords = original.toLowerCase().split(" ");
    const modifiedWords = modified.toLowerCase().split(" ");

    const originalTone = this.detectTone(originalWords);
    const modifiedTone = this.detectTone(modifiedWords);

    return originalTone !== modifiedTone;
  }

  private isStructureChange(original: string, modified: string): boolean {
    // Detect structural changes (headings, lists, paragraphs)
    const originalHasHeadings = /^#{1,6}\s/.test(original);
    const modifiedHasHeadings = /^#{1,6}\s/.test(modified);

    const originalHasList = /^[\*\-\+]\s/.test(original);
    const modifiedHasList = /^[\*\-\+]\s/.test(modified);

    return (
      originalHasHeadings !== modifiedHasHeadings ||
      originalHasList !== modifiedHasList
    );
  }

  private isKeywordChange(original: string, modified: string): boolean {
    // Detect keyword density or placement changes
    const originalWords = original.toLowerCase().split(/\s+/);
    const modifiedWords = modified.toLowerCase().split(/\s+/);

    // Simple keyword change detection
    return Math.abs(originalWords.length - modifiedWords.length) > 10;
  }

  private isStyleChange(original: string, modified: string): boolean {
    // Detect style changes (punctuation, formatting)
    const originalPunctuation = (original.match(/[.!?]/g) || []).length;
    const modifiedPunctuation = (modified.match(/[.!?]/g) || []).length;

    const originalLength = original.length;
    const modifiedLength = modified.length;

    return (
      Math.abs(originalPunctuation - modifiedPunctuation) > 2 ||
      Math.abs(originalLength - modifiedLength) > 50
    );
  }

  private detectTone(
    words: string[],
  ): "professional" | "casual" | "technical" | "conversational" {
    const professionalCount = words.filter((w) =>
      ["utilize", "implement", "facilitate", "optimize", "leverage"].includes(
        w,
      ),
    ).length;

    const casualCount = words.filter((w) =>
      ["use", "make", "help", "improve", "get", "go"].includes(w),
    ).length;

    const technicalCount = words.filter((w) =>
      [
        "algorithm",
        "implementation",
        "optimization",
        "configuration",
        "architecture",
      ].includes(w),
    ).length;

    if (technicalCount > professionalCount && technicalCount > casualCount) {
      return "technical";
    } else if (professionalCount > casualCount) {
      return "professional";
    } else if (casualCount > 0) {
      return "casual";
    }

    return "conversational";
  }

  private updatePreferences(
    existing: ContentPreference | null,
    patterns: any,
    contentType: string,
    userRating?: number,
  ): ContentPreference {
    const basePreference: ContentPreference = existing || {
      userId: "",
      siteId: "",
      contentType: contentType as any,
      preferences: {
        tone: "professional",
        length: "medium",
        structure: "narrative",
        keywords: { primary: [], secondary: [], avoid: [] },
        style: {
          useSubheadings: true,
          useBulletPoints: true,
          useImages: true,
          useCallToAction: true,
          paragraphLength: "medium",
        },
        seo: {
          keywordDensity: 0.02,
          internalLinks: 3,
          externalLinks: 2,
          metaDescriptionLength: 140,
          titleLength: 50,
        },
      },
      confidence: 0,
      lastUpdated: new Date(),
      sampleCount: 0,
    };

    // Update based on patterns
    if (patterns.toneChanges.length > 0) {
      const mostCommonTone = this.getMostCommonTone(patterns.toneChanges);
      basePreference.preferences.tone = mostCommonTone;
    }

    if (patterns.structureChanges.length > 0) {
      const mostCommonStructure = this.getMostCommonStructure(
        patterns.structureChanges,
      );
      basePreference.preferences.structure = mostCommonStructure;
    }

    // Update confidence based on sample count and user rating
    basePreference.sampleCount += 1;
    basePreference.confidence = Math.min(1, basePreference.sampleCount / 20);

    if (userRating) {
      // Boost confidence for high ratings
      const ratingBoost = (userRating - 3) * 0.1;
      basePreference.confidence = Math.min(
        1,
        basePreference.confidence + ratingBoost,
      );
    }

    basePreference.lastUpdated = new Date();

    return basePreference;
  }

  private getMostCommonTone(
    toneChanges: string[],
  ): "professional" | "casual" | "technical" | "conversational" {
    const toneCounts = {
      professional: 0,
      casual: 0,
      technical: 0,
      conversational: 0,
    };

    toneChanges.forEach((change) => {
      const tone = this.detectTone(change.toLowerCase().split(" "));
      toneCounts[tone]++;
    });

    return Object.entries(toneCounts).reduce((a, b) =>
      toneCounts[a[0] as keyof typeof toneCounts] >
      toneCounts[b[0] as keyof typeof toneCounts]
        ? a
        : b,
    )[0] as any;
  }

  private getMostCommonStructure(
    structureChanges: string[],
  ): "list" | "narrative" | "how-to" | "comparison" | "review" {
    // Simple structure detection
    const hasHeadings = structureChanges.filter((change) =>
      /^#{1,6}\s/.test(change),
    ).length;
    const hasList = structureChanges.filter((change) =>
      /^[\*\-\+]\s/.test(change),
    ).length;

    if (hasList > hasHeadings) return "list";
    if (hasHeadings > 0) return "how-to";
    return "narrative";
  }

  private applyPreferences(
    content: string,
    preferences: ContentPreference,
    keywords: string[],
  ): string {
    let optimizedContent = content;

    // Apply tone preferences
    optimizedContent = this.applyTone(
      optimizedContent,
      preferences.preferences.tone,
    );

    // Apply structure preferences
    optimizedContent = this.applyStructure(
      optimizedContent,
      preferences.preferences.structure,
    );

    // Apply style preferences
    optimizedContent = this.applyStyle(
      optimizedContent,
      preferences.preferences.style,
    );

    // Apply SEO preferences
    optimizedContent = this.applySEO(
      optimizedContent,
      preferences.preferences.seo,
      keywords,
    );

    return optimizedContent;
  }

  private applyTone(content: string, tone: string): string {
    // Simple tone application (in production, this would be more sophisticated)
    switch (tone) {
      case "professional":
        return content
          .replace(/\buse\b/g, "utilize")
          .replace(/\bmake\b/g, "implement")
          .replace(/\bhelp\b/g, "facilitate");
      case "casual":
        return content
          .replace(/\butilize\b/g, "use")
          .replace(/\bimplement\b/g, "make")
          .replace(/\bfacilitate\b/g, "help");
      default:
        return content;
    }
  }

  private applyStructure(content: string, structure: string): string {
    // Apply structure preferences
    switch (structure) {
      case "list":
        // Convert paragraphs to bullet points where appropriate
        return content.replace(/^(.+)$/gm, (match) => {
          if (match.length < 100 && !match.startsWith("#")) {
            return `• ${match}`;
          }
          return match;
        });
      case "how-to":
        // Add numbered steps where appropriate
        return content.replace(/^(.+)$/gm, (match, index) => {
          if (
            match.toLowerCase().includes("step") ||
            match.toLowerCase().includes("first")
          ) {
            return `${index + 1}. ${match}`;
          }
          return match;
        });
      default:
        return content;
    }
  }

  private applyStyle(content: string, style: any): string {
    let optimizedContent = content;

    // Apply paragraph length preferences
    if (style.paragraphLength === "short") {
      optimizedContent = this.shortenParagraphs(optimizedContent);
    } else if (style.paragraphLength === "long") {
      optimizedContent = this.lengthenParagraphs(optimizedContent);
    }

    // Add subheadings if preferred
    if (style.useSubheadings) {
      optimizedContent = this.addSubheadings(optimizedContent);
    }

    return optimizedContent;
  }

  private applySEO(content: string, seo: any, keywords: string[]): string {
    let optimizedContent = content;

    // Apply keyword density
    if (keywords.length > 0) {
      optimizedContent = this.optimizeKeywordDensity(
        optimizedContent,
        keywords[0],
        seo.keywordDensity,
      );
    }

    // Add internal links if needed
    if (seo.internalLinks > 0) {
      optimizedContent = this.addInternalLinks(
        optimizedContent,
        seo.internalLinks,
      );
    }

    return optimizedContent;
  }

  private shortenParagraphs(content: string): string {
    return content.replace(/([^.!?]+[.!?])\s+/g, "$1\n\n");
  }

  private lengthenParagraphs(content: string): string {
    return content.replace(/\n\n/g, " ");
  }

  private addSubheadings(content: string): string {
    // Add subheadings every few paragraphs
    const paragraphs = content.split("\n\n");
    const result = [];

    for (let i = 0; i < paragraphs.length; i++) {
      result.push(paragraphs[i]);
      if (i > 0 && i % 3 === 0 && paragraphs[i].length > 100) {
        result.push("## Key Point");
      }
    }

    return result.join("\n\n");
  }

  private optimizeKeywordDensity(
    content: string,
    keyword: string,
    targetDensity: number,
  ): string {
    const words = content.split(/\s+/);
    const currentDensity =
      (content.toLowerCase().split(keyword.toLowerCase()).length - 1) /
      words.length;

    if (currentDensity < targetDensity) {
      // Add keyword naturally
      const insertPosition = Math.floor(words.length * 0.3);
      words.splice(insertPosition, 0, keyword);
    }

    return words.join(" ");
  }

  private addInternalLinks(content: string, linkCount: number): string {
    // Simple internal link addition (in production, this would be more sophisticated)
    const words = content.split(/\s+/);
    const linkWords = ["learn", "more", "about", "read", "see"];

    for (let i = 0; i < linkCount && i < linkWords.length; i++) {
      const wordIndex = words.findIndex(
        (w) => w.toLowerCase() === linkWords[i],
      );
      if (wordIndex !== -1) {
        words[wordIndex] = `[${words[wordIndex]}](/internal-link)`;
      }
    }

    return words.join(" ");
  }

  private generateInsights(
    preferences: ContentPreference,
    originalContent: string,
    optimizedContent: string,
  ): LearningInsight[] {
    const insights: LearningInsight[] = [];

    // Tone insight
    insights.push({
      pattern: `User prefers ${preferences.preferences.tone} tone`,
      confidence: preferences.confidence,
      frequency: preferences.sampleCount,
      examples: [
        `Content optimized for ${preferences.preferences.tone} writing style`,
      ],
      recommendation: `Continue using ${preferences.preferences.tone} tone for better engagement`,
    });

    // Structure insight
    insights.push({
      pattern: `User prefers ${preferences.preferences.structure} content structure`,
      confidence: preferences.confidence,
      frequency: preferences.sampleCount,
      examples: [`Content structured as ${preferences.preferences.structure}`],
      recommendation: `Use ${preferences.preferences.structure} format for similar content`,
    });

    // Style insight
    if (preferences.preferences.style.useSubheadings) {
      insights.push({
        pattern: "User prefers content with subheadings",
        confidence: preferences.confidence,
        frequency: preferences.sampleCount,
        examples: ["Added subheadings for better readability"],
        recommendation:
          "Include subheadings in all content for better structure",
      });
    }

    return insights;
  }

  private async getUserPreferences(
    userId: string,
    siteId: string,
  ): Promise<ContentPreference | null> {
    // This would typically query the database
    // For now, return null to indicate no existing preferences
    return null;
  }

  private async saveUserPreferences(
    preferences: ContentPreference,
  ): Promise<void> {
    // This would typically save to the database
    logger.info(
      { userId: preferences.userId, siteId: preferences.siteId },
      "Saving user preferences",
    );
  }
}
