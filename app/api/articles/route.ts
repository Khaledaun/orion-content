
import { NextRequest } from 'next/server';
import { getArticles, createArticle } from '../../../src/modules/articles/controller';

/**
 * Articles API Routes
 * Phase 1: Content Management System
 */

export async function GET(req: NextRequest) {
  return getArticles(req);
}

export async function POST(req: NextRequest) {
  return createArticle(req);
}
