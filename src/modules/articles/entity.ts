
import { z } from 'zod';

/**
 * Article Entity and DTOs
 * Phase 1: Content Management System
 */

export enum ArticleStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED',
}

export const CreateArticleDto = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  slug: z.string().min(1, 'Slug is required').max(200, 'Slug too long'),
  content: z.string().optional(),
  excerpt: z.string().max(500, 'Excerpt too long').optional(),
  status: z.nativeEnum(ArticleStatus).default(ArticleStatus.DRAFT),
  publishedAt: z.string().datetime().optional(),
  siteId: z.string().min(1, 'Site ID is required'),
  categoryId: z.string().optional(),
  seoData: z.object({
    metaTitle: z.string().max(60, 'Meta title too long').optional(),
    metaDescription: z.string().max(160, 'Meta description too long').optional(),
    keywords: z.array(z.string()).default([]),
    ogTitle: z.string().max(60, 'OG title too long').optional(),
    ogDescription: z.string().max(160, 'OG description too long').optional(),
    ogImage: z.string().url('Invalid OG image URL').optional(),
    twitterTitle: z.string().max(60, 'Twitter title too long').optional(),
    twitterDescription: z.string().max(160, 'Twitter description too long').optional(),
    twitterImage: z.string().url('Invalid Twitter image URL').optional(),
    canonicalUrl: z.string().url('Invalid canonical URL').optional(),
  }).optional(),
});

export const UpdateArticleDto = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long').optional(),
  slug: z.string().min(1, 'Slug is required').max(200, 'Slug too long').optional(),
  content: z.string().optional(),
  excerpt: z.string().max(500, 'Excerpt too long').optional(),
  status: z.nativeEnum(ArticleStatus).optional(),
  publishedAt: z.string().datetime().optional(),
  categoryId: z.string().optional(),
  seoData: z.object({
    metaTitle: z.string().max(60, 'Meta title too long').optional(),
    metaDescription: z.string().max(160, 'Meta description too long').optional(),
    keywords: z.array(z.string()).optional(),
    ogTitle: z.string().max(60, 'OG title too long').optional(),
    ogDescription: z.string().max(160, 'OG description too long').optional(),
    ogImage: z.string().url('Invalid OG image URL').optional(),
    twitterTitle: z.string().max(60, 'Twitter title too long').optional(),
    twitterDescription: z.string().max(160, 'Twitter description too long').optional(),
    twitterImage: z.string().url('Invalid Twitter image URL').optional(),
    canonicalUrl: z.string().url('Invalid canonical URL').optional(),
  }).optional(),
});

export const ArticleQueryDto = z.object({
  page: z.string().transform(Number).pipe(z.number().min(1)).default('1'),
  limit: z.string().transform(Number).pipe(z.number().min(1).max(100)).default('10'),
  status: z.nativeEnum(ArticleStatus).optional(),
  siteId: z.string().optional(),
  categoryId: z.string().optional(),
  search: z.string().optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'publishedAt', 'title']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type CreateArticleInput = z.infer<typeof CreateArticleDto>;
export type UpdateArticleInput = z.infer<typeof UpdateArticleDto>;
export type ArticleQuery = z.infer<typeof ArticleQueryDto>;

export interface ArticleResponse {
  id: string;
  title: string;
  slug: string;
  content?: string;
  excerpt?: string;
  status: ArticleStatus;
  publishedAt?: Date;
  authorId: string;
  siteId: string;
  categoryId?: string;
  createdAt: Date;
  updatedAt: Date;
  author: {
    id: string;
    name?: string;
    email: string;
  };
  site: {
    id: string;
    name: string;
    key: string;
  };
  category?: {
    id: string;
    name: string;
  };
  seoData?: {
    id: string;
    metaTitle?: string;
    metaDescription?: string;
    keywords: string[];
    ogTitle?: string;
    ogDescription?: string;
    ogImage?: string;
    twitterTitle?: string;
    twitterDescription?: string;
    twitterImage?: string;
    canonicalUrl?: string;
  };
  media: {
    id: string;
    filename: string;
    originalName: string;
    mimeType: string;
    size: number;
    url?: string;
    alt?: string;
  }[];
}
