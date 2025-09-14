
'use client';

import { ContentGenerator } from '@/components/ai/ContentGenerator';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Lightbulb, Wand2, BarChart3 } from 'lucide-react';

export default function ContentGeneratorPage() {
  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">AI Content Generator</h1>
        <p className="text-muted-foreground">
          Generate high-quality content using AI. Create blog posts, social media content, emails, and more with intelligent assistance.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <Wand2 className="w-5 h-5 text-purple-500" />
              <h3 className="font-semibold">AI-Powered</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Leverage advanced AI models to create engaging, original content tailored to your needs.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="w-5 h-5 text-green-500" />
              <h3 className="font-semibold">SEO Optimized</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Generated content includes SEO scoring and readability analysis for better performance.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <Lightbulb className="w-5 h-5 text-yellow-500" />
              <h3 className="font-semibold">Multi-Format</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Create content for blogs, social media, emails, product descriptions, and more.
            </p>
          </CardContent>
        </Card>
      </div>

      <Alert>
        <Lightbulb className="h-4 w-4" />
        <AlertDescription>
          <strong>Pro Tip:</strong> Use specific keywords and detailed descriptions to get the best results. 
          The AI performs better with clear, detailed instructions about your target audience and goals.
        </AlertDescription>
      </Alert>

      <ContentGenerator />
    </div>
  );
}
