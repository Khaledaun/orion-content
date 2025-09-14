
import { z } from 'zod';

// AI Provider Types
export type AIProvider = 'openai' | 'anthropic' | 'google' | 'local';

export interface AIProviderConfig {
  provider: AIProvider;
  apiKey?: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
}

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;
  provider: AIProvider;
}

export interface StreamingAIResponse {
  content: AsyncIterable<string>;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;
  provider: AIProvider;
}

// Content Generation Types
export interface ContentGenerationRequest {
  type: 'blog' | 'social' | 'email' | 'seo' | 'product';
  topic: string;
  keywords?: string[];
  tone?: 'professional' | 'casual' | 'friendly' | 'formal';
  length?: 'short' | 'medium' | 'long';
  language?: string;
  targetAudience?: string;
  customPrompt?: string;
}

export interface ContentGenerationResponse {
  content: string;
  title?: string;
  metaDescription?: string;
  tags?: string[];
  readabilityScore?: number;
  seoScore?: number;
  wordCount: number;
  estimatedReadTime: number;
}

// Analytics Types
export interface AnalyticsMetric {
  id: string;
  name: string;
  value: number;
  change: number;
  changeType: 'increase' | 'decrease' | 'neutral';
  period: string;
}

export interface ContentPerformance {
  contentId: string;
  title: string;
  views: number;
  engagement: number;
  shares: number;
  comments: number;
  conversionRate: number;
  publishedAt: Date;
  lastUpdated: Date;
}

// Workflow Types
export interface WorkflowStep {
  id: string;
  name: string;
  type: 'content_generation' | 'review' | 'approval' | 'publish' | 'analyze';
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  assignedTo?: string;
  dueDate?: Date;
  completedAt?: Date;
  metadata?: Record<string, any>;
}

export interface Workflow {
  id: string;
  name: string;
  description: string;
  steps: WorkflowStep[];
  status: 'draft' | 'active' | 'paused' | 'completed';
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

// Configuration Schemas
export const AIProviderConfigSchema = z.object({
  name: z.string().min(1, 'Provider name is required'),
  provider: z.enum(['openai', 'anthropic', 'google', 'local']),
  apiKey: z.string().optional(),
  model: z.string(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().positive().optional(),
  topP: z.number().min(0).max(1).optional(),
  frequencyPenalty: z.number().min(-2).max(2).optional(),
  presencePenalty: z.number().min(-2).max(2).optional(),
});

export const ContentGenerationRequestSchema = z.object({
  type: z.enum(['blog', 'social', 'email', 'seo', 'product']),
  topic: z.string().min(1),
  keywords: z.array(z.string()).optional(),
  tone: z.enum(['professional', 'casual', 'friendly', 'formal']).optional(),
  length: z.enum(['short', 'medium', 'long']).optional(),
  language: z.string().optional(),
  targetAudience: z.string().optional(),
  customPrompt: z.string().optional(),
});
