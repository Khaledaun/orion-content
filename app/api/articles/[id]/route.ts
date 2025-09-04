
import { NextRequest } from 'next/server';
import { getArticle, updateArticle, deleteArticle } from '../../../../src/modules/articles/controller';

/**
 * Articles API Routes - Individual Article
 * Phase 1: Content Management System
 */

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  return getArticle(req, { params });
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  return updateArticle(req, { params });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  return deleteArticle(req, { params });
}
