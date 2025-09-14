
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server';
import { ga4OAuth } from '@/lib/integrations';

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
    const { siteId, integration } = await ga4OAuth.handleCallback(code, state);

    return NextResponse.redirect(
      new URL(`/sites/${siteId}/integrations?ga4=connected`, req.url)
    );

  } catch (error) {
    console.error('GA4 callback error:', error);
    
    return NextResponse.redirect(
      new URL(`/integrations?error=${encodeURIComponent('connection_failed')}`, req.url)
    );
  }
}
