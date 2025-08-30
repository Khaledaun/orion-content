
export interface WordPressConfig {
  siteUrl: string
  username: string
  password: string // Application password
  apiVersion?: string
}

export interface WordPressDraft {
  title: string
  content: string
  excerpt?: string
  status: 'draft'
  tags?: string[]
  categories?: string[]
  meta?: Record<string, any>
}

export interface WordPressTag {
  id?: number
  name: string
  slug: string
}

export class WordPressClient {
  private config: WordPressConfig
  private baseUrl: string
  
  constructor(config: WordPressConfig) {
    this.config = config
    this.baseUrl = `${config.siteUrl.replace(/\/$/, '')}/wp-json/wp/v${config.apiVersion || '2'}`
  }
  
  private getAuthHeader(): string {
    const credentials = Buffer.from(`${this.config.username}:${this.config.password}`).toString('base64')
    return `Basic ${credentials}`
  }
  
  async createDraft(draft: WordPressDraft): Promise<{ id: number; link: string }> {
    if (process.env.NODE_ENV !== 'production') {
      // Development mode - return stub
      const stubId = Math.floor(Math.random() * 10000)
      console.log('WORDPRESS_STUB: Would create draft:', {
        title: draft.title,
        contentLength: draft.content.length,
        tags: draft.tags,
        status: draft.status
      })
      return {
        id: stubId,
        link: `${this.config.siteUrl}/wp-admin/post.php?post=${stubId}&action=edit`
      }
    }
    
    // Production mode - actual WordPress API call
    const response = await fetch(`${this.baseUrl}/posts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': this.getAuthHeader()
      },
      body: JSON.stringify({
        title: draft.title,
        content: draft.content,
        excerpt: draft.excerpt,
        status: draft.status,
        tags: draft.tags,
        categories: draft.categories,
        meta: draft.meta
      })
    })
    
    if (!response.ok) {
      throw new Error(`WordPress API error: ${response.status} ${response.statusText}`)
    }
    
    const post = await response.json()
    return {
      id: post.id,
      link: post.link
    }
  }
  
  async ensureTag(tagName: string): Promise<WordPressTag> {
    const slug = tagName.toLowerCase().replace(/[^a-z0-9]+/g, '-')
    
    if (process.env.NODE_ENV !== 'production') {
      // Development mode - return stub
      console.log('WORDPRESS_STUB: Would ensure tag exists:', { name: tagName, slug })
      return {
        id: Math.floor(Math.random() * 1000),
        name: tagName,
        slug
      }
    }
    
    // First, try to find existing tag
    const searchResponse = await fetch(`${this.baseUrl}/tags?search=${encodeURIComponent(tagName)}`, {
      headers: { 'Authorization': this.getAuthHeader() }
    })
    
    if (searchResponse.ok) {
      const tags = await searchResponse.json()
      if (tags.length > 0) {
        return tags[0]
      }
    }
    
    // Create new tag
    const createResponse = await fetch(`${this.baseUrl}/tags`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': this.getAuthHeader()
      },
      body: JSON.stringify({
        name: tagName,
        slug
      })
    })
    
    if (!createResponse.ok) {
      throw new Error(`Failed to create WordPress tag: ${createResponse.status}`)
    }
    
    return await createResponse.json()
  }
  
  async addTagToPost(postId: number, tagId: number): Promise<void> {
    if (process.env.NODE_ENV !== 'production') {
      console.log('WORDPRESS_STUB: Would add tag to post:', { postId, tagId })
      return
    }
    
    const response = await fetch(`${this.baseUrl}/posts/${postId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': this.getAuthHeader()
      },
      body: JSON.stringify({
        tags: [tagId] // This will append to existing tags
      })
    })
    
    if (!response.ok) {
      throw new Error(`Failed to add tag to post: ${response.status}`)
    }
  }
}

// Quality gating integration
export async function processQualityGating(
  wpClient: WordPressClient,
  pipelineResult: {
    title: string
    html: string
    score: number
    details: any
    lang?: string
  },
  flags: {
    ignore_rulebook?: boolean
    [key: string]: any
  },
  threshold: number = 75
): Promise<{
  postId: number
  link: string
  action: 'published' | 'draft_with_review' | 'bypassed'
  tags: string[]
}> {
  const tags: string[] = []
  let action: 'published' | 'draft_with_review' | 'bypassed' = 'published'
  
  // Check for rulebook bypass
  if (flags.ignore_rulebook) {
    console.log('QUALITY_GATING: Rulebook enforcement bypassed by flag')
    action = 'bypassed'
    tags.push('rulebook-bypassed')
  }
  // Check quality score against threshold
  else if (pipelineResult.score < threshold) {
    console.log(`QUALITY_GATING: Score ${pipelineResult.score} below threshold ${threshold}`)
    action = 'draft_with_review'
    tags.push('review-needed')
    
    // Ensure review tag exists
    await wpClient.ensureTag('review-needed')
  }
  
  // Create WordPress draft
  const draft: WordPressDraft = {
    title: pipelineResult.title,
    content: pipelineResult.html,
    status: 'draft',
    tags,
    meta: {
      quality_score: pipelineResult.score,
      quality_details: pipelineResult.details,
      content_lang: pipelineResult.lang || 'en'
    }
  }
  
  const post = await wpClient.createDraft(draft)
  
  console.log('QUALITY_GATING:', {
    postId: post.id,
    title: pipelineResult.title,
    score: pipelineResult.score,
    threshold,
    action,
    tags
  })
  
  return {
    postId: post.id,
    link: post.link,
    action,
    tags
  }
}
