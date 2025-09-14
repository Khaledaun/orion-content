
import { GoogleGenerativeAI } from '@google/generative-ai';
import { BaseAIProvider } from './base';
import { AIMessage, AIResponse, StreamingAIResponse, AIProviderConfig } from '../types';

export class GoogleProvider extends BaseAIProvider {
  private client: GoogleGenerativeAI;

  constructor(config: AIProviderConfig) {
    super(config);
    if (!config.apiKey) {
      throw new Error('Google API key is required');
    }
    this.client = new GoogleGenerativeAI(config.apiKey);
  }

  async generateContent(
    messages: AIMessage[],
    options?: Partial<AIProviderConfig>
  ): Promise<AIResponse> {
    const mergedConfig = { ...this.config, ...options };
    const processedMessages = this.buildMessages(messages);

    try {
      const model = this.client.getGenerativeModel({ 
        model: mergedConfig.model,
        generationConfig: {
          temperature: mergedConfig.temperature ?? 0.7,
          maxOutputTokens: mergedConfig.maxTokens ?? 2000,
          topP: mergedConfig.topP ?? 1,
        },
      });

      // Convert messages to Google's format
      const prompt = this.convertMessagesToPrompt(processedMessages);
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const content = response.text();

      return {
        content,
        usage: response.usageMetadata ? {
          promptTokens: response.usageMetadata.promptTokenCount || 0,
          completionTokens: response.usageMetadata.candidatesTokenCount || 0,
          totalTokens: response.usageMetadata.totalTokenCount || 0,
        } : undefined,
        model: mergedConfig.model,
        provider: 'google',
      };
    } catch (error) {
      throw new Error(`Google AI error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async streamContent(
    messages: AIMessage[],
    options?: Partial<AIProviderConfig>
  ): Promise<StreamingAIResponse> {
    const mergedConfig = { ...this.config, ...options };
    const processedMessages = this.buildMessages(messages);

    try {
      const model = this.client.getGenerativeModel({ 
        model: mergedConfig.model,
        generationConfig: {
          temperature: mergedConfig.temperature ?? 0.7,
          maxOutputTokens: mergedConfig.maxTokens ?? 2000,
          topP: mergedConfig.topP ?? 1,
        },
      });

      const prompt = this.convertMessagesToPrompt(processedMessages);
      const result = await model.generateContentStream(prompt);

      const contentGenerator = async function* () {
        for await (const chunk of result.stream) {
          const chunkText = chunk.text();
          if (chunkText) {
            yield chunkText;
          }
        }
      };

      return {
        content: contentGenerator(),
        model: mergedConfig.model,
        provider: 'google',
      };
    } catch (error) {
      throw new Error(`Google AI streaming error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private convertMessagesToPrompt(messages: AIMessage[]): string {
    return messages
      .map(msg => {
        const rolePrefix = msg.role === 'system' ? 'System: ' : 
                          msg.role === 'user' ? 'User: ' : 'Assistant: ';
        return `${rolePrefix}${msg.content}`;
      })
      .join('\n\n');
  }

  validateConfig(): boolean {
    return !!(this.config.apiKey && this.config.model);
  }

  static getAvailableModels(): string[] {
    return [
      'gemini-1.5-pro',
      'gemini-1.5-flash',
      'gemini-1.0-pro',
      'gemini-pro-vision',
    ];
  }
}
