#!/usr/bin/env npx tsx

/**
 * Vercel Environment Setup Helper
 * Provides guidance and commands for setting up environment variables in Vercel
 */

import { execSync } from 'child_process';

interface EnvVar {
  key: string;
  description: string;
  required: boolean;
  example?: string;
  production?: boolean;
}

class VercelEnvSetup {
  private envVars: EnvVar[] = [
    {
      key: 'NEXTAUTH_URL',
      description: 'NextAuth.js URL for callbacks and redirects',
      required: true,
      example: 'https://your-app.vercel.app',
      production: true
    },
    {
      key: 'NEXTAUTH_SECRET',
      description: 'NextAuth.js JWT encryption secret (32+ characters)',
      required: true,
      example: 'your-secure-random-secret-here-32chars-minimum'
    },
    {
      key: 'DATABASE_URL',
      description: 'Database connection string',
      required: true,
      example: 'postgresql://user:pass@host/db?sslmode=require'
    },
    {
      key: 'ENCRYPTION_KEY',
      description: '32-character encryption key for sensitive data',
      required: true,
      example: 'your-32-character-encryption-key'
    },
    {
      key: 'OPENAI_API_KEY',
      description: 'OpenAI API key for content generation',
      required: false,
      example: 'sk-your-openai-api-key'
    }
  ];

  private getProjectInfo(): { projectName?: string; orgName?: string } {
    try {
      const vercelJson = require('../vercel.json');
      return { projectName: vercelJson.name };
    } catch {
      return {};
    }
  }

  private generateSecret(length: number = 32): string {
    const crypto = require('crypto');
    return crypto.randomBytes(length).toString('base64').slice(0, length);
  }

  public printSetupInstructions(): void {
    console.log('🚀 Vercel Environment Variables Setup Guide\n');

    const { projectName } = this.getProjectInfo();
    
    console.log('📋 Required Environment Variables:\n');

    this.envVars.forEach(envVar => {
      const required = envVar.required ? '(REQUIRED)' : '(OPTIONAL)';
      console.log(`${envVar.key} ${required}`);
      console.log(`  Description: ${envVar.description}`);
      
      if (envVar.key === 'NEXTAUTH_SECRET') {
        const generatedSecret = this.generateSecret();
        console.log(`  Generated value: ${generatedSecret}`);
      } else if (envVar.key === 'ENCRYPTION_KEY') {
        const generatedKey = this.generateSecret();
        console.log(`  Generated value: ${generatedKey}`);
      } else if (envVar.example) {
        console.log(`  Example: ${envVar.example}`);
      }
      console.log();
    });

    console.log('🔧 Setup Methods:\n');

    console.log('Method 1: Vercel Dashboard (Recommended)');
    console.log('1. Go to https://vercel.com/dashboard');
    if (projectName) {
      console.log(`2. Select your project: ${projectName}`);
    } else {
      console.log('2. Select your project');
    }
    console.log('3. Go to Settings → Environment Variables');
    console.log('4. Add each variable listed above');
    console.log('5. Redeploy your application\n');

    console.log('Method 2: Vercel CLI');
    console.log('# Install Vercel CLI if not installed');
    console.log('npm install -g vercel@latest\n');
    
    console.log('# Add environment variables');
    this.envVars.filter(env => env.required).forEach(envVar => {
      if (envVar.key === 'NEXTAUTH_SECRET') {
        console.log(`vercel env add ${envVar.key} production`);
        console.log(`# Enter: ${this.generateSecret()}`);
      } else if (envVar.key === 'ENCRYPTION_KEY') {
        console.log(`vercel env add ${envVar.key} production`);
        console.log(`# Enter: ${this.generateSecret()}`);
      } else {
        console.log(`vercel env add ${envVar.key} production`);
        console.log(`# Enter your ${envVar.description.toLowerCase()}`);
      }
      console.log();
    });

    console.log('Method 3: .env Files (Development Only)');
    console.log('1. Copy .env.example to .env.local');
    console.log('2. Fill in the values');
    console.log('3. Never commit .env.local to git\n');

    console.log('⚠️  Important Notes:');
    console.log('- Use HTTPS URLs for production NEXTAUTH_URL');
    console.log('- Generate secure random secrets (32+ characters)');
    console.log('- Set environment variables for both Production and Preview environments');
    console.log('- Redeploy after adding environment variables\n');

    console.log('🔍 Verification:');
    console.log('After setting up environment variables, run:');
    console.log('npm run check:env');
    console.log('npm run verify:endpoints https://your-app.vercel.app\n');
  }

  public generateEnvFile(): void {
    console.log('# Generated Environment Variables Template');
    console.log('# Copy these to your Vercel environment variables\n');

    this.envVars.forEach(envVar => {
      if (envVar.key === 'NEXTAUTH_SECRET') {
        console.log(`${envVar.key}=${this.generateSecret()}`);
      } else if (envVar.key === 'ENCRYPTION_KEY') {
        console.log(`${envVar.key}=${this.generateSecret()}`);
      } else if (envVar.example) {
        console.log(`${envVar.key}=${envVar.example}`);
      } else {
        console.log(`${envVar.key}=your-${envVar.key.toLowerCase().replace(/_/g, '-')}-here`);
      }
    });
  }
}

// Main execution
if (require.main === module) {
  const setup = new VercelEnvSetup();
  
  const command = process.argv[2];
  
  if (command === '--generate-only') {
    setup.generateEnvFile();
  } else {
    setup.printSetupInstructions();
  }
}

export { VercelEnvSetup };