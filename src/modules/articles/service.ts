
import { PrismaClient } from '@prisma/client';
import { CreateArticleInput, UpdateArticleInput, ArticleQuery, ArticleStatus } from './entity';

/**
 * Article Service for content management
 * Phase 1: Content Management System
 */

export class ArticleService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Create a new article
   */
  async createArticle(input: CreateArticleInput, authorId: string) {
    const { seoData, ...articleData } = input;
    
    // Check if slug is unique
    const existingArticle = await this.prisma.article.findUnique({
      where: { slug: input.slug }
    });
    
    if (existingArticle) {
      throw new Error(`Article with slug '${input.slug}' already exists`);
    }
    
    // Verify site exists
    const site = await this.prisma.site.findUnique({
      where: { id: input.siteId }
    });
    
    if (!site) {
      throw new Error('Site not found');
    }
    
    // Verify category exists if provided
    if (input.categoryId) {
      const category = await this.prisma.category.findUnique({
        where: { id: input.categoryId }
      });
      
      if (!category) {
        throw new Error('Category not found');
      }
    }
    
    const article = await this.prisma.article.create({
      data: {
        ...articleData,
        authorId,
        publishedAt: input.publishedAt ? new Date(input.publishedAt) : null,
        seoData: seoData ? {
          create: seoData
        } : undefined,
      },
      include: {
        author: {
          select: { id: true, name: true, email: true }
        },
        site: {
          select: { id: true, name: true, key: true }
        },
        category: {
          select: { id: true, name: true }
        },
        seoData: true,
        media: true,
      },
    });
    
    return article;
  }

  /**
   * Get articles with pagination and filtering
   */
  async getArticles(query: ArticleQuery) {
    const {
      page,
      limit,
      status,
      siteId,
      categoryId,
      search,
      sortBy,
      sortOrder,
    } = query;
    
    const skip = (page - 1) * limit;
    
    const where: any = {};
    
    if (status) {
      where.status = status;
    }
    
    if (siteId) {
      where.siteId = siteId;
    }
    
    if (categoryId) {
      where.categoryId = categoryId;
    }
    
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } },
        { excerpt: { contains: search, mode: 'insensitive' } },
      ];
    }
    
    const [articles, total] = await Promise.all([
      this.prisma.article.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          author: {
            select: { id: true, name: true, email: true }
          },
          site: {
            select: { id: true, name: true, key: true }
          },
          category: {
            select: { id: true, name: true }
          },
          seoData: true,
          media: true,
        },
      }),
      this.prisma.article.count({ where }),
    ]);
    
    return {
      articles,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get an article by ID
   */
  async getArticleById(id: string) {
    const article = await this.prisma.article.findUnique({
      where: { id },
      include: {
        author: {
          select: { id: true, name: true, email: true }
        },
        site: {
          select: { id: true, name: true, key: true }
        },
        category: {
          select: { id: true, name: true }
        },
        seoData: true,
        media: true,
      },
    });
    
    if (!article) {
      throw new Error('Article not found');
    }
    
    return article;
  }

  /**
   * Get an article by slug
   */
  async getArticleBySlug(slug: string) {
    const article = await this.prisma.article.findUnique({
      where: { slug },
      include: {
        author: {
          select: { id: true, name: true, email: true }
        },
        site: {
          select: { id: true, name: true, key: true }
        },
        category: {
          select: { id: true, name: true }
        },
        seoData: true,
        media: true,
      },
    });
    
    if (!article) {
      throw new Error('Article not found');
    }
    
    return article;
  }

  /**
   * Update an article
   */
  async updateArticle(id: string, input: UpdateArticleInput, authorId: string) {
    const { seoData, ...articleData } = input;
    
    // Check if article exists and user has permission
    const existingArticle = await this.prisma.article.findUnique({
      where: { id },
      include: { seoData: true }
    });
    
    if (!existingArticle) {
      throw new Error('Article not found');
    }
    
    // Check if slug is unique (if being updated)
    if (input.slug && input.slug !== existingArticle.slug) {
      const slugExists = await this.prisma.article.findUnique({
        where: { slug: input.slug }
      });
      
      if (slugExists) {
        throw new Error(`Article with slug '${input.slug}' already exists`);
      }
    }
    
    // Verify category exists if provided
    if (input.categoryId) {
      const category = await this.prisma.category.findUnique({
        where: { id: input.categoryId }
      });
      
      if (!category) {
        throw new Error('Category not found');
      }
    }
    
    const updateData: any = {
      ...articleData,
      publishedAt: input.publishedAt ? new Date(input.publishedAt) : undefined,
    };
    
    // Handle SEO data update
    if (seoData) {
      if (existingArticle.seoData) {
        updateData.seoData = {
          update: seoData
        };
      } else {
        updateData.seoData = {
          create: seoData
        };
      }
    }
    
    const article = await this.prisma.article.update({
      where: { id },
      data: updateData,
      include: {
        author: {
          select: { id: true, name: true, email: true }
        },
        site: {
          select: { id: true, name: true, key: true }
        },
        category: {
          select: { id: true, name: true }
        },
        seoData: true,
        media: true,
      },
    });
    
    return article;
  }

  /**
   * Delete an article
   */
  async deleteArticle(id: string, authorId: string) {
    const article = await this.prisma.article.findUnique({
      where: { id }
    });
    
    if (!article) {
      throw new Error('Article not found');
    }
    
    await this.prisma.article.delete({
      where: { id }
    });
    
    return { success: true };
  }

  /**
   * Publish an article
   */
  async publishArticle(id: string, authorId: string) {
    const article = await this.prisma.article.findUnique({
      where: { id }
    });
    
    if (!article) {
      throw new Error('Article not found');
    }
    
    const updatedArticle = await this.prisma.article.update({
      where: { id },
      data: {
        status: ArticleStatus.PUBLISHED,
        publishedAt: new Date(),
      },
      include: {
        author: {
          select: { id: true, name: true, email: true }
        },
        site: {
          select: { id: true, name: true, key: true }
        },
        category: {
          select: { id: true, name: true }
        },
        seoData: true,
        media: true,
      },
    });
    
    return updatedArticle;
  }
}
