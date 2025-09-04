
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { ArticleService } from './service';
import { CreateArticleDto, UpdateArticleDto, ArticleQueryDto } from './entity';
import { redactSensitiveData } from '../../logging/redactor';

/**
 * Article Controller for API endpoints
 * Phase 1: Content Management System
 */

const prisma = new PrismaClient();
const articleService = new ArticleService(prisma);

/**
 * GET /api/articles - List articles with pagination and filtering
 */
export async function getArticles(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = ArticleQueryDto.parse(Object.fromEntries(searchParams));
    
    const result = await articleService.getArticles(query);
    
    console.log(`[ARTICLES] Listed ${result.articles.length} articles (page ${query.page})`);
    
    return NextResponse.json({
      success: true,
      data: result.articles,
      pagination: result.pagination,
    });
  } catch (error) {
    console.error('[ARTICLES] Error listing articles:', redactSensitiveData(error));
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to list articles',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/articles - Create a new article
 */
export async function createArticle(req: NextRequest) {
  try {
    const body = await req.json();
    const input = CreateArticleDto.parse(body);
    
    // TODO: Get authorId from session/auth
    const authorId = 'temp-author-id'; // This should come from authenticated user
    
    const article = await articleService.createArticle(input, authorId);
    
    console.log(`[ARTICLES] Created article: ${article.title} (${article.slug})`);
    
    return NextResponse.json({
      success: true,
      data: article,
    }, { status: 201 });
  } catch (error) {
    console.error('[ARTICLES] Error creating article:', redactSensitiveData(error));
    
    const message = error instanceof Error ? error.message : 'Failed to create article';
    const status = message.includes('already exists') ? 409 : 
                   message.includes('not found') ? 404 : 500;
    
    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status }
    );
  }
}

/**
 * GET /api/articles/[id] - Get a specific article
 */
export async function getArticle(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const article = await articleService.getArticleById(params.id);
    
    return NextResponse.json({
      success: true,
      data: article,
    });
  } catch (error) {
    console.error(`[ARTICLES] Error getting article ${params.id}:`, redactSensitiveData(error));
    
    const message = error instanceof Error ? error.message : 'Failed to get article';
    const status = message === 'Article not found' ? 404 : 500;
    
    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status }
    );
  }
}

/**
 * PUT /api/articles/[id] - Update an article
 */
export async function updateArticle(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const input = UpdateArticleDto.parse(body);
    
    // TODO: Get authorId from session/auth
    const authorId = 'temp-author-id'; // This should come from authenticated user
    
    const article = await articleService.updateArticle(params.id, input, authorId);
    
    console.log(`[ARTICLES] Updated article: ${article.title} (${article.slug})`);
    
    return NextResponse.json({
      success: true,
      data: article,
    });
  } catch (error) {
    console.error(`[ARTICLES] Error updating article ${params.id}:`, redactSensitiveData(error));
    
    const message = error instanceof Error ? error.message : 'Failed to update article';
    const status = message === 'Article not found' ? 404 : 
                   message.includes('already exists') ? 409 : 
                   message.includes('not found') ? 404 : 500;
    
    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status }
    );
  }
}

/**
 * DELETE /api/articles/[id] - Delete an article
 */
export async function deleteArticle(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    // TODO: Get authorId from session/auth
    const authorId = 'temp-author-id'; // This should come from authenticated user
    
    await articleService.deleteArticle(params.id, authorId);
    
    console.log(`[ARTICLES] Deleted article: ${params.id}`);
    
    return NextResponse.json({
      success: true,
      message: 'Article deleted successfully',
    });
  } catch (error) {
    console.error(`[ARTICLES] Error deleting article ${params.id}:`, redactSensitiveData(error));
    
    const message = error instanceof Error ? error.message : 'Failed to delete article';
    const status = message === 'Article not found' ? 404 : 500;
    
    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status }
    );
  }
}

/**
 * POST /api/articles/[id]/publish - Publish an article
 */
export async function publishArticle(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    // TODO: Get authorId from session/auth
    const authorId = 'temp-author-id'; // This should come from authenticated user
    
    const article = await articleService.publishArticle(params.id, authorId);
    
    console.log(`[ARTICLES] Published article: ${article.title} (${article.slug})`);
    
    return NextResponse.json({
      success: true,
      data: article,
    });
  } catch (error) {
    console.error(`[ARTICLES] Error publishing article ${params.id}:`, redactSensitiveData(error));
    
    const message = error instanceof Error ? error.message : 'Failed to publish article';
    const status = message === 'Article not found' ? 404 : 500;
    
    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status }
    );
  }
}

/**
 * GET /api/articles/slug/[slug] - Get article by slug
 */
export async function getArticleBySlug(req: NextRequest, { params }: { params: { slug: string } }) {
  try {
    const article = await articleService.getArticleBySlug(params.slug);
    
    return NextResponse.json({
      success: true,
      data: article,
    });
  } catch (error) {
    console.error(`[ARTICLES] Error getting article by slug ${params.slug}:`, redactSensitiveData(error));
    
    const message = error instanceof Error ? error.message : 'Failed to get article';
    const status = message === 'Article not found' ? 404 : 500;
    
    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status }
    );
  }
}
