
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Global Standard Rulebook (GSRB) - Conservative baseline
const DEFAULT_RULEBOOK = {
  eeat: {
    require_author_bio: true,
    require_citations: true,
    allowed_source_domains: [
      "*.gov", "*.edu", "*.org",
      "pubmed.ncbi.nlm.nih.gov",
      "scholar.google.com",
      "arxiv.org",
      "*.ac.uk", "*.ac.jp"
    ],
    citation_style: "harvard",
    tone_constraints: ["helpful", "expert", "evidence-based", "neutral"]
  },
  seo: {
    title_length: { min: 45, max: 65 },
    meta_description: { min: 150, max: 160 },
    h1_rules: { must_include_primary_keyword: true },
    internal_links_min: 3,
    outbound_links_min: 2,
    image_alt_required: true,
    slug_style: "kebab-case"
  },
  aio: {
    summary_block_required: true,
    qa_block_required: true,
    structured_data: ["Article", "FAQPage", "HowTo"],
    answers_should_be_self_contained: true,
    content_layout: ["intro", "key_points", "how_to", "faqs", "summary"]
  },
  ai_search_visibility: {
    clear_headings: true,
    explicit_facts_with_sources: true,
    avoid_fluff: true,
    scannability_score_min: 75
  },
  prohibited: {
    claims_without_source: true,
    fabricated_stats: true,
    over_optimization_patterns: ["keyword stuffing", "link farming"]
  },
  score_weights: {
    eeat: 0.35,
    seo: 0.25,
    aio: 0.25,
    ai_search_visibility: 0.15
  },
  enforcement: {
    default_min_quality_score: 75, // Conservative threshold
    block_publish_if_below: false, // Allow but tag for review
    tag_if_below: "review-needed"
  }
}

const DEFAULT_SOURCES = [
  "https://developers.google.com/search/docs/fundamentals/creating-helpful-content",
  "https://blog.google/products/search/our-latest-investments-information-quality-search/",
  "https://developers.google.com/search/docs/appearance/structured-data",
  "https://support.google.com/webmasters/answer/9049606"
]

async function seedRulebook() {
  console.log('🌱 Seeding Global Standard Rulebook...')
  
  try {
    // Check if any rulebook exists
    const existingRulebook = await prisma.globalRulebook.findFirst({
      orderBy: { version: 'desc' }
    })
    
    if (existingRulebook) {
      console.log(`✅ Rulebook already exists (version ${existingRulebook.version})`)
      console.log(`   Created: ${existingRulebook.createdAt}`)
      console.log(`   Updated by: ${existingRulebook.updatedBy || 'system'}`)
      return
    }
    
    // Create the initial Global Standard Rulebook
    const newRulebook = await prisma.globalRulebook.create({
      data: {
        version: 1,
        rules: DEFAULT_RULEBOOK,
        sources: DEFAULT_SOURCES,
        updatedBy: 'seed_script'
      }
    })
    
    // Create corresponding version record
    await prisma.rulebookVersion.create({
      data: {
        version: 1,
        rules: DEFAULT_RULEBOOK,
        sources: DEFAULT_SOURCES,
        notes: 'Initial Global Standard Rulebook (GSRB) - Conservative baseline for content quality'
      }
    })
    
    console.log('✅ Successfully seeded Global Standard Rulebook:')
    console.log(`   ID: ${newRulebook.id}`)
    console.log(`   Version: ${newRulebook.version}`)
    console.log(`   Quality threshold: ${DEFAULT_RULEBOOK.enforcement.default_min_quality_score}`)
    console.log(`   E-E-A-T weight: ${DEFAULT_RULEBOOK.score_weights.eeat * 100}%`)
    console.log(`   Total sources: ${DEFAULT_SOURCES.length}`)
    
    // Verify the seeded data
    const verification = await prisma.globalRulebook.findFirst({
      orderBy: { version: 'desc' }
    })
    
    if (verification) {
      console.log('✅ Verification successful - Rulebook is active')
    } else {
      console.error('❌ Verification failed - Rulebook not found after creation')
      process.exit(1)
    }
    
  } catch (error) {
    console.error('❌ Error seeding rulebook:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the seed function
if (require.main === module) {
  seedRulebook()
    .then(() => {
      console.log('🎉 Seed completed successfully!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('💥 Seed failed:', error)
      process.exit(1)
    })
}

export { seedRulebook, DEFAULT_RULEBOOK, DEFAULT_SOURCES }
