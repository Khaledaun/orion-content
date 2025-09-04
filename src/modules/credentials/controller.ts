
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { CredentialService } from './service';
import { CreateCredentialDto, UpdateCredentialDto, TestCredentialDto } from './dto';
import { redactSensitiveData } from '../../logging/redactor';

/**
 * Credential Controller for API endpoints
 * Phase 1: Content Management System
 */

const prisma = new PrismaClient();
const credentialService = new CredentialService(prisma);

/**
 * GET /api/admin/credentials - List all credentials
 */
export async function getCredentials(req: NextRequest) {
  try {
    const credentials = await credentialService.getAllCredentials();
    
    console.log(`[CREDENTIALS] Listed ${credentials.length} credentials`);
    
    return NextResponse.json({
      success: true,
      data: credentials,
    });
  } catch (error) {
    console.error('[CREDENTIALS] Error listing credentials:', redactSensitiveData(error));
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to list credentials',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/credentials - Create a new credential
 */
export async function createCredential(req: NextRequest) {
  try {
    const body = await req.json();
    const input = CreateCredentialDto.parse(body);
    
    const credential = await credentialService.createCredential(input);
    
    console.log(`[CREDENTIALS] Created credential: ${credential.name} (${credential.key})`);
    
    return NextResponse.json({
      success: true,
      data: credential,
    }, { status: 201 });
  } catch (error) {
    console.error('[CREDENTIALS] Error creating credential:', redactSensitiveData(error));
    
    const message = error instanceof Error ? error.message : 'Failed to create credential';
    const status = message.includes('already exists') ? 409 : 500;
    
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
 * GET /api/admin/credentials/[id] - Get a specific credential
 */
export async function getCredential(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const credential = await credentialService.getCredentialById(params.id);
    
    return NextResponse.json({
      success: true,
      data: credential,
    });
  } catch (error) {
    console.error(`[CREDENTIALS] Error getting credential ${params.id}:`, redactSensitiveData(error));
    
    const message = error instanceof Error ? error.message : 'Failed to get credential';
    const status = message === 'Credential not found' ? 404 : 500;
    
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
 * PUT /api/admin/credentials/[id] - Update a credential
 */
export async function updateCredential(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const input = UpdateCredentialDto.parse(body);
    
    const credential = await credentialService.updateCredential(params.id, input);
    
    console.log(`[CREDENTIALS] Updated credential: ${credential.name} (${credential.key})`);
    
    return NextResponse.json({
      success: true,
      data: credential,
    });
  } catch (error) {
    console.error(`[CREDENTIALS] Error updating credential ${params.id}:`, redactSensitiveData(error));
    
    const message = error instanceof Error ? error.message : 'Failed to update credential';
    const status = message === 'Credential not found' ? 404 : 
                   message.includes('already exists') ? 409 : 500;
    
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
 * DELETE /api/admin/credentials/[id] - Delete a credential
 */
export async function deleteCredential(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await credentialService.deleteCredential(params.id);
    
    console.log(`[CREDENTIALS] Deleted credential: ${params.id}`);
    
    return NextResponse.json({
      success: true,
      message: 'Credential deleted successfully',
    });
  } catch (error) {
    console.error(`[CREDENTIALS] Error deleting credential ${params.id}:`, redactSensitiveData(error));
    
    const message = error instanceof Error ? error.message : 'Failed to delete credential';
    const status = message === 'Credential not found' ? 404 : 500;
    
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
 * POST /api/admin/credentials/test - Test a credential
 */
export async function testCredential(req: NextRequest) {
  try {
    const body = await req.json();
    const input = TestCredentialDto.parse(body);
    
    const result = await credentialService.testCredential(input.key, input.testEndpoint);
    
    console.log(`[CREDENTIALS] Tested credential: ${input.key} - ${result.success ? 'SUCCESS' : 'FAILED'}`);
    
    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('[CREDENTIALS] Error testing credential:', redactSensitiveData(error));
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to test credential',
      },
      { status: 500 }
    );
  }
}
