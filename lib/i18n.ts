
export interface I18nConfig {
  defaultLang: string
  supportedLangs: string[]
  rtlLangs: string[]
}

export const DEFAULT_I18N_CONFIG: I18nConfig = {
  defaultLang: 'en',
  supportedLangs: ['en', 'ar', 'es', 'fr', 'de', 'ja', 'zh'],
  rtlLangs: ['ar', 'he', 'fa', 'ur']
}

// Arabic/RTL slug generation
export function generateSlug(title: string, lang: string = 'en'): string {
  if (!title) return 'untitled'
  
  // For RTL languages, handle differently
  if (DEFAULT_I18N_CONFIG.rtlLangs.includes(lang)) {
    return generateRTLSlug(title, lang)
  }
  
  // Standard Latin slug generation
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
    .substring(0, 50) // Limit length
    || 'untitled'
}

function generateRTLSlug(title: string, lang: string): string {
  // For Arabic and other RTL languages
  if (lang === 'ar') {
    // Convert Arabic to transliteration or use title hash
    const cleaned = title
      .replace(/[^\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF\s]/g, '')
      .trim()
    
    if (cleaned) {
      // Use a hash-based approach for Arabic slugs
      const hash = simpleHash(cleaned).toString(36)
      return `article-ar-${hash}`
    }
  }
  
  // Fallback for other RTL languages or when conversion fails
  const hash = simpleHash(title).toString(36)
  return `article-${lang}-${hash}`
}

function simpleHash(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  return Math.abs(hash)
}

// RTL-aware citation rendering
export function formatCitation(
  source: string,
  title: string,
  url: string,
  lang: string = 'en'
): string {
  const isRTL = DEFAULT_I18N_CONFIG.rtlLangs.includes(lang)
  
  if (lang === 'ar') {
    // Arabic citation format
    return `المصدر: ${source}. "${title}". متاح على: ${url}`
  }
  
  // Harvard style for LTR languages
  const citation = `${source}. "${title}". Available at: ${url}`
  
  if (isRTL) {
    // Add RTL markers for proper rendering
    return `\u202E${citation}\u202C`
  }
  
  return citation
}

// Schema.org JSON-LD with language support
export function generateArticleSchema(data: {
  title: string
  description: string
  content: string
  author: string
  publishedDate: string
  lang: string
  url: string
  images?: string[]
}): object {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": data.title,
    "description": data.description,
    "articleBody": data.content.substring(0, 500) + "...", // Truncated for schema
    "author": {
      "@type": "Person",
      "name": data.author
    },
    "datePublished": data.publishedDate,
    "inLanguage": data.lang,
    "url": data.url,
    "publisher": {
      "@type": "Organization",
      "name": "Orion Content",
      "url": "https://orion-content.com"
    }
  } as any
  
  // Add images if provided
  if (data.images && data.images.length > 0) {
    schema.image = data.images.map(img => ({
      "@type": "ImageObject",
      "url": img
    }))
  }
  
  // Add RTL direction for RTL languages
  if (DEFAULT_I18N_CONFIG.rtlLangs.includes(data.lang)) {
    schema.textDirection = "rtl"
  }
  
  return schema
}

// Alt text generation with language awareness
export function generateAltText(
  imageContext: string,
  lang: string = 'en'
): string {
  if (!imageContext) {
    return lang === 'ar' ? 'صورة توضيحية' : 'Illustrative image'
  }
  
  // Clean and format the context
  const cleaned = imageContext.trim().substring(0, 125) // Screen reader friendly length
  
  if (lang === 'ar') {
    return `صورة توضيحية: ${cleaned}`
  }
  
  return `Image: ${cleaned}`
}

// Validate content for RTL/i18n compliance
export function validateI18nCompliance(content: {
  title: string
  slug: string
  html: string
  lang: string
  citations: string[]
  altTexts: string[]
  schema: object
}): {
  valid: boolean
  issues: string[]
} {
  const issues: string[] = []
  
  // Validate slug format
  if (content.lang === 'ar' && !content.slug.includes('ar')) {
    issues.push('Arabic content should have Arabic-aware slug')
  }
  
  // Validate citations format
  if (DEFAULT_I18N_CONFIG.rtlLangs.includes(content.lang)) {
    const hasRTLCitations = content.citations.some(cite => 
      cite.includes('المصدر') || cite.includes('\u202E')
    )
    if (!hasRTLCitations && content.citations.length > 0) {
      issues.push('RTL content should have RTL-formatted citations')
    }
  }
  
  // Validate alt texts
  if (content.lang === 'ar') {
    const hasArabicAlt = content.altTexts.some(alt => 
      alt.includes('صورة')
    )
    if (!hasArabicAlt && content.altTexts.length > 0) {
      issues.push('Arabic content should have Arabic alt texts')
    }
  }
  
  // Validate schema language
  const schema = content.schema as any
  if (schema.inLanguage !== content.lang) {
    issues.push('Schema.org language should match content language')
  }
  
  return {
    valid: issues.length === 0,
    issues
  }
}
