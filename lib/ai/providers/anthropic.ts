
import Anthropic from '@anthropic-ai/sdk';
import { BaseAIProvider } from './base';
import { AIMessage, AIResponse, StreamingAIResponse, AIProviderConfig } from '../types';

export class AnthropicProvider extends BaseAIProvider {
  private client: Anthropic;

  constructor(config: AIProviderConfig) {
    super(config);
    if (!config.apiKey) {
      throw new Error('Anthropic API key is required');
    }
    this.client = new Anthropic({
      apiKey: config.apiKey,
    });
  }

  async generateContent(
    messages: AIMessage[],
    options?: Partial<AIProviderConfig>
  ): Promise<AIResponse> {
    const mergedConfig = { ...this.config, ...options };
    const processedMessages = this.buildMessages(messages);

    // Anthropic requires system message to be separate
    const systemMessage = processedMessages.find(msg => msg.role === 'system');
    const conversationMessages = processedMessages.filter(msg => msg.role !== 'system');

    try {
      const response = await this.client.messages.create({
        model: mergedConfig.model,
        max_tokens: mergedConfig.maxTokens ?? 2000,
        temperature: mergedConfig.temperature ?? 0.7,
        system: systemMessage?.content,
        messages: conversationMessages.map(msg => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
        })),
      });

      const content = response.content[0]?.type === 'text' ? response.content[0].text : '';
      
      return {
        content,
        usage: response.usage ? {
          promptTokens: response.usage.input_tokens,
          completionTokens: response.usage.output_tokens,
          totalTokens: response.usage.input_tokens + response.usage.output_tokens,
        } : undefined,
        model: response.model,
        provider: 'anthropic',
      };
    } catch (error) {
      throw new Error(`Anthropic API error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async streamContent(
    messages: AIMessage[],
    options?: Partial<AIProviderConfig>
  ): Promise<StreamingAIResponse> {
    const mergedConfig = { ...this.config, ...options };
    const processedMessages = this.buildMessages(messages);

    const systemMessage = processedMessages.find(msg => msg.role === 'system');
    const conversationMessages = processedMessages.filter(msg => msg.role !== 'system');

    try {
      const stream = await this.client.messages.create({
        model: mergedConfig.model,
        max_tokens: mergedConfig.maxTokens ?? 2000,
        temperature: mergedConfig.temperature ?? 0.7,
        system: systemMessage?.content,
        messages: conversationMessages.map(msg => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
        })),
        stream: true,
      });

      const contentGenerator = async function* () {
        for await (const chunk of stream) {
          if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
            yield chunk.delta.text;
          }
        }
      };

      return {
        content: contentGenerator(),
        model: mergedConfig.model,
        provider: 'anthropic',
      };
    } catch (error) {
      throw new Error(`Anthropic streaming error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  validateConfig(): boolean {
    return !!(this.config.apiKey && this.config.model);
  }

  static getAvailableModels(): string[] {
    return [
      'claude-3-5-sonnet-20241022',
      'claude-3-5-haiku-20241022',
      'claude-3-opus-20240229',
      'claude-3-sonnet-20240229',
      'claude-3-haiku-20240307',
    ];
  }
}
