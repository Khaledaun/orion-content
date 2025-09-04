
import { NextRequest } from 'next/server';
import { getCredentials, createCredential } from '../../../../src/modules/credentials/controller';

/**
 * Admin Credentials API Routes
 * Phase 1: Content Management System
 */

export async function GET(req: NextRequest) {
  return getCredentials(req);
}

export async function POST(req: NextRequest) {
  return createCredential(req);
}
