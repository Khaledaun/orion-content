
export * from './ga4-oauth';
export * from './gsc-oauth';

import { GA4OAuthService } from './ga4-oauth';
import { GSCOAuthService } from './gsc-oauth';

// Initialize services with environment variables
const ga4Config = {
  clientId: process.env.GOOGLE_CLIENT_ID || '',
  clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  redirectUri: `${process.env.NEXTAUTH_URL}/api/integrations/ga4/callback`
};

const gscConfig = {
  clientId: process.env.GOOGLE_CLIENT_ID || '',
  clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  redirectUri: `${process.env.NEXTAUTH_URL}/api/integrations/gsc/callback`
};

export const ga4OAuth = new GA4OAuthService(ga4Config);
export const gscOAuth = new GSCOAuthService(gscConfig);
