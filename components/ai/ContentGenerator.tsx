
'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Wand2, Copy, Download, RefreshCw, Sparkles, BarChart3 } from 'lucide-react';
import { ContentGenerationRequestSchema, ContentGenerationRequest, ContentGenerationResponse } from '@/lib/ai/types';
import { toast } from 'sonner';

type FormData = ContentGenerationRequest;

interface ContentGeneratorProps {
  onContentGenerated?: (content: ContentGenerationResponse) => void;
}

export function ContentGenerator({ onContentGenerated }: ContentGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<ContentGenerationResponse | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<string>('');
  const [availableProviders, setAvailableProviders] = useState<string[]>([]);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(ContentGenerationRequestSchema),
    defaultValues: {
      type: 'blog',
      tone: 'professional',
      length: 'medium',
      language: 'en',
    },
  });

  React.useEffect(() => {
    loadAvailableProviders();
  }, []);

  const loadAvailableProviders = async () => {
    try {
      const response = await fetch('/api/ai/providers');
      if (response.ok) {
        const data = await response.json();
        const providers = data.providers?.map((p: any) => p.name) || [];
        setAvailableProviders(providers);
        if (providers.length > 0) {
          setSelectedProvider(providers[0]);
        }
      }
    } catch (error) {
      console.error('Failed to load providers:', error);
    }
  };

  const onSubmit = async (data: FormData) => {
    if (!selectedProvider) {
      toast.error('Please select an AI provider');
      return;
    }

    setIsGenerating(true);
    try {
      const response = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          provider: selectedProvider,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate content');
      }

      const result: ContentGenerationResponse = await response.json();
      setGeneratedContent(result);
      onContentGenerated?.(result);
      toast.success('Content generated successfully!');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to generate content');
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Content copied to clipboard');
    } catch (error) {
      toast.error('Failed to copy content');
    }
  };

  const downloadContent = () => {
    if (!generatedContent) return;

    const blob = new Blob([generatedContent.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `generated-content-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const regenerateContent = () => {
    handleSubmit(onSubmit)();
  };

  const keywordsValue = watch('keywords');
  const keywordsArray = keywordsValue || [];

  const addKeyword = (keyword: string) => {
    if (keyword.trim() && !keywordsArray.includes(keyword.trim())) {
      setValue('keywords', [...keywordsArray, keyword.trim()]);
    }
  };

  const removeKeyword = (index: number) => {
    const newKeywords = keywordsArray.filter((_, i) => i !== index);
    setValue('keywords', newKeywords);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wand2 className="w-5 h-5" />
            AI Content Generator
          </CardTitle>
          <CardDescription>
            Generate high-quality content using AI. Configure your requirements and let AI create engaging content for you.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="generate" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="generate">Generate Content</TabsTrigger>
              <TabsTrigger value="result" disabled={!generatedContent}>
                View Result
              </TabsTrigger>
            </TabsList>

            <TabsContent value="generate" className="space-y-4">
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="provider">AI Provider</Label>
                    <Select value={selectedProvider} onValueChange={setSelectedProvider}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select AI provider" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableProviders.map((provider) => (
                          <SelectItem key={provider} value={provider}>
                            {provider}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="type">Content Type</Label>
                    <Select onValueChange={(value) => setValue('type', value as any)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select content type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="blog">Blog Post</SelectItem>
                        <SelectItem value="social">Social Media</SelectItem>
                        <SelectItem value="email">Email</SelectItem>
                        <SelectItem value="seo">SEO Content</SelectItem>
                        <SelectItem value="product">Product Description</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.type && (
                      <p className="text-sm text-red-500">{errors.type.message}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="topic">Topic</Label>
                  <Input
                    id="topic"
                    placeholder="Enter the main topic or subject"
                    {...register('topic')}
                  />
                  {errors.topic && (
                    <p className="text-sm text-red-500">{errors.topic.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Keywords</Label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {keywordsArray.map((keyword, index) => (
                      <Badge
                        key={index}
                        variant="secondary"
                        className="cursor-pointer"
                        onClick={() => removeKeyword(index)}
                      >
                        {keyword} ×
                      </Badge>
                    ))}
                  </div>
                  <Input
                    placeholder="Type a keyword and press Enter"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addKeyword(e.currentTarget.value);
                        e.currentTarget.value = '';
                      }
                    }}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="tone">Tone</Label>
                    <Select onValueChange={(value) => setValue('tone', value as any)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select tone" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="professional">Professional</SelectItem>
                        <SelectItem value="casual">Casual</SelectItem>
                        <SelectItem value="friendly">Friendly</SelectItem>
                        <SelectItem value="formal">Formal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="length">Length</Label>
                    <Select onValueChange={(value) => setValue('length', value as any)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select length" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="short">Short (200-400 words)</SelectItem>
                        <SelectItem value="medium">Medium (400-800 words)</SelectItem>
                        <SelectItem value="long">Long (800-1500 words)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="language">Language</Label>
                    <Select onValueChange={(value) => setValue('language', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select language" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="es">Spanish</SelectItem>
                        <SelectItem value="fr">French</SelectItem>
                        <SelectItem value="de">German</SelectItem>
                        <SelectItem value="it">Italian</SelectItem>
                        <SelectItem value="pt">Portuguese</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="targetAudience">Target Audience (Optional)</Label>
                  <Input
                    id="targetAudience"
                    placeholder="e.g., Small business owners, Tech enthusiasts"
                    {...register('targetAudience')}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="customPrompt">Custom Instructions (Optional)</Label>
                  <Textarea
                    id="customPrompt"
                    placeholder="Any specific instructions or requirements..."
                    rows={3}
                    {...register('customPrompt')}
                  />
                </div>

                <Button
                  type="submit"
                  disabled={isGenerating || availableProviders.length === 0}
                  className="w-full"
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Generating Content...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Generate Content
                    </>
                  )}
                </Button>

                {availableProviders.length === 0 && (
                  <Alert>
                    <AlertDescription>
                      No AI providers configured. Please configure at least one AI provider to generate content.
                    </AlertDescription>
                  </Alert>
                )}
              </form>
            </TabsContent>

            <TabsContent value="result" className="space-y-4">
              {generatedContent && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Generated Content</h3>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(generatedContent.content)}
                      >
                        <Copy className="w-4 h-4 mr-1" />
                        Copy
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={downloadContent}
                      >
                        <Download className="w-4 h-4 mr-1" />
                        Download
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={regenerateContent}
                        disabled={isGenerating}
                      >
                        <RefreshCw className="w-4 h-4 mr-1" />
                        Regenerate
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-4 mb-4">
                    <Card>
                      <CardContent className="pt-4">
                        <div className="text-2xl font-bold">{generatedContent.wordCount}</div>
                        <p className="text-xs text-muted-foreground">Words</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4">
                        <div className="text-2xl font-bold">{generatedContent.estimatedReadTime}m</div>
                        <p className="text-xs text-muted-foreground">Read Time</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4">
                        <div className="flex items-center gap-2">
                          <div className="text-2xl font-bold">{generatedContent.seoScore}</div>
                          <BarChart3 className="w-4 h-4 text-green-500" />
                        </div>
                        <p className="text-xs text-muted-foreground">SEO Score</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4">
                        <div className="text-2xl font-bold">{generatedContent.readabilityScore}</div>
                        <p className="text-xs text-muted-foreground">Readability</p>
                      </CardContent>
                    </Card>
                  </div>

                  <Card>
                    <CardContent className="pt-4">
                      <div className="prose max-w-none">
                        <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
                          {generatedContent.content}
                        </pre>
                      </div>
                    </CardContent>
                  </Card>

                  {generatedContent.tags && generatedContent.tags.length > 0 && (
                    <div className="space-y-2">
                      <Label>Suggested Tags</Label>
                      <div className="flex flex-wrap gap-2">
                        {generatedContent.tags.map((tag, index) => (
                          <Badge key={index} variant="outline">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
