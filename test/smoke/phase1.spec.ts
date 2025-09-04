
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { PrismaClient } from '@prisma/client';
import { CredentialService } from '../../src/modules/credentials/service';
import { ArticleService } from '../../src/modules/articles/service';
import { localStorage } from '../../src/storage/localStorage.provider';
import { validateEncryptionKey } from '../../src/lib/crypto/aesGcm';

/**
 * Phase 1 Smoke Tests
 * Content Management System - Core functionality validation
 */

describe('Phase 1: Content Management Foundation', () => {
  let prisma: PrismaClient;
  let credentialService: CredentialService;
  let articleService: ArticleService;
  let testSiteId: string;
  let testUserId: string;

  beforeAll(async () => {
    prisma = new PrismaClient();
    credentialService = new CredentialService(prisma);
    articleService = new ArticleService(prisma);

    // Initialize storage
    await localStorage.initialize();

    // Create test site and user
    const testSite = await prisma.site.create({
      data: {
        key: 'test-site',
        name: 'Test Site',
        timezone: 'UTC',
      },
    });
    testSiteId = testSite.id;

    const testUser = await prisma.user.create({
      data: {
        email: 'test@example.com',
        name: 'Test User',
      },
    });
    testUserId = testUser.id;
  });

  afterAll(async () => {
    // Cleanup test data
    await prisma.article.deleteMany({ where: { siteId: testSiteId } });
    await prisma.credential.deleteMany({ where: { key: { startsWith: 'test-' } } });
    await prisma.site.delete({ where: { id: testSiteId } });
    await prisma.user.delete({ where: { id: testUserId } });
    await prisma.$disconnect();
  });

  describe('Encryption & Security', () => {
    it('should validate encryption key configuration', () => {
      expect(validateEncryptionKey()).toBe(true);
    });

    it('should have required environment variables', () => {
      expect(process.env.ENCRYPTION_KEY).toBeDefined();
      expect(process.env.DATABASE_URL).toBeDefined();
    });
  });

  describe('Credential Management', () => {
    let credentialId: string;

    it('should create a new credential', async () => {
      const credential = await credentialService.createCredential({
        name: 'Test API Key',
        key: 'test-api-key',
        value: 'sk-test123456789abcdef',
        description: 'Test credential for smoke tests',
        isActive: true,
      });

      expect(credential).toBeDefined();
      expect(credential.name).toBe('Test API Key');
      expect(credential.key).toBe('test-api-key');
      expect(credential.isActive).toBe(true);
      
      credentialId = credential.id;
    });

    it('should list all credentials', async () => {
      const credentials = await credentialService.getAllCredentials();
      
      expect(Array.isArray(credentials)).toBe(true);
      expect(credentials.length).toBeGreaterThan(0);
      
      const testCredential = credentials.find(c => c.key === 'test-api-key');
      expect(testCredential).toBeDefined();
    });

    it('should retrieve credential by ID', async () => {
      const credential = await credentialService.getCredentialById(credentialId);
      
      expect(credential).toBeDefined();
      expect(credential.id).toBe(credentialId);
      expect(credential.key).toBe('test-api-key');
    });

    it('should decrypt credential value', async () => {
      const value = await credentialService.getCredentialValue('test-api-key');
      
      expect(value).toBe('sk-test123456789abcdef');
    });

    it('should update a credential', async () => {
      const updated = await credentialService.updateCredential(credentialId, {
        name: 'Updated Test API Key',
        description: 'Updated description',
      });

      expect(updated.name).toBe('Updated Test API Key');
      expect(updated.description).toBe('Updated description');
    });

    it('should test a credential', async () => {
      const result = await credentialService.testCredential('test-api-key');
      
      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');
      expect(typeof result.message).toBe('string');
    });

    it('should prevent duplicate credential keys', async () => {
      await expect(
        credentialService.createCredential({
          name: 'Duplicate Key',
          key: 'test-api-key',
          value: 'different-value',
        })
      ).rejects.toThrow('already exists');
    });
  });

  describe('Article Management', () => {
    let articleId: string;

    it('should create a new article', async () => {
      const article = await articleService.createArticle({
        title: 'Test Article',
        slug: 'test-article',
        content: 'This is a test article content.',
        excerpt: 'Test article excerpt',
        status: 'DRAFT' as any,
        siteId: testSiteId,
        seoData: {
          metaTitle: 'Test Article - SEO Title',
          metaDescription: 'Test article meta description',
          keywords: ['test', 'article', 'cms'],
        },
      }, testUserId);

      expect(article).toBeDefined();
      expect(article.title).toBe('Test Article');
      expect(article.slug).toBe('test-article');
      expect(article.status).toBe('DRAFT');
      expect(article.seoData).toBeDefined();
      expect(article.seoData?.metaTitle).toBe('Test Article - SEO Title');
      
      articleId = article.id;
    });

    it('should list articles with pagination', async () => {
      const result = await articleService.getArticles({
        page: 1,
        limit: 10,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });

      expect(result).toBeDefined();
      expect(Array.isArray(result.articles)).toBe(true);
      expect(result.pagination).toBeDefined();
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(10);
    });

    it('should retrieve article by ID', async () => {
      const article = await articleService.getArticleById(articleId);
      
      expect(article).toBeDefined();
      expect(article.id).toBe(articleId);
      expect(article.title).toBe('Test Article');
    });

    it('should retrieve article by slug', async () => {
      const article = await articleService.getArticleBySlug('test-article');
      
      expect(article).toBeDefined();
      expect(article.slug).toBe('test-article');
      expect(article.title).toBe('Test Article');
    });

    it('should update an article', async () => {
      const updated = await articleService.updateArticle(articleId, {
        title: 'Updated Test Article',
        content: 'Updated content for the test article.',
      }, testUserId);

      expect(updated.title).toBe('Updated Test Article');
      expect(updated.content).toBe('Updated content for the test article.');
    });

    it('should publish an article', async () => {
      const published = await articleService.publishArticle(articleId, testUserId);
      
      expect(published.status).toBe('PUBLISHED');
      expect(published.publishedAt).toBeDefined();
    });

    it('should filter articles by status', async () => {
      const result = await articleService.getArticles({
        page: 1,
        limit: 10,
        status: 'PUBLISHED' as any,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });

      expect(result.articles.every(a => a.status === 'PUBLISHED')).toBe(true);
    });

    it('should search articles by content', async () => {
      const result = await articleService.getArticles({
        page: 1,
        limit: 10,
        search: 'Updated content',
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });

      expect(result.articles.length).toBeGreaterThan(0);
      expect(result.articles[0].content).toContain('Updated content');
    });

    it('should prevent duplicate article slugs', async () => {
      await expect(
        articleService.createArticle({
          title: 'Another Article',
          slug: 'test-article', // Same slug
          siteId: testSiteId,
        }, testUserId)
      ).rejects.toThrow('already exists');
    });
  });

  describe('Local Storage Provider', () => {
    it('should initialize storage directories', async () => {
      await localStorage.initialize();
      
      const stats = await localStorage.getStorageStats();
      expect(stats).toBeDefined();
      expect(stats.folderStats).toBeDefined();
      expect(stats.folderStats.articles).toBeDefined();
      expect(stats.folderStats.media).toBeDefined();
    });

    it('should upload a file', async () => {
      const testBuffer = Buffer.from('Test file content');
      const file = await localStorage.uploadFile(
        testBuffer,
        'test.txt',
        'text/plain',
        { folder: 'temp' }
      );

      expect(file).toBeDefined();
      expect(file.filename).toContain('test');
      expect(file.originalName).toBe('test.txt');
      expect(file.mimeType).toBe('text/plain');
      expect(file.size).toBe(testBuffer.length);
    });

    it('should get storage statistics', async () => {
      const stats = await localStorage.getStorageStats();
      
      expect(stats).toBeDefined();
      expect(typeof stats.totalFiles).toBe('number');
      expect(typeof stats.totalSize).toBe('number');
      expect(stats.folderStats).toBeDefined();
    });

    it('should clean up temporary files', async () => {
      const cleanedCount = await localStorage.cleanupTempFiles(0); // Clean all temp files
      
      expect(typeof cleanedCount).toBe('number');
    });
  });

  describe('Database Schema', () => {
    it('should have all required models', async () => {
      // Test that all models are accessible
      const models = [
        'user',
        'site',
        'category',
        'article',
        'media',
        'sEOData',
        'credential',
      ];

      for (const model of models) {
        expect((prisma as any)[model]).toBeDefined();
      }
    });

    it('should enforce unique constraints', async () => {
      // Test unique slug constraint
      await expect(
        prisma.article.create({
          data: {
            title: 'Duplicate Slug Test',
            slug: 'test-article', // Already exists
            authorId: testUserId,
            siteId: testSiteId,
          },
        })
      ).rejects.toThrow();
    });

    it('should handle cascading deletes', async () => {
      // Create a test article with SEO data
      const article = await prisma.article.create({
        data: {
          title: 'Cascade Test',
          slug: 'cascade-test',
          authorId: testUserId,
          siteId: testSiteId,
          seoData: {
            create: {
              metaTitle: 'Cascade Test SEO',
              keywords: ['test'],
            },
          },
        },
        include: { seoData: true },
      });

      expect(article.seoData).toBeDefined();

      // Delete the article
      await prisma.article.delete({ where: { id: article.id } });

      // SEO data should be automatically deleted
      const seoData = await prisma.sEOData.findUnique({
        where: { articleId: article.id },
      });
      expect(seoData).toBeNull();
    });
  });
});
