
'use client';

import { AIConfigForm } from '@/components/ai/AIConfigForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, Zap, Settings } from 'lucide-react';

export default function AIConfigPage() {
  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">AI Configuration</h1>
        <p className="text-muted-foreground">
          Configure AI providers for content generation and analysis. Set up multiple providers for redundancy and optimal performance.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-5 h-5 text-green-500" />
              <h3 className="font-semibold">Secure Storage</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              API keys are encrypted and stored securely. Never exposed in client-side code.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-5 h-5 text-blue-500" />
              <h3 className="font-semibold">Multi-Provider</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Support for OpenAI, Anthropic, Google AI, and local models with automatic fallback.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <Settings className="w-5 h-5 text-purple-500" />
              <h3 className="font-semibold">Fine-tuning</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Adjust temperature, tokens, and other parameters for optimal content generation.
            </p>
          </CardContent>
        </Card>
      </div>

      <Alert>
        <Shield className="h-4 w-4" />
        <AlertDescription>
          <strong>Security Notice:</strong> API keys are encrypted before storage and never transmitted to the client. 
          Each provider is tested before activation to ensure proper configuration.
        </AlertDescription>
      </Alert>

      <AIConfigForm />
    </div>
  );
}
