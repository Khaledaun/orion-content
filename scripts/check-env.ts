#!/usr/bin/env npx tsx

/**
 * Pre-deployment Environment Validation Script
 * Comprehensive validation of all required environment variables and configuration
 * Exits with error code if critical issues are found
 */

import { existsSync, readFileSync } from 'fs';
import { URL } from 'url';

interface ValidationRule {
  key: string;
  required: boolean;
  validator?: (value: string) => boolean;
  description: string;
  productionOnly?: boolean;
}

interface ValidationResult {
  errors: string[];
  warnings: string[];
  info: string[];
}

class EnvironmentValidator {
  private result: ValidationResult = {
    errors: [],
    warnings: [],
    info: []
  };

  private isProduction = process.env.NODE_ENV === 'production';
  private isVercelBuild = process.env.VERCEL === '1';

  private rules: ValidationRule[] = [
    // Core NextAuth Configuration
    {
      key: 'NEXTAUTH_URL',
      required: true,
      validator: this.validateUrl.bind(this),
      description: 'NextAuth.js URL for callbacks and redirects'
    },
    {
      key: 'NEXTAUTH_SECRET',
      required: true,
      validator: this.validateSecret.bind(this),
      description: 'NextAuth.js JWT encryption secret'
    },

    // Database Configuration
    {
      key: 'DATABASE_URL',
      required: true,
      validator: this.validateDatabaseUrl.bind(this),
      description: 'Database connection string'
    },
    {
      key: 'DIRECT_URL',
      required: false,
      validator: this.validateDatabaseUrl.bind(this),
      description: 'Direct database connection (for Prisma migrations)'
    },

    // Security
    {
      key: 'ENCRYPTION_KEY',
      required: true,
      validator: this.validateEncryptionKey.bind(this),
      description: '32-character encryption key for sensitive data'
    },

    // Optional OAuth
    {
      key: 'GOOGLE_CLIENT_ID',
      required: false,
      description: 'Google OAuth client ID'
    },
    {
      key: 'GOOGLE_CLIENT_SECRET',
      required: false,
      validator: (value) => value.length >= 24,
      description: 'Google OAuth client secret'
    },

    // API Keys (optional but recommended)
    {
      key: 'OPENAI_API_KEY',
      required: false,
      validator: (value) => value.startsWith('sk-'),
      description: 'OpenAI API key for content generation'
    },

    // Environment
    {
      key: 'NODE_ENV',
      required: true,
      validator: (value) => ['development', 'production', 'test'].includes(value),
      description: 'Node.js environment'
    }
  ];

  private validateUrl(value: string): boolean {
    try {
      const url = new URL(value);
      return ['http:', 'https:'].includes(url.protocol);
    } catch {
      return false;
    }
  }

  private validateSecret(value: string): boolean {
    if (value.length < 32) {
      this.result.errors.push('NEXTAUTH_SECRET must be at least 32 characters long');
      return false;
    }
    if (value === 'demo-secret-please-set-in-production') {
      if (this.isProduction) {
        this.result.errors.push('NEXTAUTH_SECRET cannot use demo value in production');
        return false;
      } else {
        this.result.warnings.push('Using demo NEXTAUTH_SECRET - replace in production');
      }
    }
    return true;
  }

  private validateDatabaseUrl(value: string): boolean {
    try {
      const url = new URL(value);
      const validProtocols = ['postgresql:', 'postgres:', 'mysql:', 'sqlite:'];
      return validProtocols.includes(url.protocol);
    } catch {
      return false;
    }
  }

  private validateEncryptionKey(value: string): boolean {
    return value.length >= 32;
  }

  private validateNextAuthUrl(value: string): void {
    if (!this.validateUrl(value)) {
      this.result.errors.push('NEXTAUTH_URL must be a valid HTTP/HTTPS URL');
      return;
    }

    const url = new URL(value);
    
    if (this.isProduction || this.isVercelBuild) {
      if (url.protocol !== 'https:') {
        this.result.errors.push('NEXTAUTH_URL must use HTTPS in production');
      }
      if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
        this.result.errors.push('NEXTAUTH_URL cannot use localhost in production');
      }
    }

    if (url.pathname !== '/') {
      this.result.warnings.push('NEXTAUTH_URL should not include a path component');
    }
  }

  private validateGoogleOAuth(): void {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (clientId && !clientSecret) {
      this.result.errors.push('GOOGLE_CLIENT_SECRET is required when GOOGLE_CLIENT_ID is set');
    }
    if (clientSecret && !clientId) {
      this.result.errors.push('GOOGLE_CLIENT_ID is required when GOOGLE_CLIENT_SECRET is set');
    }
    if (clientId && clientSecret) {
      this.result.info.push('Google OAuth is configured');
    }
  }

  private validatePrismaFiles(): void {
    if (!existsSync('prisma/schema.prisma')) {
      this.result.errors.push('prisma/schema.prisma file not found');
      return;
    }

    const schema = readFileSync('prisma/schema.prisma', 'utf8');
    if (!schema.includes('model User')) {
      this.result.warnings.push('Prisma schema may be missing User model');
    }

    if (existsSync('node_modules/@prisma/client')) {
      this.result.info.push('Prisma client is generated');
    } else {
      this.result.warnings.push('Prisma client not generated - run "npx prisma generate"');
    }
  }

  private validateVercelConfig(): void {
    if (!existsSync('vercel.json')) {
      this.result.warnings.push('vercel.json not found - using default Vercel configuration');
      return;
    }

    try {
      const config = JSON.parse(readFileSync('vercel.json', 'utf8'));
      
      if (config.framework !== 'nextjs') {
        this.result.warnings.push('vercel.json framework should be "nextjs"');
      }

      if (config.buildCommand && !config.buildCommand.includes('prisma generate')) {
        this.result.warnings.push('vercel.json buildCommand should include "prisma generate"');
      }

      this.result.info.push('Vercel configuration validated');
    } catch (error) {
      this.result.errors.push(`vercel.json is invalid: ${error}`);
    }
  }

  private validateEnvExample(): void {
    if (!existsSync('.env.example')) {
      this.result.warnings.push('.env.example file not found');
      return;
    }

    const envExample = readFileSync('.env.example', 'utf8');
    const requiredVars = ['DATABASE_URL', 'NEXTAUTH_SECRET', 'NEXTAUTH_URL'];
    
    for (const varName of requiredVars) {
      if (!envExample.includes(varName)) {
        this.result.warnings.push(`Missing environment variable example: ${varName}`);
      }
    }
  }

  public validate(): ValidationResult {
    console.log('🔍 Starting comprehensive environment validation...\n');

    // Validate each environment variable
    for (const rule of this.rules) {
      const value = process.env[rule.key];

      if (rule.required && !value) {
        this.result.errors.push(`Required environment variable ${rule.key} is missing`);
        continue;
      }

      if (rule.productionOnly && !this.isProduction) {
        continue;
      }

      if (value && rule.validator && !rule.validator(value)) {
        this.result.errors.push(`Environment variable ${rule.key} failed validation`);
      }

      if (value) {
        this.result.info.push(`✓ ${rule.key}: ${rule.description}`);
      }
    }

    // Specific validations
    if (process.env.NEXTAUTH_URL) {
      this.validateNextAuthUrl(process.env.NEXTAUTH_URL);
    }

    this.validateGoogleOAuth();
    this.validatePrismaFiles();
    this.validateVercelConfig();
    this.validateEnvExample();

    // Environment-specific checks
    if (this.isProduction || this.isVercelBuild) {
      this.result.info.push('Running production environment checks');
    }

    if (this.isVercelBuild) {
      this.result.info.push('Running in Vercel build environment');
    }

    return this.result;
  }

  public printResults(result: ValidationResult): void {
    console.log('📋 Validation Results:\n');

    if (result.info.length > 0) {
      console.log('ℹ️  INFORMATION:');
      result.info.forEach(info => console.log(`  ${info}`));
      console.log();
    }

    if (result.warnings.length > 0) {
      console.log('⚠️  WARNINGS (should review):');
      result.warnings.forEach(warning => console.log(`  - ${warning}`));
      console.log();
    }

    if (result.errors.length > 0) {
      console.log('❌ ERRORS (must fix):');
      result.errors.forEach(error => console.log(`  - ${error}`));
      console.log();
    }

    if (result.errors.length === 0 && result.warnings.length === 0) {
      console.log('🎉 All validations passed! Environment is ready for deployment.');
    } else if (result.errors.length === 0) {
      console.log('✅ No critical errors found. Review warnings but deployment should succeed.');
    } else {
      console.log('💥 Critical errors found. Fix these before deploying.');
    }
  }
}

// Main execution
if (require.main === module) {
  const validator = new EnvironmentValidator();
  const result = validator.validate();
  validator.printResults(result);

  if (result.errors.length > 0) {
    process.exit(1);
  }
}

export { EnvironmentValidator };