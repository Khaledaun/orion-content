
import { AIMessage, AIResponse, StreamingAIResponse, AIProviderConfig } from '../types';

export abstract class BaseAIProvider {
  protected config: AIProviderConfig;

  constructor(config: AIProviderConfig) {
    this.config = config;
  }

  abstract generateContent(
    messages: AIMessage[],
    options?: Partial<AIProviderConfig>
  ): Promise<AIResponse>;

  abstract streamContent(
    messages: AIMessage[],
    options?: Partial<AIProviderConfig>
  ): Promise<StreamingAIResponse>;

  abstract validateConfig(): boolean;

  protected buildMessages(messages: AIMessage[]): AIMessage[] {
    return messages.filter(msg => msg.content.trim().length > 0);
  }

  protected calculateReadTime(text: string): number {
    const wordsPerMinute = 200;
    const wordCount = text.split(/\s+/).length;
    return Math.ceil(wordCount / wordsPerMinute);
  }

  protected extractKeywords(text: string): string[] {
    // Simple keyword extraction - can be enhanced with NLP libraries
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 3);
    
    const frequency: Record<string, number> = {};
    words.forEach(word => {
      frequency[word] = (frequency[word] || 0) + 1;
    });

    return Object.entries(frequency)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([word]) => word);
  }
}
