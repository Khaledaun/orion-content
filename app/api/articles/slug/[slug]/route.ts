
import { NextRequest } from 'next/server';
import { getArticleBySlug } from '../../../../../src/modules/articles/controller';

/**
 * Article by Slug API Route
 * Phase 1: Content Management System
 */

export async function GET(req: NextRequest, { params }: { params: { slug: string } }) {
  return getArticleBySlug(req, { params });
}
