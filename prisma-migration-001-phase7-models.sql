
-- Phase 7: Quality Assurance Framework - Prisma Migration

-- SiteStrategy model
CREATE TABLE "site_strategies" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "strategy" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "site_strategies_pkey" PRIMARY KEY ("id")
);

-- GlobalRulebook model
CREATE TABLE "global_rulebooks" (
    "id" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "rules" JSONB NOT NULL,
    "sources" JSONB NOT NULL,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "global_rulebooks_pkey" PRIMARY KEY ("id")
);

-- RulebookVersion model
CREATE TABLE "rulebook_versions" (
    "id" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "rules" JSONB NOT NULL,
    "sources" JSONB NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rulebook_versions_pkey" PRIMARY KEY ("id")
);

-- Create unique indexes
CREATE UNIQUE INDEX "site_strategies_siteId_key" ON "site_strategies"("siteId");

-- Create foreign key constraints
ALTER TABLE "site_strategies" ADD CONSTRAINT "site_strategies_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Insert default Global Rulebook
INSERT INTO "global_rulebooks" ("id", "version", "rules", "sources", "updatedBy", "createdAt", "updatedAt") VALUES
('cldefault001', 1, '{
  "eeat": {
    "require_author_bio": true,
    "require_citations": true,
    "allowed_source_domains": ["*.gov", "*.edu"],
    "citation_style": "harvard",
    "tone_constraints": ["helpful", "expert", "evidence-based"]
  },
  "seo": {
    "title_length": {"min": 45, "max": 65},
    "meta_description": {"min": 150, "max": 160},
    "h1_rules": {"must_include_primary_keyword": true},
    "internal_links_min": 3,
    "outbound_links_min": 2,
    "image_alt_required": true,
    "slug_style": "kebab-case"
  },
  "aio": {
    "summary_block_required": true,
    "qa_block_required": true,
    "structured_data": ["Article"],
    "answers_should_be_self_contained": true,
    "content_layout": ["intro", "key_points", "how_to", "faqs", "summary"]
  },
  "ai_search_visibility": {
    "clear_headings": true,
    "explicit_facts_with_sources": true,
    "avoid_fluff": true,
    "scannability_score_min": 80
  },
  "prohibited": {
    "claims_without_source": true,
    "fabricated_stats": true,
    "over-optimization_patterns": ["keyword stuffing"]
  },
  "score_weights": {
    "eeat": 0.35,
    "seo": 0.30,
    "aio": 0.20,
    "ai_search_visibility": 0.15
  },
  "enforcement": {
    "default_min_quality_score": 80,
    "block_publish_if_below": false,
    "tag_if_below": "review-needed"
  }
}', '["https://developers.google.com/search/docs/fundamentals/creating-helpful-content", "https://blog.google/products/search/our-latest-investments-information-quality-search/"]', 'system', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Insert version record
INSERT INTO "rulebook_versions" ("id", "version", "rules", "sources", "notes", "createdAt") VALUES
('clversion001', 1, '{
  "eeat": {
    "require_author_bio": true,
    "require_citations": true,
    "allowed_source_domains": ["*.gov", "*.edu"],
    "citation_style": "harvard",
    "tone_constraints": ["helpful", "expert", "evidence-based"]
  },
  "seo": {
    "title_length": {"min": 45, "max": 65},
    "meta_description": {"min": 150, "max": 160},
    "h1_rules": {"must_include_primary_keyword": true},
    "internal_links_min": 3,
    "outbound_links_min": 2,
    "image_alt_required": true,
    "slug_style": "kebab-case"
  },
  "aio": {
    "summary_block_required": true,
    "qa_block_required": true,
    "structured_data": ["Article"],
    "answers_should_be_self_contained": true,
    "content_layout": ["intro", "key_points", "how_to", "faqs", "summary"]
  },
  "ai_search_visibility": {
    "clear_headings": true,
    "explicit_facts_with_sources": true,
    "avoid_fluff": true,
    "scannability_score_min": 80
  },
  "prohibited": {
    "claims_without_source": true,
    "fabricated_stats": true,
    "over-optimization_patterns": ["keyword stuffing"]
  },
  "score_weights": {
    "eeat": 0.35,
    "seo": 0.30,
    "aio": 0.20,
    "ai_search_visibility": 0.15
  },
  "enforcement": {
    "default_min_quality_score": 80,
    "block_publish_if_below": false,
    "tag_if_below": "review-needed"
  }
}', '["https://developers.google.com/search/docs/fundamentals/creating-helpful-content", "https://blog.google/products/search/our-latest-investments-information-quality-search/"]', 'Initial Phase 7 rulebook', CURRENT_TIMESTAMP);
