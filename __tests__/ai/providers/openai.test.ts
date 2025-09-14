
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { OpenAIProvider } from '@/lib/ai/providers/openai';
import OpenAI from 'openai';

// Mock OpenAI
jest.mock('openai');

describe('OpenAIProvider', () => {
  let provider: OpenAIProvider;
  let mockOpenAI: jest.Mocked<OpenAI>;

  beforeEach(() => {
    mockOpenAI = {
      chat: {
        completions: {
          create: jest.fn(),
        },
      },
    } as any;

    (OpenAI as jest.MockedClass<typeof OpenAI>).mockImplementation(() => mockOpenAI);

    const config = {
      provider: 'openai' as const,
      apiKey: 'test-api-key',
      model: 'gpt-4o-mini',
      temperature: 0.7,
      maxTokens: 2000,
    };

    provider = new OpenAIProvider(config);
  });

  describe('Configuration', () => {
    it('should validate configuration correctly', () => {
      expect(provider.validateConfig()).toBe(true);
    });

    it('should throw error without API key', () => {
      expect(() => {
        new OpenAIProvider({
          provider: 'openai',
          apiKey: '',
          model: 'gpt-4o-mini',
        });
      }).toThrow('OpenAI API key is required');
    });
  });

  describe('Content Generation', () => {
    it('should generate content successfully', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: 'Generated content from OpenAI',
            },
          },
        ],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 20,
          total_tokens: 30,
        },
        model: 'gpt-4o-mini',
      };

      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse as any);

      const messages = [
        { role: 'user' as const, content: 'Generate a blog post about AI' },
      ];

      const response = await provider.generateContent(messages);

      expect(response).toEqual({
        content: 'Generated content from OpenAI',
        usage: {
          promptTokens: 10,
          completionTokens: 20,
          totalTokens: 30,
        },
        model: 'gpt-4o-mini',
        provider: 'openai',
      });

      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: 'Generate a blog post about AI' }],
        temperature: 0.7,
        max_tokens: 2000,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0,
      });
    });

    it('should handle API errors gracefully', async () => {
      mockOpenAI.chat.completions.create.mockRejectedValue(new Error('API Error'));

      const messages = [
        { role: 'user' as const, content: 'Test message' },
      ];

      await expect(provider.generateContent(messages)).rejects.toThrow('OpenAI API error: API Error');
    });

    it('should filter empty messages', async () => {
      const mockResponse = {
        choices: [{ message: { content: 'Response' } }],
        usage: { prompt_tokens: 5, completion_tokens: 10, total_tokens: 15 },
        model: 'gpt-4o-mini',
      };

      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse as any);

      const messages = [
        { role: 'user' as const, content: 'Valid message' },
        { role: 'user' as const, content: '' },
        { role: 'user' as const, content: '   ' },
      ];

      await provider.generateContent(messages);

      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: [{ role: 'user', content: 'Valid message' }],
        })
      );
    });
  });

  describe('Streaming', () => {
    it('should stream content successfully', async () => {
      const mockStream = {
        [Symbol.asyncIterator]: async function* () {
          yield { choices: [{ delta: { content: 'Hello' } }] };
          yield { choices: [{ delta: { content: ' world' } }] };
          yield { choices: [{ delta: { content: '!' } }] };
        },
      };

      mockOpenAI.chat.completions.create.mockResolvedValue(mockStream as any);

      const messages = [
        { role: 'user' as const, content: 'Say hello' },
      ];

      const response = await provider.streamContent(messages);
      const chunks: string[] = [];

      for await (const chunk of response.content) {
        chunks.push(chunk);
      }

      expect(chunks).toEqual(['Hello', ' world', '!']);
      expect(response.model).toBe('gpt-4o-mini');
      expect(response.provider).toBe('openai');
    });
  });

  describe('Available Models', () => {
    it('should return list of available models', () => {
      const models = OpenAIProvider.getAvailableModels();
      
      expect(models).toContain('gpt-4o');
      expect(models).toContain('gpt-4o-mini');
      expect(models).toContain('gpt-4-turbo');
      expect(models).toContain('gpt-3.5-turbo');
      expect(models.length).toBeGreaterThan(0);
    });
  });
});
