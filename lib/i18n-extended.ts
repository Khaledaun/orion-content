
import { DEFAULT_I18N_CONFIG } from '@/lib/i18n'

// Extended i18n configuration for Phase 8
export const EXTENDED_I18N_CONFIG = {
  ...DEFAULT_I18N_CONFIG,
  supportedLangs: ['en', 'ar', 'es', 'fr', 'de', 'ja', 'zh', 'he'], // Added Hebrew
  rtlLangs: ['ar', 'he', 'fa', 'ur'],
  complexScriptLangs: ['ar', 'he', 'zh', 'ja'],
  languageNames: {
    en: 'English',
    ar: 'العربية',
    es: 'Español', 
    fr: 'Français',
    de: 'Deutsch',
    ja: '日本語',
    zh: '中文',
    he: 'עברית'
  }
}

// French language support
export const FRENCH_CONFIG = {
  slugStrategy: 'latin-diacritics', // Preserve French accents in URLs
  citationFormat: 'harvard-fr',
  dateFormat: 'DD/MM/YYYY',
  numberFormat: 'fr-FR',
  quotationMarks: ['«', '»'], // French quotation marks
  punctuationRules: {
    beforeColon: true,      // Space before colon in French
    beforeSemicolon: true,  // Space before semicolon
    beforeExclamation: true,// Space before exclamation mark
    beforeQuestion: true    // Space before question mark
  }
}

// Hebrew language support
export const HEBREW_CONFIG = {
  slugStrategy: 'hash-based', // Hebrew URLs use hash-based slugs
  citationFormat: 'apa-he',
  dateFormat: 'DD.MM.YYYY',
  numberFormat: 'he-IL',
  direction: 'rtl',
  punctuationRules: {
    mixedText: true,        // Handle mixed Hebrew-English text
    numberAlignment: 'ltr'  // Numbers always LTR even in RTL text
  }
}

// Enhanced slug generation for multiple languages
export function generateExtendedSlug(title: string, lang: string = 'en'): string {
  if (!title) return 'untitled'
  
  switch (lang) {
    case 'fr':
      return generateFrenchSlug(title)
    case 'he':
      return generateHebrewSlug(title)
    case 'ar':
      return generateArabicSlug(title)
    case 'zh':
    case 'ja':
      return generateAsianSlug(title, lang)
    default:
      return generateLatinSlug(title)
  }
}

function generateFrenchSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    // Preserve French accents but make URL-safe
    .replace(/[àáâãäå]/g, 'a')
    .replace(/[èéêë]/g, 'e')
    .replace(/[ìíîï]/g, 'i')
    .replace(/[òóôõö]/g, 'o')
    .replace(/[ùúûü]/g, 'u')
    .replace(/[ýÿ]/g, 'y')
    .replace(/[ç]/g, 'c')
    .replace(/[ñ]/g, 'n')
    .replace(/[^a-z0-9\s-]/g, '') // Remove other special chars
    .replace(/[\s_-]+/g, '-')     // Replace spaces with hyphens
    .replace(/^-+|-+$/g, '')      // Remove leading/trailing hyphens
    .substring(0, 60)             // Limit length
    || 'article-fr'
}

function generateHebrewSlug(title: string): string {
  // Hebrew uses hash-based slugs for SEO
  const cleanTitle = title.replace(/[^\u0590-\u05FF\u0600-\u06FF\s]/g, '').trim()
  
  if (cleanTitle) {
    const hash = simpleHash(cleanTitle).toString(36)
    return `article-he-${hash}`
  }
  
  return `article-he-${Date.now().toString(36)}`
}

function generateArabicSlug(title: string): string {
  // Arabic uses hash-based slugs
  const cleanTitle = title.replace(/[^\u0600-\u06FF\u0750-\u077F\s]/g, '').trim()
  
  if (cleanTitle) {
    const hash = simpleHash(cleanTitle).toString(36)
    return `article-ar-${hash}`
  }
  
  return `article-ar-${Date.now().toString(36)}`
}

function generateAsianSlug(title: string, lang: string): string {
  // Asian languages use hash-based slugs
  const cleanTitle = title.trim()
  const hash = simpleHash(cleanTitle).toString(36)
  return `article-${lang}-${hash}`
}

function generateLatinSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, '')  // Remove leading/trailing hyphens
    .substring(0, 50)         // Limit length
    || 'untitled'
}

// Enhanced citation formatting for multiple languages
export function formatExtendedCitation(
  source: string,
  title: string,
  url: string,
  lang: string = 'en',
  author?: string,
  date?: string
): string {
  switch (lang) {
    case 'fr':
      return formatFrenchCitation(source, title, url, author, date)
    case 'he':
      return formatHebrewCitation(source, title, url, author, date)
    case 'ar':
      return formatArabicCitation(source, title, url, author, date)
    default:
      return formatEnglishCitation(source, title, url, author, date)
  }
}

function formatFrenchCitation(source: string, title: string, url: string, author?: string, date?: string): string {
  // French academic citation format
  let citation = ''
  
  if (author) {
    citation += `${author}. `
  }
  
  citation += `« ${title} ». `
  
  if (source) {
    citation += `${source}. `
  }
  
  if (date) {
    citation += `${date}. `
  }
  
  citation += `Disponible sur : ${url}`
  
  return citation
}

function formatHebrewCitation(source: string, title: string, url: string, author?: string, date?: string): string {
  // Hebrew citation format (RTL)
  let citation = ''
  
  if (author) {
    citation += `${author}. `
  }
  
  citation += `"${title}". `
  
  if (source) {
    citation += `${source}. `
  }
  
  if (date) {
    citation += `${date}. `
  }
  
  citation += `זמין בכתובת: ${url}`
  
  // Add RTL markers for proper rendering
  return `\u202E${citation}\u202C`
}

function formatArabicCitation(source: string, title: string, url: string, author?: string, date?: string): string {
  // Arabic citation format
  let citation = ''
  
  if (author) {
    citation += `${author}. `
  }
  
  citation += `"${title}". `
  
  if (source) {
    citation += `المصدر: ${source}. `
  }
  
  if (date) {
    citation += `${date}. `
  }
  
  citation += `متاح على: ${url}`
  
  return citation
}

function formatEnglishCitation(source: string, title: string, url: string, author?: string, date?: string): string {
  // Standard English citation format
  let citation = ''
  
  if (author) {
    citation += `${author}. `
  }
  
  citation += `"${title}". `
  
  if (source) {
    citation += `${source}. `
  }
  
  if (date) {
    citation += `${date}. `
  }
  
  citation += `Available at: ${url}`
  
  return citation
}

// Enhanced schema.org JSON-LD with multi-language support
export function generateExtendedArticleSchema(data: {
  title: string
  description: string
  content: string
  author: string
  publishedDate: string
  lang: string
  url: string
  images?: string[]
  alternateLanguages?: Array<{ lang: string; url: string }>
}): object {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": data.title,
    "description": data.description,
    "articleBody": data.content.substring(0, 500) + "...",
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

  // Add RTL direction for RTL languages
  if (EXTENDED_I18N_CONFIG.rtlLangs.includes(data.lang)) {
    schema.textDirection = "rtl"
  }

  // Add language-specific metadata
  if (data.lang === 'fr') {
    schema.contentLocation = {
      "@type": "Country",
      "name": "France"
    }
  } else if (data.lang === 'he') {
    schema.contentLocation = {
      "@type": "Country",
      "name": "Israel"
    }
    schema.textDirection = "rtl"
  } else if (data.lang === 'ar') {
    schema.textDirection = "rtl"
  }

  // Add images if provided
  if (data.images && data.images.length > 0) {
    schema.image = data.images.map(img => ({
      "@type": "ImageObject",
      "url": img
    }))
  }

  // Add alternate language versions
  if (data.alternateLanguages && data.alternateLanguages.length > 0) {
    schema.translationOfWork = data.alternateLanguages.map(alt => ({
      "@type": "Article",
      "inLanguage": alt.lang,
      "url": alt.url
    }))
  }

  return schema
}

// Enhanced alt text generation for multiple languages
export function generateExtendedAltText(
  imageContext: string,
  lang: string = 'en',
  imageType?: 'photo' | 'illustration' | 'chart' | 'screenshot'
): string {
  if (!imageContext) {
    return getDefaultAltText(lang, imageType)
  }

  const cleaned = imageContext.trim().substring(0, 125)

  switch (lang) {
    case 'fr':
      return `Image : ${cleaned}`
    case 'he':
      return `תמונה: ${cleaned}`
    case 'ar':
      return `صورة: ${cleaned}`
    case 'es':
      return `Imagen: ${cleaned}`
    case 'de':
      return `Bild: ${cleaned}`
    case 'ja':
      return `画像: ${cleaned}`
    case 'zh':
      return `图片: ${cleaned}`
    default:
      return `Image: ${cleaned}`
  }
}

function getDefaultAltText(lang: string, imageType?: string): string {
  const defaults = {
    en: {
      photo: 'Photograph',
      illustration: 'Illustration',
      chart: 'Chart or diagram',
      screenshot: 'Screenshot',
      default: 'Illustrative image'
    },
    fr: {
      photo: 'Photographie',
      illustration: 'Illustration',
      chart: 'Graphique ou diagramme',
      screenshot: 'Capture d\'écran',
      default: 'Image illustrative'
    },
    he: {
      photo: 'צילום',
      illustration: 'איור',
      chart: 'תרשים או גרף',
      screenshot: 'צילום מסך',
      default: 'תמונה להמחשה'
    },
    ar: {
      photo: 'صورة فوتوغرافية',
      illustration: 'رسم توضيحي',
      chart: 'مخطط أو رسم بياني',
      screenshot: 'لقطة شاشة',
      default: 'صورة توضيحية'
    }
  }

  const langDefaults = defaults[lang as keyof typeof defaults] || defaults.en
  return langDefaults[imageType as keyof typeof langDefaults] || langDefaults.default
}

// Comprehensive i18n validation
export function validateExtendedI18nCompliance(content: {
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
  suggestions: string[]
} {
  const issues: string[] = []
  const suggestions: string[] = []

  // Validate slug format for each language
  if (content.lang === 'ar' || content.lang === 'he') {
    if (!content.slug.includes(`article-${content.lang}-`)) {
      issues.push(`${content.lang.toUpperCase()} content should use hash-based slug format`)
    }
  } else if (content.lang === 'fr') {
    if (content.slug.includes('_') || !content.slug.match(/^[a-z0-9-]+$/)) {
      issues.push('French content should use clean hyphenated slugs')
      suggestions.push('Use generateFrenchSlug() for proper accent handling')
    }
  }

  // Validate citations format
  const rtlLangs = EXTENDED_I18N_CONFIG.rtlLangs
  if (rtlLangs.includes(content.lang)) {
    const hasRTLCitations = content.citations.some(cite =>
      cite.includes('\u202E') || 
      (content.lang === 'ar' && cite.includes('المصدر')) ||
      (content.lang === 'he' && cite.includes('זמין בכתובת'))
    )
    if (!hasRTLCitations && content.citations.length > 0) {
      issues.push('RTL content should have RTL-formatted citations')
      suggestions.push(`Use formatExtendedCitation() with lang="${content.lang}"`)
    }
  }

  // Validate alt texts
  const expectedAltPrefix = {
    en: 'Image:',
    fr: 'Image :',
    he: 'תמונה:',
    ar: 'صورة:',
    es: 'Imagen:',
    de: 'Bild:'
  }

  const prefix = expectedAltPrefix[content.lang as keyof typeof expectedAltPrefix]
  if (prefix && content.altTexts.length > 0) {
    const hasCorrectFormat = content.altTexts.some(alt => alt.includes(prefix))
    if (!hasCorrectFormat) {
      issues.push(`Alt texts should be in ${content.lang} language`)
      suggestions.push(`Use generateExtendedAltText() with lang="${content.lang}"`)
    }
  }

  // Validate schema language consistency
  const schema = content.schema as any
  if (schema.inLanguage !== content.lang) {
    issues.push('Schema.org language should match content language')
  }

  // Check for RTL direction in schema
  if (rtlLangs.includes(content.lang) && !schema.textDirection) {
    suggestions.push('Consider adding textDirection="rtl" to schema for RTL languages')
  }

  return {
    valid: issues.length === 0,
    issues,
    suggestions
  }
}

// Utility function for hash generation
function simpleHash(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  return Math.abs(hash)
}

// Mixed script content handling (for multilingual documents)
export function processMixedScriptContent(content: string, primaryLang: string): {
  content: string
  detectedLanguages: string[]
  rtlSegments: Array<{ start: number; end: number; lang: string }>
} {
  // This would implement sophisticated mixed-script handling
  // For now, return basic analysis
  const rtlPattern = /[\u0590-\u05FF\u0600-\u06FF\u0750-\u077F]+/g
  const rtlMatches = [...content.matchAll(rtlPattern)]
  
  const rtlSegments = rtlMatches.map(match => ({
    start: match.index || 0,
    end: (match.index || 0) + match[0].length,
    lang: /[\u0600-\u06FF]/.test(match[0]) ? 'ar' : 'he'
  }))

  const detectedLanguages = [primaryLang]
  if (rtlSegments.length > 0) {
    const rtlLangs = [...new Set(rtlSegments.map(seg => seg.lang))]
    detectedLanguages.push(...rtlLangs)
  }

  return {
    content,
    detectedLanguages: [...new Set(detectedLanguages)],
    rtlSegments
  }
}
