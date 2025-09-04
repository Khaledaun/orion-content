
import { NextRequest } from 'next/server';
import { publishArticle } from '../../../../../src/modules/articles/controller';

/**
 * Article Publish API Route
 * Phase 1: Content Management System
 */

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  return publishArticle(req, { params });
}
