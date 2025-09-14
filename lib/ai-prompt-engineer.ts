
import { prisma } from './prisma';
import { AIService } from './ai/service';

export interface PromptTemplateData {
  name: string;
  description?: string;
  category: 'content' | 'seo' | 'social' | 'analysis';
  systemPrompt: string;
  userPromptSchema: Record<string, any>;
  roles?: string[];
  isActive?: boolean;
  isSystemManaged?: boolean;
}

export interface PromptTestData {
  name: string;
  inputData: Record<string, any>;
  expectedType: string;
}

export interface PromptExecution {
  templateId: string;
  inputData: Record<string, any>;
  providerId?: string;
  userId?: string;
}

export class AIPromptEngineer {
  private aiService: AIService;

  constructor() {
    this.aiService = new AIService();
  }

  async createPromptTemplate(data: PromptTemplateData, createdBy?: string) {
    try {
      const template = await prisma.promptTemplate.create({
        data: {
          name: data.name,
          description: data.description,
          category: data.category,
          systemPrompt: data.systemPrompt,
          userPromptSchema: data.userPromptSchema,
          roles: data.roles || [],
          isActive: data.isActive !== false,
          isSystemManaged: data.isSystemManaged || false,
          createdBy
        }
      });

      return template;
    } catch (error) {
      console.error('Error creating prompt template:', error);
      throw error;
    }
  }

  async updatePromptTemplate(
    templateId: string, 
    updates: Partial<PromptTemplateData>
  ) {
    try {
      // Don't allow updates to system-managed templates
      const existing = await prisma.promptTemplate.findUnique({
        where: { id: templateId },
        select: { isSystemManaged: true }
      });

      if (existing?.isSystemManaged) {
        throw new Error('Cannot update system-managed prompt template');
      }

      const template = await prisma.promptTemplate.update({
        where: { id: templateId },
        data: {
          ...updates,
          version: {
            increment: 1
          }
        }
      });

      return template;
    } catch (error) {
      console.error('Error updating prompt template:', error);
      throw error;
    }
  }

  async getPromptTemplate(templateId: string) {
    try {
      return await prisma.promptTemplate.findUnique({
        where: { id: templateId },
        include: {
          promptTests: true
        }
      });
    } catch (error) {
      console.error('Error getting prompt template:', error);
      return null;
    }
  }

  async getPromptTemplatesByCategory(category?: string, isActive?: boolean) {
    try {
      return await prisma.promptTemplate.findMany({
        where: {
          ...(category ? { category } : {}),
          ...(isActive !== undefined ? { isActive } : {})
        },
        include: {
          promptTests: {
            take: 5,
            orderBy: { createdAt: 'desc' }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
    } catch (error) {
      console.error('Error getting prompt templates:', error);
      return [];
    }
  }

  async executePrompt(execution: PromptExecution) {
    try {
      const template = await this.getPromptTemplate(execution.templateId);
      if (!template || !template.isActive) {
        throw new Error('Prompt template not found or inactive');
      }

      // Validate input data against schema
      const validationResult = this.validateInputData(
        execution.inputData, 
        template.userPromptSchema
      );
      
      if (!validationResult.isValid) {
        throw new Error(`Invalid input data: ${validationResult.errors.join(', ')}`);
      }

      // Build the complete prompt
      const userPrompt = this.buildUserPrompt(
        template.userPromptSchema, 
        execution.inputData
      );

      const messages = [
        { role: 'system' as const, content: template.systemPrompt },
        { role: 'user' as const, content: userPrompt }
      ];

      // Execute with AI service
      const providerId = execution.providerId;
      const result = await this.aiService.generateContent(messages, providerId);

      return {
        templateId: execution.templateId,
        inputData: execution.inputData,
        result,
        executedAt: new Date(),
        version: template.version
      };

    } catch (error) {
      console.error('Error executing prompt:', error);
      throw error;
    }
  }

  async createPromptTest(templateId: string, testData: PromptTestData) {
    try {
      const test = await prisma.promptTest.create({
        data: {
          templateId,
          name: testData.name,
          inputData: testData.inputData,
          expectedType: testData.expectedType,
          status: 'pending'
        }
      });

      return test;
    } catch (error) {
      console.error('Error creating prompt test:', error);
      throw error;
    }
  }

  async runPromptTest(testId: string) {
    try {
      const test = await prisma.promptTest.findUnique({
        where: { id: testId },
        include: { template: true }
      });

      if (!test) {
        throw new Error('Prompt test not found');
      }

      // Execute the prompt
      const execution = await this.executePrompt({
        templateId: test.templateId,
        inputData: test.inputData as Record<string, any>
      });

      // Evaluate results based on expected type
      const evaluation = await this.evaluateTestResult(
        execution.result, 
        test.expectedType
      );

      // Update test with results
      const updatedTest = await prisma.promptTest.update({
        where: { id: testId },
        data: {
          status: evaluation.passed ? 'passed' : 'failed',
          results: {
            execution: execution.result,
            evaluation,
            timestamp: new Date().toISOString()
          }
        }
      });

      return updatedTest;
    } catch (error) {
      console.error('Error running prompt test:', error);
      
      await prisma.promptTest.update({
        where: { id: testId },
        data: {
          status: 'failed',
          results: {
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
          }
        }
      });

      throw error;
    }
  }

  async runAllPromptTests(templateId: string) {
    try {
      const tests = await prisma.promptTest.findMany({
        where: { templateId }
      });

      const results = await Promise.allSettled(
        tests.map((test: any) => this.runPromptTest(test.id))
      );

      const summary = {
        total: tests.length,
        passed: results.filter(r => r.status === 'fulfilled').length,
        failed: results.filter(r => r.status === 'rejected').length,
        results: results.map((result, index) => ({
          testId: tests[index].id,
          testName: tests[index].name,
          status: result.status,
          ...(result.status === 'fulfilled' ? { data: result.value } : { error: result.reason })
        }))
      };

      return summary;
    } catch (error) {
      console.error('Error running prompt tests:', error);
      throw error;
    }
  }

  private validateInputData(
    inputData: Record<string, any>, 
    schema: Record<string, any>
  ): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Basic schema validation
    if (schema.required && Array.isArray(schema.required)) {
      for (const field of schema.required) {
        if (!(field in inputData)) {
          errors.push(`Required field '${field}' is missing`);
        }
      }
    }

    if (schema.properties) {
      for (const [field, config] of Object.entries(schema.properties)) {
        if (field in inputData) {
          const value = inputData[field];
          const fieldConfig = config as any;
          
          // Type validation
          if (fieldConfig.type) {
            if (!this.validateType(value, fieldConfig.type)) {
              errors.push(`Field '${field}' must be of type ${fieldConfig.type}`);
            }
          }

          // Length validation for strings
          if (fieldConfig.type === 'string' && typeof value === 'string') {
            if (fieldConfig.minLength && value.length < fieldConfig.minLength) {
              errors.push(`Field '${field}' must be at least ${fieldConfig.minLength} characters`);
            }
            if (fieldConfig.maxLength && value.length > fieldConfig.maxLength) {
              errors.push(`Field '${field}' must be at most ${fieldConfig.maxLength} characters`);
            }
          }
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  private validateType(value: any, expectedType: string): boolean {
    switch (expectedType) {
      case 'string':
        return typeof value === 'string';
      case 'number':
        return typeof value === 'number';
      case 'boolean':
        return typeof value === 'boolean';
      case 'array':
        return Array.isArray(value);
      case 'object':
        return typeof value === 'object' && value !== null && !Array.isArray(value);
      default:
        return true;
    }
  }

  private buildUserPrompt(
    schema: Record<string, any>, 
    inputData: Record<string, any>
  ): string {
    if (schema.template && typeof schema.template === 'string') {
      // Replace placeholders in template
      let prompt = schema.template;
      for (const [key, value] of Object.entries(inputData)) {
        const placeholder = `{{${key}}}`;
        prompt = prompt.replace(new RegExp(placeholder, 'g'), String(value));
      }
      return prompt;
    }

    // Fallback: simple key-value formatting
    const entries = Object.entries(inputData)
      .map(([key, value]) => `${key}: ${value}`)
      .join('\n');
    
    return entries;
  }

  private async evaluateTestResult(
    result: any, 
    expectedType: string
  ): Promise<{ passed: boolean; score?: number; notes?: string }> {
    try {
      // Basic type checking
      if (expectedType === 'json' && result?.content) {
        try {
          JSON.parse(result.content);
          return { passed: true, score: 1.0, notes: 'Valid JSON response' };
        } catch {
          return { passed: false, score: 0, notes: 'Invalid JSON response' };
        }
      }

      if (expectedType === 'text' && result?.content) {
        const content = result.content.trim();
        const wordCount = content.split(/\s+/).length;
        const passed = wordCount >= 10; // Minimum word count for text
        
        return { 
          passed, 
          score: passed ? 1.0 : 0.5, 
          notes: `Generated ${wordCount} words` 
        };
      }

      // Default evaluation
      return { 
        passed: Boolean(result?.content), 
        score: result?.content ? 1.0 : 0,
        notes: 'Basic content presence check'
      };

    } catch (error) {
      return { 
        passed: false, 
        score: 0, 
        notes: `Evaluation error: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }
}

export const aiPromptEngineer = new AIPromptEngineer();

// Default prompt templates for seeding
export const DEFAULT_PROMPT_TEMPLATES: PromptTemplateData[] = [
  {
    name: 'Blog Post Generator',
    description: 'Generate comprehensive blog posts with SEO optimization',
    category: 'content',
    systemPrompt: `You are an expert content writer specializing in creating engaging, SEO-optimized blog posts. 
Your writing should be informative, well-structured, and optimized for search engines while maintaining readability and engagement.

Guidelines:
- Use clear, compelling headlines
- Include relevant keywords naturally
- Structure content with proper headings (H2, H3)
- Add actionable insights and examples
- Include a strong conclusion with call-to-action`,
    userPromptSchema: {
      type: 'object',
      required: ['topic', 'targetAudience', 'keywords'],
      properties: {
        topic: { type: 'string', minLength: 10, maxLength: 200 },
        targetAudience: { type: 'string', minLength: 5, maxLength: 100 },
        keywords: { type: 'array', items: { type: 'string' } },
        tone: { type: 'string', enum: ['professional', 'casual', 'friendly', 'formal'] },
        length: { type: 'string', enum: ['short', 'medium', 'long'] }
      },
      template: `Topic: {{topic}}
Target Audience: {{targetAudience}}
Keywords to include: {{keywords}}
Tone: {{tone}}
Desired length: {{length}}

Please create a comprehensive blog post on this topic.`
    },
    roles: ['content', 'seo']
  },
  {
    name: 'SEO Meta Description',
    description: 'Generate compelling meta descriptions optimized for click-through rates',
    category: 'seo',
    systemPrompt: `You are an SEO specialist focused on creating compelling meta descriptions that improve click-through rates.

Guidelines:
- Keep descriptions between 150-160 characters
- Include target keywords naturally
- Create compelling, action-oriented copy
- Highlight unique value propositions
- Avoid keyword stuffing`,
    userPromptSchema: {
      type: 'object',
      required: ['title', 'primaryKeyword'],
      properties: {
        title: { type: 'string', minLength: 10, maxLength: 100 },
        primaryKeyword: { type: 'string', minLength: 2, maxLength: 50 },
        secondaryKeywords: { type: 'array', items: { type: 'string' } },
        cta: { type: 'string', maxLength: 30 }
      },
      template: `Page Title: {{title}}
Primary Keyword: {{primaryKeyword}}
Secondary Keywords: {{secondaryKeywords}}
Call-to-Action: {{cta}}

Create an SEO-optimized meta description for this page.`
    },
    roles: ['seo']
  },
  {
    name: 'Social Media Content',
    description: 'Create engaging social media posts for various platforms',
    category: 'social',
    systemPrompt: `You are a social media expert creating engaging content that drives interaction and engagement.

Guidelines:
- Adapt content to platform-specific formats and audiences
- Use relevant hashtags strategically
- Include compelling calls-to-action
- Create shareable, valuable content
- Consider visual content suggestions`,
    userPromptSchema: {
      type: 'object',
      required: ['platform', 'topic', 'goal'],
      properties: {
        platform: { type: 'string', enum: ['twitter', 'linkedin', 'facebook', 'instagram'] },
        topic: { type: 'string', minLength: 5, maxLength: 200 },
        goal: { type: 'string', enum: ['engagement', 'traffic', 'awareness', 'conversion'] },
        tone: { type: 'string', enum: ['professional', 'casual', 'humorous', 'inspirational'] },
        hashtags: { type: 'number', minimum: 0, maximum: 10 }
      },
      template: `Platform: {{platform}}
Topic: {{topic}}
Goal: {{goal}}
Tone: {{tone}}
Number of hashtags: {{hashtags}}

Create engaging social media content for this platform and topic.`
    },
    roles: ['social', 'marketing']
  },
  {
    name: 'Content Analysis',
    description: 'Analyze content for SEO, readability, and engagement opportunities',
    category: 'analysis',
    systemPrompt: `You are a content analyst specializing in SEO and engagement optimization.

Provide detailed analysis including:
- SEO score and recommendations
- Readability assessment
- Engagement opportunities
- Content structure evaluation
- Improvement suggestions with priority levels`,
    userPromptSchema: {
      type: 'object',
      required: ['content', 'targetKeywords'],
      properties: {
        content: { type: 'string', minLength: 100 },
        targetKeywords: { type: 'array', items: { type: 'string' } },
        industry: { type: 'string', maxLength: 50 },
        competitorUrls: { type: 'array', items: { type: 'string' } }
      },
      template: `Content to analyze:
{{content}}

Target Keywords: {{targetKeywords}}
Industry: {{industry}}
Competitor URLs: {{competitorUrls}}

Please provide a comprehensive content analysis with actionable recommendations.`
    },
    roles: ['analysis', 'seo']
  }
];
