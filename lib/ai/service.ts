
import { BaseAIProvider, OpenAIProvider, AnthropicProvider, GoogleProvider } from './providers';
import { 
  AIProvider, 
  AIProviderConfig, 
  AIMessage, 
  AIResponse, 
  StreamingAIResponse,
  ContentGenerationRequest,
  ContentGenerationResponse
} from './types';

export class AIService {
  private providers: Map<string, BaseAIProvider> = new Map();
  private defaultProvider?: string;

  constructor() {
    // Initialize with environment variables if available
    this.initializeFromEnv();
  }

  private initializeFromEnv() {
    // OpenAI
    if (process.env.OPENAI_API_KEY) {
      this.addProvider('openai-default', {
        provider: 'openai',
        apiKey: process.env.OPENAI_API_KEY,
        model: 'gpt-4o-mini',
      });
      if (!this.defaultProvider) this.defaultProvider = 'openai-default';
    }

    // Anthropic
    if (process.env.ANTHROPIC_API_KEY) {
      this.addProvider('anthropic-default', {
        provider: 'anthropic',
        apiKey: process.env.ANTHROPIC_API_KEY,
        model: 'claude-3-5-haiku-20241022',
      });
      if (!this.defaultProvider) this.defaultProvider = 'anthropic-default';
    }

    // Google
    if (process.env.GOOGLE_AI_API_KEY) {
      this.addProvider('google-default', {
        provider: 'google',
        apiKey: process.env.GOOGLE_AI_API_KEY,
        model: 'gemini-1.5-flash',
      });
      if (!this.defaultProvider) this.defaultProvider = 'google-default';
    }
  }

  addProvider(name: string, config: AIProviderConfig): void {
    let provider: BaseAIProvider;

    switch (config.provider) {
      case 'openai':
        provider = new OpenAIProvider(config);
        break;
      case 'anthropic':
        provider = new AnthropicProvider(config);
        break;
      case 'google':
        provider = new GoogleProvider(config);
        break;
      default:
        throw new Error(`Unsupported provider: ${config.provider}`);
    }

    if (!provider.validateConfig()) {
      throw new Error(`Invalid configuration for provider: ${config.provider}`);
    }

    this.providers.set(name, provider);
    
    // Set as default if it's the first provider
    if (!this.defaultProvider) {
      this.defaultProvider = name;
    }
  }

  removeProvider(name: string): void {
    this.providers.delete(name);
    if (this.defaultProvider === name) {
      this.defaultProvider = this.providers.keys().next().value;
    }
  }

  setDefaultProvider(name: string): void {
    if (!this.providers.has(name)) {
      throw new Error(`Provider ${name} not found`);
    }
    this.defaultProvider = name;
  }

  getProvider(name?: string): BaseAIProvider {
    const providerName = name || this.defaultProvider;
    if (!providerName) {
      throw new Error('No providers configured');
    }

    const provider = this.providers.get(providerName);
    if (!provider) {
      throw new Error(`Provider ${providerName} not found`);
    }

    return provider;
  }

  listProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  async generateContent(
    messages: AIMessage[],
    providerName?: string,
    options?: Partial<AIProviderConfig>
  ): Promise<AIResponse> {
    const provider = this.getProvider(providerName);
    return provider.generateContent(messages, options);
  }

  async streamContent(
    messages: AIMessage[],
    providerName?: string,
    options?: Partial<AIProviderConfig>
  ): Promise<StreamingAIResponse> {
    const provider = this.getProvider(providerName);
    return provider.streamContent(messages, options);
  }

  async generateContentFromRequest(
    request: ContentGenerationRequest,
    providerName?: string
  ): Promise<ContentGenerationResponse> {
    const prompt = this.buildContentPrompt(request);
    const messages: AIMessage[] = [
      {
        role: 'system',
        content: 'You are a professional content writer. Generate high-quality, engaging content based on the user\'s requirements. Always provide well-structured, original content.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ];

    const response = await this.generateContent(messages, providerName);
    
    return {
      content: response.content,
      wordCount: response.content.split(/\s+/).length,
      estimatedReadTime: Math.ceil(response.content.split(/\s+/).length / 200),
      // TODO: Implement actual SEO and readability scoring
      seoScore: Math.floor(Math.random() * 40) + 60, // Mock score 60-100
      readabilityScore: Math.floor(Math.random() * 30) + 70, // Mock score 70-100
    };
  }

  private buildContentPrompt(request: ContentGenerationRequest): string {
    let prompt = `Generate ${request.type} content about: ${request.topic}\n\n`;

    if (request.keywords?.length) {
      prompt += `Keywords to include: ${request.keywords.join(', ')}\n`;
    }

    if (request.tone) {
      prompt += `Tone: ${request.tone}\n`;
    }

    if (request.length) {
      const lengthMap = {
        short: '200-400 words',
        medium: '400-800 words',
        long: '800-1500 words',
      };
      prompt += `Length: ${lengthMap[request.length]}\n`;
    }

    if (request.targetAudience) {
      prompt += `Target audience: ${request.targetAudience}\n`;
    }

    if (request.language && request.language !== 'en') {
      prompt += `Language: ${request.language}\n`;
    }

    if (request.customPrompt) {
      prompt += `\nAdditional instructions: ${request.customPrompt}\n`;
    }

    prompt += '\nPlease generate the content now:';

    return prompt;
  }

  // Utility method for fallback/retry logic
  async generateWithFallback(
    messages: AIMessage[],
    providerNames: string[],
    options?: Partial<AIProviderConfig>
  ): Promise<AIResponse> {
    let lastError: Error | null = null;

    for (const providerName of providerNames) {
      try {
        return await this.generateContent(messages, providerName, options);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        console.warn(`Provider ${providerName} failed:`, lastError.message);
      }
    }

    throw new Error(`All providers failed. Last error: ${lastError?.message}`);
  }

  static getAvailableModels(provider: AIProvider): string[] {
    switch (provider) {
      case 'openai':
        return OpenAIProvider.getAvailableModels();
      case 'anthropic':
        return AnthropicProvider.getAvailableModels();
      case 'google':
        return GoogleProvider.getAvailableModels();
      default:
        return [];
    }
  }
}

// Global instance
export const aiService = new AIService();
