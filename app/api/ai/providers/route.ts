
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { aiService } from '@/lib/ai/service';
import { AIProviderConfigSchema } from '@/lib/ai/types';
import { encryptString } from '@/lib/crypto-gcm';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get configured providers (without exposing API keys)
    const providers = aiService.listProviders().map(name => ({
      name,
      config: {
        provider: 'configured', // Don't expose actual provider type
        model: 'configured', // Don't expose actual model
      }
    }));

    return NextResponse.json({ providers });
  } catch (error) {
    console.error('Failed to get AI providers:', error);
    return NextResponse.json(
      { error: 'Failed to get AI providers' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = AIProviderConfigSchema.parse(body);

    // Encrypt the API key before storing
    const encryptedApiKey = validatedData.apiKey ? encryptString(validatedData.apiKey) : undefined;

    // Add provider to AI service
    aiService.addProvider(validatedData.name, {
      ...validatedData,
      apiKey: validatedData.apiKey, // Use original key for service
    });

    // TODO: Store encrypted configuration in database
    // For now, we'll just confirm the provider was added
    
    return NextResponse.json({ 
      message: 'AI provider configured successfully',
      name: validatedData.name 
    });
  } catch (error) {
    console.error('Failed to configure AI provider:', error);
    return NextResponse.json(
      { error: 'Failed to configure AI provider' },
      { status: 500 }
    );
  }
}
