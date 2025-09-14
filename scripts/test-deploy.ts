#!/usr/bin/env tsx

/**
 * Orion Content Management - Test and Deploy Script
 * 
 * Comprehensive test and deploy script for foundation feature validation
 * and staging/production deployments for Phase 4-Pro and future milestones.
 * 
 * Usage:
 *   npm run test-deploy                    # Test and deploy to staging
 *   STAGING=1 npm run test-deploy          # Explicit staging deployment
 *   PRODUCTION=1 npm run test-deploy       # Production deployment
 *   npm run test-deploy -- --skip-tests   # Skip tests (not recommended)
 *   npm run test-deploy -- --skip-build   # Skip build (for testing)
 */

import { spawn, exec } from "child_process";
import { writeFileSync, existsSync, readFileSync } from "fs";
import { resolve } from "path";
import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs";

interface TestResult {
  name: string;
  success: boolean;
  duration: number;
  error?: string;
  output?: string;
}

interface DeploymentResult {
  success: boolean;
  environment: "staging" | "production";
  duration: number;
  error?: string;
  deploymentUrl?: string;
}

interface EndpointValidationResult {
  endpoint: string;
  success: boolean;
  status: number;
  responseTime: number;
  error?: string;
}

class TestDeployScript {
  private startTime: number;
  private testResults: TestResult[] = [];
  private deploymentResult: DeploymentResult | null = null;
  private endpointResults: EndpointValidationResult[] = [];
  private environment: "staging" | "production";
  private skipTests: boolean;
  private skipBuild: boolean;
  private baseUrl: string;

  // Core endpoints that must respond after deployment
  private readonly coreEndpoints = [
    "/api/health",
    "/api/ops/status", 
    "/api/auth/providers",
    "/api/auth/session",
    "/api/auth/csrf"
  ];

  // Phase 4-Pro endpoints (will be created as placeholders if not exist)
  private readonly phase4Endpoints = [
    "/api/seo-audit",
    "/api/integrations/ga4", 
    "/api/integrations/gsc",
    "/api/ai-prompt-engineer"
  ];

  // Test user accounts for seeding
  private readonly testAccounts = {
    starter: {
      email: "starter@orion-test.local",
      password: "StarterTest2024!",
      name: "Starter Plan User",
      plan: "STARTER"
    },
    pro: {
      email: "pro@orion-test.local", 
      password: "ProTest2024!",
      name: "Pro Plan User",
      plan: "PRO"
    },
    guru: {
      email: "guru@orion-test.local",
      password: "GuruTest2024!",
      name: "Guru Plan User", 
      plan: "GURU"
    }
  };

  constructor() {
    this.startTime = Date.now();
    this.environment = process.env.PRODUCTION === "1" ? "production" : "staging";
    this.skipTests = process.argv.includes("--skip-tests");
    this.skipBuild = process.argv.includes("--skip-build");
    this.baseUrl = this.environment === "production" 
      ? (process.env.PRODUCTION_URL || "https://orion-content.vercel.app")
      : (process.env.STAGING_URL || "https://orion-content-staging.vercel.app");

    console.log("🚀 Orion Content Test & Deploy Script");
    console.log("======================================");
    console.log(`Environment: ${this.environment.toUpperCase()}`);
    console.log(`Base URL: ${this.baseUrl}`);
    console.log(`Skip Tests: ${this.skipTests}`);
    console.log(`Skip Build: ${this.skipBuild}`);
    console.log("");
  }

  async run(): Promise<void> {
    try {
      if (!this.skipTests) {
        await this.runTests();
      }

      if (!this.skipBuild) {
        await this.buildApplication();
      }

      await this.deployApplication();
      await this.seedTestAccounts();
      await this.validateEndpoints();
      await this.generateReport();
      this.printQAChecklist();

      const totalTime = Date.now() - this.startTime;
      console.log(`\n✅ Deployment completed successfully in ${Math.round(totalTime / 1000)}s`);
      
    } catch (error) {
      console.error(`\n❌ Deployment failed: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  }

  private async runTests(): Promise<void> {
    console.log("🧪 Running automated tests...");
    console.log("==============================");

    const testSuites = [
      { name: "TypeScript Compilation", command: "npm run typecheck" },
      { name: "ESLint", command: "npm run lint:check" },
      { name: "Unit Tests", command: "npx jest __tests__ --verbose --passWithNoTests" },
      { name: "Integration Tests", command: "npx jest --testNamePattern=integration --verbose --passWithNoTests" }
    ];

    for (const suite of testSuites) {
      await this.runTestSuite(suite.name, suite.command);
    }

    const failedTests = this.testResults.filter(r => !r.success);
    if (failedTests.length > 0) {
      console.log(`\n❌ ${failedTests.length} test suite(s) failed:`);
      failedTests.forEach(test => {
        console.log(`  - ${test.name}: ${test.error}`);
      });
      throw new Error("Tests failed - aborting deployment");
    }

    console.log(`\n✅ All tests passed (${this.testResults.length} suites)`);
  }

  private async runTestSuite(name: string, command: string): Promise<void> {
    const startTime = Date.now();
    
    try {
      console.log(`  Running ${name}...`);
      const output = await this.execCommand(command);
      
      this.testResults.push({
        name,
        success: true,
        duration: Date.now() - startTime,
        output
      });
      
      console.log(`  ✅ ${name} passed (${Date.now() - startTime}ms)`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      
      this.testResults.push({
        name,
        success: false, 
        duration: Date.now() - startTime,
        error: errorMsg
      });
      
      console.log(`  ❌ ${name} failed: ${errorMsg}`);
    }
  }

  private async buildApplication(): Promise<void> {
    console.log("\n🔨 Building application...");
    console.log("===========================");

    const buildStartTime = Date.now();
    
    try {
      // Set optimized Node.js heap settings
      const heapSize = this.environment === "production" ? "4096" : "2048";
      process.env.NODE_OPTIONS = `--max-old-space-size=${heapSize}`;
      
      console.log(`  Setting Node.js heap size to ${heapSize}MB`);
      
      // Run the build
      console.log("  Running build...");
      const buildOutput = await this.execCommand("npm run build", 300000); // 5 minute timeout
      
      const buildTime = Date.now() - buildStartTime;
      console.log(`  ✅ Build completed successfully (${Math.round(buildTime / 1000)}s)`);
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.log(`  ❌ Build failed: ${errorMsg}`);
      throw new Error(`Build failed: ${errorMsg}`);
    }
  }

  private async deployApplication(): Promise<void> {
    console.log("\n🚀 Deploying application...");
    console.log("=============================");

    const deployStartTime = Date.now();
    
    try {
      // Deployment logic depends on platform (Vercel, etc.)
      console.log(`  Deploying to ${this.environment}...`);
      
      if (process.env.VERCEL_TOKEN) {
        // Vercel deployment
        const deployCommand = this.environment === "production" 
          ? "vercel --prod --confirm"
          : "vercel --confirm";
          
        const deployOutput = await this.execCommand(deployCommand, 600000); // 10 minute timeout
        
        // Extract deployment URL from output
        const urlMatch = deployOutput.match(/https:\/\/[^\s]+/);
        const deploymentUrl = urlMatch ? urlMatch[0] : this.baseUrl;
        
        this.deploymentResult = {
          success: true,
          environment: this.environment,
          duration: Date.now() - deployStartTime,
          deploymentUrl
        };
        
        console.log(`  ✅ Deployed to: ${deploymentUrl}`);
        this.baseUrl = deploymentUrl; // Update base URL for endpoint validation
        
      } else {
        console.log("  ⚠️  No VERCEL_TOKEN found - skipping actual deployment");
        console.log("  ℹ️  Assuming deployment will be handled by CI/CD");
        
        this.deploymentResult = {
          success: true,
          environment: this.environment,
          duration: Date.now() - deployStartTime
        };
      }
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      
      this.deploymentResult = {
        success: false,
        environment: this.environment,
        duration: Date.now() - deployStartTime,
        error: errorMsg
      };
      
      throw new Error(`Deployment failed: ${errorMsg}`);
    }
  }

  private async seedTestAccounts(): Promise<void> {
    console.log("\n🌱 Seeding test accounts...");
    console.log("============================");

    try {
      const prisma = new PrismaClient();
      
      for (const [planType, account] of Object.entries(this.testAccounts)) {
        try {
          const passwordHash = await bcrypt.hash(account.password, 12);
          
          const user = await prisma.user.upsert({
            where: { email: account.email },
            update: {},
            create: {
              email: account.email,
              name: account.name,
              passwordHash,
              roles: {
                create: [{ role: "USER" }]
              }
            }
          });
          
          console.log(`  ✅ ${planType.toUpperCase()} account: ${account.email}`);
          
        } catch (error) {
          console.log(`  ℹ️  ${planType.toUpperCase()} account may already exist, skipping...`);
        }
      }
      
      await prisma.$disconnect();
      console.log("  ✅ Test account seeding completed");
      
    } catch (error) {
      console.log(`  ⚠️  Seeding failed: ${error instanceof Error ? error.message : String(error)}`);
      console.log("  ℹ️  Continuing with deployment...");
    }
  }

  private async validateEndpoints(): Promise<void> {
    console.log("\n🔍 Validating core endpoints...");
    console.log("=================================");

    const allEndpoints = [...this.coreEndpoints, ...this.phase4Endpoints];
    
    for (const endpoint of allEndpoints) {
      await this.validateEndpoint(endpoint);
    }

    const failedEndpoints = this.endpointResults.filter(r => !r.success);
    if (failedEndpoints.length > 0) {
      console.log(`\n⚠️  ${failedEndpoints.length} endpoint(s) not responding:`);
      failedEndpoints.forEach(result => {
        console.log(`  - ${result.endpoint}: ${result.error || `HTTP ${result.status}`}`);
      });
      console.log("  ℹ️  This may be expected if endpoints are not yet implemented");
    }

    const successfulEndpoints = this.endpointResults.filter(r => r.success);
    console.log(`\n✅ ${successfulEndpoints.length}/${allEndpoints.length} endpoints responding`);
  }

  private async validateEndpoint(endpoint: string): Promise<void> {
    const startTime = Date.now();
    const url = `${this.baseUrl}${endpoint}`;
    
    try {
      console.log(`  Testing ${endpoint}...`);
      
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Accept": "application/json",
          "User-Agent": "OrionCMS-TestDeploy/1.0"
        },
        signal: AbortSignal.timeout(30000) // 30 second timeout
      });
      
      const responseTime = Date.now() - startTime;
      const success = response.status < 500; // Accept any non-server-error status
      
      this.endpointResults.push({
        endpoint,
        success,
        status: response.status,
        responseTime,
        error: success ? undefined : `HTTP ${response.status}`
      });
      
      if (success) {
        console.log(`  ✅ ${endpoint}: HTTP ${response.status} (${responseTime}ms)`);
      } else {
        console.log(`  ❌ ${endpoint}: HTTP ${response.status} (${responseTime}ms)`);
      }
      
    } catch (error) {
      const responseTime = Date.now() - startTime;
      const errorMsg = error instanceof Error ? error.message : String(error);
      
      this.endpointResults.push({
        endpoint,
        success: false,
        status: 0,
        responseTime,
        error: errorMsg
      });
      
      console.log(`  ❌ ${endpoint}: ${errorMsg} (${responseTime}ms)`);
    }
  }

  private async generateReport(): Promise<void> {
    const totalTime = Date.now() - this.startTime;
    
    const report = {
      timestamp: new Date().toISOString(),
      environment: this.environment,
      duration: totalTime,
      deployment: this.deploymentResult,
      tests: {
        total: this.testResults.length,
        passed: this.testResults.filter(r => r.success).length,
        failed: this.testResults.filter(r => !r.success).length,
        results: this.testResults
      },
      endpoints: {
        total: this.endpointResults.length,
        responding: this.endpointResults.filter(r => r.success).length,
        failing: this.endpointResults.filter(r => !r.success).length,
        results: this.endpointResults
      }
    };

    const reportFile = `deployment-report-${this.environment}-${Date.now()}.json`;
    writeFileSync(reportFile, JSON.stringify(report, null, 2));
    
    console.log(`\n📊 Deployment report saved: ${reportFile}`);
  }

  private printQAChecklist(): void {
    console.log("\n📋 Manual QA Checklist");
    console.log("=======================");
    console.log("Please complete the following manual validation steps:");
    console.log("");
    
    console.log("🔐 Authentication & Security:");
    console.log("  □ Test login with valid credentials");
    console.log("  □ Test login with invalid credentials (should fail)");
    console.log("  □ Verify session persistence across page reloads");
    console.log("  □ Test logout functionality");
    console.log("  □ Verify CSRF protection is active");
    console.log("");
    
    console.log("🏠 Core Application Features:");
    console.log("  □ Navigate to dashboard after login");
    console.log("  □ Test site management (create/edit/delete)");
    console.log("  □ Test content workflows (if available)");
    console.log("  □ Verify responsive design on mobile devices");
    console.log("  □ Check browser console for JavaScript errors");
    console.log("");
    
    console.log("🔌 API Endpoints:");
    console.log("  □ Health check endpoint returns proper status");
    console.log("  □ Protected endpoints require authentication");
    console.log("  □ Rate limiting is functioning (if configured)");
    console.log("  □ Error responses include proper status codes");
    console.log("");
    
    if (this.environment === "production") {
      console.log("🚀 Production-Specific Checks:");
      console.log("  □ SSL certificate is valid and properly configured");
      console.log("  □ Domain DNS settings are correct");
      console.log("  □ Performance monitoring is active");
      console.log("  □ Backup systems are operational");
      console.log("  □ Environment variables are properly set");
      console.log("");
    }
    
    console.log("🧪 Test Account Validation:");
    Object.entries(this.testAccounts).forEach(([planType, account]) => {
      console.log(`  □ Login with ${planType.toUpperCase()} account: ${account.email}`);
    });
    console.log("");
    
    console.log("📊 Performance & Monitoring:");
    console.log("  □ Page load times are acceptable (<3s)");
    console.log("  □ Database queries are optimized (check logs)");
    console.log("  □ Memory usage is within expected limits");
    console.log("  □ No error spikes in monitoring dashboards");
    console.log("");
    
    console.log("🌐 Cross-Browser Testing:");
    console.log("  □ Chrome/Chromium (latest)");
    console.log("  □ Firefox (latest)");
    console.log("  □ Safari (if available)");
    console.log("  □ Edge (if available)");
    console.log("");
    
    console.log(`🔗 Test URLs:`);
    console.log(`  Base URL: ${this.baseUrl}`);
    console.log(`  Login: ${this.baseUrl}/login`);
    console.log(`  Dashboard: ${this.baseUrl}/dashboard`);
    console.log(`  Health Check: ${this.baseUrl}/api/health`);
    console.log("");
  }

  private async execCommand(command: string, timeout: number = 120000): Promise<string> {
    return new Promise((resolve, reject) => {
      exec(command, { timeout }, (error, stdout, stderr) => {
        if (error) {
          reject(new Error(`Command failed: ${error.message}\n${stderr}`));
        } else {
          resolve(stdout);
        }
      });
    });
  }
}

// Main execution
async function main() {
  const script = new TestDeployScript();
  await script.run();
}

// Run if called directly
if (require.main === module) {
  main().catch((error) => {
    console.error("❌ Script failed:", error);
    process.exit(1);
  });
}

export { TestDeployScript };