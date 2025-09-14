
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { AIService } from '@/lib/ai/service';
import { OpenAIProvider, AnthropicProvider, GoogleProvider } from '@/lib/ai/providers';

// Mock the providers
jest.mock('@/lib/ai/providers/openai');
jest.mock('@/lib/ai/providers/anthropic');
jest.mock('@/lib/ai/providers/google');

describe('AIService', () => {
  let aiService: AIService;

  beforeEach(() => {
    aiService = new AIService();
    jest.clearAllMocks();
  });

  describe('Provider Management', () => {
    it('should add a provider successfully', () => {
      const config = {
        provider: 'openai' as const,
        apiKey: 'test-key',
        model: 'gpt-4o-mini',
      };

      expect(() => {
        aiService.addProvider('test-openai', config);
      }).not.toThrow();

      expect(aiService.listProviders()).toContain('test-openai');
    });

    it('should remove a provider successfully', () => {
      const config = {
        provider: 'openai' as const,
        apiKey: 'test-key',
        model: 'gpt-4o-mini',
      };

      aiService.addProvider('test-openai', config);
      aiService.removeProvider('test-openai');

      expect(aiService.listProviders()).not.toContain('test-openai');
    });

    it('should set default provider', () => {
      const config = {
        provider: 'openai' as const,
        apiKey: 'test-key',
        model: 'gpt-4o-mini',
      };

      aiService.addProvider('test-openai', config);
      aiService.setDefaultProvider('test-openai');

      expect(() => {
        aiService.getProvider();
      }).not.toThrow();
    });

    it('should throw error for unsupported provider', () => {
      const config = {
        provider: 'unsupported' as any,
        apiKey: 'test-key',
        model: 'test-model',
      };

      expect(() => {
        aiService.addProvider('test-unsupported', config);
      }).toThrow('Unsupported provider: unsupported');
    });
  });

  describe('Content Generation', () => {
    beforeEach(() => {
      const mockProvider = {
        generateContent: jest.fn().mockResolvedValue({
          content: 'Generated content',
          model: 'gpt-4o-mini',
          provider: 'openai',
          usage: {
            promptTokens: 10,
            completionTokens: 20,
            totalTokens: 30,
          },
        }),
        validateConfig: jest.fn().mockReturnValue(true),
      };

      (OpenAIProvider as jest.MockedClass<typeof OpenAIProvider>).mockImplementation(
        () => mockProvider as any
      );

      const config = {
        provider: 'openai' as const,
        apiKey: 'test-key',
        model: 'gpt-4o-mini',
      };

      aiService.addProvider('test-openai', config);
    });

    it('should generate content successfully', async () => {
      const messages = [
        { role: 'user' as const, content: 'Hello, world!' },
      ];

      const response = await aiService.generateContent(messages, 'test-openai');

      expect(response).toEqual({
        content: 'Generated content',
        model: 'gpt-4o-mini',
        provider: 'openai',
        usage: {
          promptTokens: 10,
          completionTokens: 20,
          totalTokens: 30,
        },
      });
    });

    it('should generate content from request', async () => {
      const request = {
        type: 'blog' as const,
        topic: 'AI in content creation',
        tone: 'professional' as const,
        length: 'medium' as const,
      };

      const response = await aiService.generateContentFromRequest(request, 'test-openai');

      expect(response).toHaveProperty('content');
      expect(response).toHaveProperty('wordCount');
      expect(response).toHaveProperty('estimatedReadTime');
      expect(response).toHaveProperty('seoScore');
      expect(response).toHaveProperty('readabilityScore');
    });
  });

  describe('Fallback Logic', () => {
    it('should use fallback providers when primary fails', async () => {
      const failingProvider = {
        generateContent: jest.fn().mockRejectedValue(new Error('API Error')),
        validateConfig: jest.fn().mockReturnValue(true),
      };

      const workingProvider = {
        generateContent: jest.fn().mockResolvedValue({
          content: 'Fallback content',
          model: 'claude-3-haiku',
          provider: 'anthropic',
        }),
        validateConfig: jest.fn().mockReturnValue(true),
      };

      (OpenAIProvider as jest.MockedClass<typeof OpenAIProvider>).mockImplementation(
        () => failingProvider as any
      );
      (AnthropicProvider as jest.MockedClass<typeof AnthropicProvider>).mockImplementation(
        () => workingProvider as any
      );

      aiService.addProvider('failing-openai', {
        provider: 'openai',
        apiKey: 'test-key',
        model: 'gpt-4o-mini',
      });

      aiService.addProvider('working-anthropic', {
        provider: 'anthropic',
        apiKey: 'test-key',
        model: 'claude-3-haiku',
      });

      const messages = [{ role: 'user' as const, content: 'Test message' }];
      const response = await aiService.generateWithFallback(
        messages,
        ['failing-openai', 'working-anthropic']
      );

      expect(response.content).toBe('Fallback content');
      expect(response.provider).toBe('anthropic');
    });

    it('should throw error when all providers fail', async () => {
      const failingProvider = {
        generateContent: jest.fn().mockRejectedValue(new Error('API Error')),
        validateConfig: jest.fn().mockReturnValue(true),
      };

      (OpenAIProvider as jest.MockedClass<typeof OpenAIProvider>).mockImplementation(
        () => failingProvider as any
      );

      aiService.addProvider('failing-openai', {
        provider: 'openai',
        apiKey: 'test-key',
        model: 'gpt-4o-mini',
      });

      const messages = [{ role: 'user' as const, content: 'Test message' }];

      await expect(
        aiService.generateWithFallback(messages, ['failing-openai'])
      ).rejects.toThrow('All providers failed');
    });
  });

  describe('Model Information', () => {
    it('should return available models for OpenAI', () => {
      const models = AIService.getAvailableModels('openai');
      expect(models).toContain('gpt-4o');
      expect(models).toContain('gpt-4o-mini');
      expect(models).toContain('gpt-3.5-turbo');
    });

    it('should return available models for Anthropic', () => {
      const models = AIService.getAvailableModels('anthropic');
      expect(models).toContain('claude-3-5-sonnet-20241022');
      expect(models).toContain('claude-3-5-haiku-20241022');
    });

    it('should return available models for Google', () => {
      const models = AIService.getAvailableModels('google');
      expect(models).toContain('gemini-1.5-pro');
      expect(models).toContain('gemini-1.5-flash');
    });

    it('should return empty array for unknown provider', () => {
      const models = AIService.getAvailableModels('unknown' as any);
      expect(models).toEqual([]);
    });
  });
});
