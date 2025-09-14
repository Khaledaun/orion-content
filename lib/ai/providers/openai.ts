
import OpenAI from 'openai';
import { BaseAIProvider } from './base';
import { AIMessage, AIResponse, StreamingAIResponse, AIProviderConfig } from '../types';

export class OpenAIProvider extends BaseAIProvider {
  private client: OpenAI;

  constructor(config: AIProviderConfig) {
    super(config);
    if (!config.apiKey) {
      throw new Error('OpenAI API key is required');
    }
    this.client = new OpenAI({
      apiKey: config.apiKey,
    });
  }

  async generateContent(
    messages: AIMessage[],
    options?: Partial<AIProviderConfig>
  ): Promise<AIResponse> {
    const mergedConfig = { ...this.config, ...options };
    const processedMessages = this.buildMessages(messages);

    try {
      const response = await this.client.chat.completions.create({
        model: mergedConfig.model,
        messages: processedMessages.map(msg => ({
          role: msg.role,
          content: msg.content,
        })),
        temperature: mergedConfig.temperature ?? 0.7,
        max_tokens: mergedConfig.maxTokens ?? 2000,
        top_p: mergedConfig.topP ?? 1,
        frequency_penalty: mergedConfig.frequencyPenalty ?? 0,
        presence_penalty: mergedConfig.presencePenalty ?? 0,
      });

      const content = response.choices[0]?.message?.content || '';
      
      return {
        content,
        usage: response.usage ? {
          promptTokens: response.usage.prompt_tokens,
          completionTokens: response.usage.completion_tokens,
          totalTokens: response.usage.total_tokens,
        } : undefined,
        model: response.model,
        provider: 'openai',
      };
    } catch (error) {
      throw new Error(`OpenAI API error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async streamContent(
    messages: AIMessage[],
    options?: Partial<AIProviderConfig>
  ): Promise<StreamingAIResponse> {
    const mergedConfig = { ...this.config, ...options };
    const processedMessages = this.buildMessages(messages);

    try {
      const stream = await this.client.chat.completions.create({
        model: mergedConfig.model,
        messages: processedMessages.map(msg => ({
          role: msg.role,
          content: msg.content,
        })),
        temperature: mergedConfig.temperature ?? 0.7,
        max_tokens: mergedConfig.maxTokens ?? 2000,
        top_p: mergedConfig.topP ?? 1,
        frequency_penalty: mergedConfig.frequencyPenalty ?? 0,
        presence_penalty: mergedConfig.presencePenalty ?? 0,
        stream: true,
      });

      const contentGenerator = async function* () {
        for await (const chunk of stream) {
          const content = chunk.choices[0]?.delta?.content;
          if (content) {
            yield content;
          }
        }
      };

      return {
        content: contentGenerator(),
        model: mergedConfig.model,
        provider: 'openai',
      };
    } catch (error) {
      throw new Error(`OpenAI streaming error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  validateConfig(): boolean {
    return !!(this.config.apiKey && this.config.model);
  }

  static getAvailableModels(): string[] {
    return [
      'gpt-4o',
      'gpt-4o-mini',
      'gpt-4-turbo',
      'gpt-4',
      'gpt-3.5-turbo',
      'gpt-3.5-turbo-16k',
    ];
  }
}
