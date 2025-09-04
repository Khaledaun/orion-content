
import { NextRequest } from 'next/server';
import { testCredential } from '../../../../../src/modules/credentials/controller';

/**
 * Admin Credentials Test API Route
 * Phase 1: Content Management System
 */

export async function POST(req: NextRequest) {
  return testCredential(req);
}
