
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { aiService } from '@/lib/ai/service';
import { ContentGenerationRequestSchema } from '@/lib/ai/types';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { provider, ...requestData } = body;
    
    const validatedData = ContentGenerationRequestSchema.parse(requestData);

    const response = await aiService.generateContentFromRequest(
      validatedData,
      provider
    );

    return NextResponse.json(response);
  } catch (error) {
    console.error('Failed to generate content:', error);
    return NextResponse.json(
      { error: 'Failed to generate content', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
