
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { aiService } from '@/lib/ai/service';

export async function POST(
  request: NextRequest,
  { params }: { params: { name: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name } = params;
    
    // Test the provider with a simple message
    const testMessage = [
      {
        role: 'user' as const,
        content: 'Hello! This is a test message. Please respond with "Test successful!"'
      }
    ];

    const response = await aiService.generateContent(testMessage, name);
    
    return NextResponse.json({ 
      message: 'Provider test successful',
      response: response.content.substring(0, 100) + '...',
      model: response.model,
      provider: response.provider
    });
  } catch (error) {
    console.error('Provider test failed:', error);
    return NextResponse.json(
      { error: 'Provider test failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
