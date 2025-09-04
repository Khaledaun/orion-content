
import { NextRequest } from 'next/server';
import { getCredential, updateCredential, deleteCredential } from '../../../../../src/modules/credentials/controller';

/**
 * Admin Credentials API Routes - Individual Credential
 * Phase 1: Content Management System
 */

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  return getCredential(req, { params });
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  return updateCredential(req, { params });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  return deleteCredential(req, { params });
}
