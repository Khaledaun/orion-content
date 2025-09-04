
/**
 * Phase 1: Credentials API endpoints
 */
import { NextRequest, NextResponse } from 'next/server';
import { encryptData } from '@/lib/crypto';

export async function GET() {
  try {
    // In Phase 1, we'll return a simple response since we're using localStorage
    // This endpoint can be extended in future phases for server-side storage
    return NextResponse.json({
      message: 'Credentials API is available',
      phase: 1,
      storage: 'localStorage'
    });
  } catch (error) {
    console.error('Credentials API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, type, data, encryptionKey } = body;

    if (!name || !type || !data || !encryptionKey) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Encrypt the credential data
    const encrypted = await encryptData(data, encryptionKey);

    // In Phase 1, we'll just return the encrypted data
    // Future phases can store this in the database
    return NextResponse.json({
      success: true,
      encrypted,
      message: 'Credential encrypted successfully'
    });
  } catch (error) {
    console.error('Credential encryption error:', error);
    return NextResponse.json(
      { error: 'Failed to encrypt credential' },
      { status: 500 }
    );
  }
}
