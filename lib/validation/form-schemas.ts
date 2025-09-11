
import { z } from 'zod'

// Site creation schema
export const createSiteSchema = z.object({
  name: z.string()
    .min(1, 'Site name is required')
    .max(100, 'Site name must be less than 100 characters')
    .regex(/^[a-zA-Z0-9\s\-_]+$/, 'Site name can only contain letters, numbers, spaces, hyphens, and underscores'),
  
  url: z.string()
    .url('Please enter a valid URL')
    .refine(url => {
      try {
        const parsed = new URL(url)
        return ['http:', 'https:'].includes(parsed.protocol)
      } catch {
        return false
      }
    }, 'URL must use HTTP or HTTPS protocol'),
  
  description: z.string()
    .max(500, 'Description must be less than 500 characters')
    .optional(),
  
  category: z.enum(['blog', 'ecommerce', 'portfolio', 'business', 'news', 'other'], {
    errorMap: () => ({ message: 'Please select a valid category' })
  }),
  
  tags: z.array(z.string())
    .max(10, 'Maximum 10 tags allowed')
    .optional()
    .default([]),
  
  isActive: z.boolean().default(true)
})

// User authentication schema
export const loginSchema = z.object({
  email: z.string()
    .email('Please enter a valid email address')
    .min(1, 'Email is required'),
  
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be less than 128 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one lowercase letter, one uppercase letter, and one number')
})

export const registerSchema = loginSchema.extend({
  name: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name must be less than 50 characters')
    .regex(/^[a-zA-Z\s]+$/, 'Name can only contain letters and spaces'),
  
  confirmPassword: z.string()
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
})

// Content creation schema
export const createContentSchema = z.object({
  title: z.string()
    .min(1, 'Title is required')
    .max(200, 'Title must be less than 200 characters'),
  
  content: z.string()
    .min(10, 'Content must be at least 10 characters')
    .max(50000, 'Content must be less than 50,000 characters'),
  
  excerpt: z.string()
    .max(300, 'Excerpt must be less than 300 characters')
    .optional(),
  
  slug: z.string()
    .min(1, 'Slug is required')
    .max(100, 'Slug must be less than 100 characters')
    .regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens')
    .refine(slug => !slug.startsWith('-') && !slug.endsWith('-'), 'Slug cannot start or end with a hyphen'),
  
  status: z.enum(['draft', 'published', 'archived'], {
    errorMap: () => ({ message: 'Please select a valid status' })
  }),
  
  publishedAt: z.date().optional(),
  
  metaTitle: z.string()
    .max(60, 'Meta title should be less than 60 characters for optimal SEO')
    .optional(),
  
  metaDescription: z.string()
    .max(160, 'Meta description should be less than 160 characters for optimal SEO')
    .optional(),
  
  keywords: z.array(z.string())
    .max(20, 'Maximum 20 keywords allowed')
    .optional()
    .default([]),
  
  featuredImage: z.string()
    .url('Please enter a valid image URL')
    .optional(),
  
  category: z.string()
    .min(1, 'Category is required'),
  
  tags: z.array(z.string())
    .max(15, 'Maximum 15 tags allowed')
    .optional()
    .default([])
})

// Settings update schema
export const updateSettingsSchema = z.object({
  siteName: z.string()
    .min(1, 'Site name is required')
    .max(100, 'Site name must be less than 100 characters'),
  
  siteDescription: z.string()
    .max(500, 'Site description must be less than 500 characters')
    .optional(),
  
  siteUrl: z.string()
    .url('Please enter a valid site URL'),
  
  adminEmail: z.string()
    .email('Please enter a valid admin email'),
  
  timezone: z.string()
    .min(1, 'Timezone is required'),
  
  language: z.string()
    .min(2, 'Language code is required')
    .max(5, 'Invalid language code'),
  
  enableComments: z.boolean().default(true),
  enableAnalytics: z.boolean().default(true),
  enableSEO: z.boolean().default(true),
  
  socialMedia: z.object({
    twitter: z.string().url('Please enter a valid Twitter URL').optional().or(z.literal('')),
    facebook: z.string().url('Please enter a valid Facebook URL').optional().or(z.literal('')),
    linkedin: z.string().url('Please enter a valid LinkedIn URL').optional().or(z.literal('')),
    instagram: z.string().url('Please enter a valid Instagram URL').optional().or(z.literal(''))
  }).optional()
})

// API key configuration schema
export const apiKeySchema = z.object({
  name: z.string()
    .min(1, 'API key name is required')
    .max(50, 'API key name must be less than 50 characters'),
  
  key: z.string()
    .min(10, 'API key must be at least 10 characters')
    .max(500, 'API key is too long'),
  
  service: z.enum(['openai', 'google_analytics', 'google_search_console', 'wordpress', 'other'], {
    errorMap: () => ({ message: 'Please select a valid service' })
  }),
  
  description: z.string()
    .max(200, 'Description must be less than 200 characters')
    .optional(),
  
  isActive: z.boolean().default(true)
})

// Contact form schema
export const contactFormSchema = z.object({
  name: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name must be less than 50 characters'),
  
  email: z.string()
    .email('Please enter a valid email address'),
  
  subject: z.string()
    .min(5, 'Subject must be at least 5 characters')
    .max(100, 'Subject must be less than 100 characters'),
  
  message: z.string()
    .min(10, 'Message must be at least 10 characters')
    .max(1000, 'Message must be less than 1000 characters'),
  
  consent: z.boolean()
    .refine(val => val === true, 'You must agree to the privacy policy')
})

// Export types for TypeScript
export type CreateSiteInput = z.infer<typeof createSiteSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type RegisterInput = z.infer<typeof registerSchema>
export type CreateContentInput = z.infer<typeof createContentSchema>
export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>
export type ApiKeyInput = z.infer<typeof apiKeySchema>
export type ContactFormInput = z.infer<typeof contactFormSchema>

// Validation helper functions
export function validateSchema<T>(schema: z.ZodSchema<T>, data: unknown): {
  success: boolean
  data?: T
  errors?: Record<string, string[]>
} {
  try {
    const result = schema.parse(data)
    return { success: true, data: result }
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors: Record<string, string[]> = {}
      error.errors.forEach(err => {
        const path = err.path.join('.')
        if (!errors[path]) {
          errors[path] = []
        }
        errors[path].push(err.message)
      })
      return { success: false, errors }
    }
    return { success: false, errors: { general: ['Validation failed'] } }
  }
}

export function getFieldError(errors: Record<string, string[]> | undefined, field: string): string | undefined {
  return errors?.[field]?.[0]
}
