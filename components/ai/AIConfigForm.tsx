
'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Trash2, Plus, Eye, EyeOff, TestTube } from 'lucide-react';
import { AIProvider, AIProviderConfig } from '@/lib/ai/types';
import { AIService } from '@/lib/ai/service';
import { toast } from 'sonner';

const configSchema = z.object({
  name: z.string().min(1, 'Provider name is required'),
  provider: z.enum(['openai', 'anthropic', 'google', 'local']),
  apiKey: z.string().min(1, 'API key is required'),
  model: z.string().min(1, 'Model is required'),
  temperature: z.number().min(0).max(2),
  maxTokens: z.number().min(1).max(8000),
  topP: z.number().min(0).max(1),
  frequencyPenalty: z.number().min(-2).max(2),
  presencePenalty: z.number().min(-2).max(2),
});

type ConfigFormData = z.infer<typeof configSchema>;

interface AIConfigFormProps {
  onConfigSaved?: () => void;
}

export function AIConfigForm({ onConfigSaved }: AIConfigFormProps) {
  const [providers, setProviders] = useState<Array<{ name: string; config: AIProviderConfig }>>([]);
  const [showApiKey, setShowApiKey] = useState<Record<string, boolean>>({});
  const [isTestingProvider, setIsTestingProvider] = useState<string | null>(null);
  const [availableModels, setAvailableModels] = useState<string[]>([]);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ConfigFormData>({
    resolver: zodResolver(configSchema),
    defaultValues: {
      temperature: 0.7,
      maxTokens: 2000,
      topP: 1,
      frequencyPenalty: 0,
      presencePenalty: 0,
    },
  });

  const selectedProvider = watch('provider');

  useEffect(() => {
    loadProviders();
  }, []);

  useEffect(() => {
    if (selectedProvider) {
      const models = AIService.getAvailableModels(selectedProvider);
      setAvailableModels(models);
      if (models.length > 0) {
        setValue('model', models[0]);
      }
    }
  }, [selectedProvider, setValue]);

  const loadProviders = async () => {
    try {
      const response = await fetch('/api/ai/providers');
      if (response.ok) {
        const data = await response.json();
        setProviders(data.providers || []);
      }
    } catch (error) {
      console.error('Failed to load providers:', error);
    }
  };

  const onSubmit = async (data: ConfigFormData) => {
    try {
      const response = await fetch('/api/ai/providers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Failed to save provider configuration');
      }

      toast.success('AI provider configured successfully');
      reset();
      loadProviders();
      onConfigSaved?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save configuration');
    }
  };

  const deleteProvider = async (name: string) => {
    try {
      const response = await fetch(`/api/ai/providers/${name}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete provider');
      }

      toast.success('Provider deleted successfully');
      loadProviders();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete provider');
    }
  };

  const testProvider = async (name: string) => {
    setIsTestingProvider(name);
    try {
      const response = await fetch(`/api/ai/providers/${name}/test`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Provider test failed');
      }

      const result = await response.json();
      toast.success(`Provider test successful: ${result.message}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Provider test failed');
    } finally {
      setIsTestingProvider(null);
    }
  };

  const toggleApiKeyVisibility = (providerName: string) => {
    setShowApiKey(prev => ({
      ...prev,
      [providerName]: !prev[providerName],
    }));
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>AI Provider Configuration</CardTitle>
          <CardDescription>
            Configure AI providers for content generation and analysis. API keys are encrypted and stored securely.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="add" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="add">Add Provider</TabsTrigger>
              <TabsTrigger value="manage">Manage Providers</TabsTrigger>
            </TabsList>

            <TabsContent value="add" className="space-y-4">
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Provider Name</Label>
                    <Input
                      id="name"
                      placeholder="e.g., OpenAI Production"
                      {...register('name')}
                    />
                    {errors.name && (
                      <p className="text-sm text-red-500">{errors.name.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="provider">Provider Type</Label>
                    <Select onValueChange={(value) => setValue('provider', value as AIProvider)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select provider" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="openai">OpenAI</SelectItem>
                        <SelectItem value="anthropic">Anthropic</SelectItem>
                        <SelectItem value="google">Google AI</SelectItem>
                        <SelectItem value="local">Local Model</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.provider && (
                      <p className="text-sm text-red-500">{errors.provider.message}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="apiKey">API Key</Label>
                  <Input
                    id="apiKey"
                    type="password"
                    placeholder="Enter your API key"
                    {...register('apiKey')}
                  />
                  {errors.apiKey && (
                    <p className="text-sm text-red-500">{errors.apiKey.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="model">Model</Label>
                  <Select onValueChange={(value) => setValue('model', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select model" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableModels.map((model) => (
                        <SelectItem key={model} value={model}>
                          {model}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.model && (
                    <p className="text-sm text-red-500">{errors.model.message}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Temperature: {watch('temperature')}</Label>
                    <Slider
                      value={[watch('temperature')]}
                      onValueChange={(value) => setValue('temperature', value[0])}
                      max={2}
                      min={0}
                      step={0.1}
                      className="w-full"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Max Tokens: {watch('maxTokens')}</Label>
                    <Slider
                      value={[watch('maxTokens')]}
                      onValueChange={(value) => setValue('maxTokens', value[0])}
                      max={8000}
                      min={100}
                      step={100}
                      className="w-full"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Top P: {watch('topP')}</Label>
                    <Slider
                      value={[watch('topP')]}
                      onValueChange={(value) => setValue('topP', value[0])}
                      max={1}
                      min={0}
                      step={0.1}
                      className="w-full"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Frequency Penalty: {watch('frequencyPenalty')}</Label>
                    <Slider
                      value={[watch('frequencyPenalty')]}
                      onValueChange={(value) => setValue('frequencyPenalty', value[0])}
                      max={2}
                      min={-2}
                      step={0.1}
                      className="w-full"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Presence Penalty: {watch('presencePenalty')}</Label>
                    <Slider
                      value={[watch('presencePenalty')]}
                      onValueChange={(value) => setValue('presencePenalty', value[0])}
                      max={2}
                      min={-2}
                      step={0.1}
                      className="w-full"
                    />
                  </div>
                </div>

                <Button type="submit" disabled={isSubmitting} className="w-full">
                  <Plus className="w-4 h-4 mr-2" />
                  {isSubmitting ? 'Adding Provider...' : 'Add Provider'}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="manage" className="space-y-4">
              {providers.length === 0 ? (
                <Alert>
                  <AlertDescription>
                    No AI providers configured. Add a provider to get started.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-4">
                  {providers.map((provider) => (
                    <Card key={provider.name}>
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold">{provider.name}</h3>
                              <Badge variant="secondary">{provider.config.provider}</Badge>
                              <Badge variant="outline">{provider.config.model}</Badge>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span>Temp: {provider.config.temperature}</span>
                              <span>Max Tokens: {provider.config.maxTokens}</span>
                              <div className="flex items-center gap-1">
                                <span>API Key:</span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => toggleApiKeyVisibility(provider.name)}
                                >
                                  {showApiKey[provider.name] ? (
                                    <>
                                      <EyeOff className="w-3 h-3 mr-1" />
                                      {provider.config.apiKey}
                                    </>
                                  ) : (
                                    <>
                                      <Eye className="w-3 h-3 mr-1" />
                                      ••••••••
                                    </>
                                  )}
                                </Button>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => testProvider(provider.name)}
                              disabled={isTestingProvider === provider.name}
                            >
                              <TestTube className="w-4 h-4 mr-1" />
                              {isTestingProvider === provider.name ? 'Testing...' : 'Test'}
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => deleteProvider(provider.name)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
