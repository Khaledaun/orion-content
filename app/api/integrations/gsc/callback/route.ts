
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server';
import { gscOAuth } from '@/lib/integrations';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    if (error) {
      return NextResponse.redirect(
        new URL(`/integrations?error=${encodeURIComponent(error)}`, req.url)
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        new URL('/integrations?error=missing_parameters', req.url)
      );
    }

    // Handle OAuth callback
    const { siteId, integration } = await gscOAuth.handleCallback(code, state);

    return NextResponse.redirect(
      new URL(`/sites/${siteId}/integrations?gsc=connected`, req.url)
    );

  } catch (error) {
    console.error('GSC callback error:', error);
    
    return NextResponse.redirect(
      new URL(`/integrations?error=${encodeURIComponent('connection_failed')}`, req.url)
    );
  }
}
