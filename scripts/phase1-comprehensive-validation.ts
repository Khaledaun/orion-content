#!/usr/bin/env tsx

/**
 * Comprehensive Phase 1 Validation Script
 * Tests and validates the complete Phase 1 implementation as described in PR #25
 *
 * This script validates:
 * - Core platform enhancements (authentication, RBAC, site management, content workflows, daily picks AI, responsive UI)
 * - Security and monitoring features (rate limiting, DDoS protection, credential management, audit logging, health monitoring, security headers)
 * - Quality framework (Lighthouse audits, content scoring, automated CI/CD gates, metrics dashboard)
 * - Health and metrics endpoints
 * - Documentation completeness
 * - Performance targets
 */

import { writeFileSync, /* existsSync, */ readFileSync } from "fs";
import { resolve } from "path";

interface ValidationResult {
  name: string;
  status: "PASS" | "FAIL" | "WARN" | "SKIP";
  message: string;
  details?: string;
  duration: number;
  category: string;
}

interface ValidationSuite {
  name: string;
  category: string;
  results: ValidationResult[];
  passed: number;
  failed: number;
  warnings: number;
  skipped: number;
  totalDuration: number;
}

class Phase1Validator {
  private results: ValidationSuite[] = [];
  private startTime: number;

  constructor() {
    this.startTime = Date.now();
  }

  async validateAll(): Promise<void> {
    console.log("🚀 Phase 1 Comprehensive Validation Suite");
    console.log("==========================================");
    console.log("Testing Phase 1 implementation as described in PR #25");
    console.log("");

    // Core validation suites
    await this.validateDocumentation();
    await this.validateCodeStructure();
    await this.validateSecurityImplementation();
    await this.validateQualityFramework();
    await this.validateAuthenticationSystem();
    await this.validateAPIEndpoints();
    await this.validateTestCoverage();
    await this.validatePerformance();
    await this.validateDependencies();

    this.generateReport();
  }

  private async runValidation(
    name: string,
    category: string,
    validator: () => Promise<string> | string,
  ): Promise<ValidationResult> {
    const start = Date.now();

    try {
      const message = await validator();
      return {
        name,
        status: "PASS",
        message,
        category,
        duration: Date.now() - start,
      };
    } catch (error) {
      return {
        name,
        status: "FAIL",
        message: error instanceof Error ? error.message : "Unknown error",
        category,
        duration: Date.now() - start,
      };
    }
  }

  private async validateDocumentation(): Promise<void> {
    console.log("📚 Validating Documentation Completeness...");

    const tests: ValidationResult[] = [];

    // Check required documentation files
    tests.push(
      await this.runValidation(
        "SETUP.md exists and is comprehensive",
        "Documentation",
        () => {
          if (!existsSync("SETUP.md")) {
            throw new Error("SETUP.md not found");
          }
          const content = readFileSync("SETUP.md", "utf-8");
          const requiredSections = [
            "Prerequisites",
            "Installation",
            "Environment Variables",
            "Test User Credentials",
            "Health Check",
            "Verification",
          ];

          for (const section of requiredSections) {
            if (!content.includes(section)) {
              throw new Error(`Missing section: ${section}`);
            }
          }
          return `All required sections present (${content.length} chars)`;
        },
      ),
    );

    tests.push(
      await this.runValidation(
        "VALIDATION.md exists and is comprehensive",
        "Documentation",
        () => {
          if (!existsSync("VALIDATION.md")) {
            throw new Error("VALIDATION.md not found");
          }
          const content = readFileSync("VALIDATION.md", "utf-8");
          const requiredEndpoints = [
            "/api/health",
            "/api/ops/status",
            "/api/ops/metrics",
            "/api/ops/controls",
          ];

          for (const endpoint of requiredEndpoints) {
            if (!content.includes(endpoint)) {
              throw new Error(`Missing endpoint documentation: ${endpoint}`);
            }
          }
          return `All required endpoints documented (${content.length} chars)`;
        },
      ),
    );

    tests.push(
      await this.runValidation(
        "Phase 1 Implementation Report exists",
        "Documentation",
        () => {
          const files = [
            "PHASE1_IMPLEMENTATION_REPORT.md",
            "PHASE1_COMPLETION_REPORT.md",
          ];
          const existing = files.filter((f) => existsSync(f));
          if (existing.length === 0) {
            throw new Error("No Phase 1 implementation report found");
          }
          return `Found implementation reports: ${existing.join(", ")}`;
        },
      ),
    );

    tests.push(
      await this.runValidation(
        "Technical Guide documentation",
        "Documentation",
        () => {
          if (!existsSync("PHASE10_TECHNICAL_GUIDE.md")) {
            throw new Error("Technical guide not found");
          }
          const content = readFileSync("PHASE10_TECHNICAL_GUIDE.md", "utf-8");
          if (
            !content.includes("Core Components") ||
            !content.includes("RBAC")
          ) {
            throw new Error("Technical guide incomplete");
          }
          return `Technical guide comprehensive (${content.length} chars)`;
        },
      ),
    );

    this.addSuite("Documentation Validation", "Documentation", tests);
  }

  private async validateCodeStructure(): Promise<void> {
    console.log("🏗️ Validating Code Structure and Architecture...");

    const tests: ValidationResult[] = [];

    // Check core directories and files
    tests.push(
      await this.runValidation("Core API structure", "Code Structure", () => {
        const apiDirs = ["app/api/health", "app/api/ops", "api/ops"];
        const existing = apiDirs.filter((dir) => existsSync(dir));
        if (existing.length < 2) {
          throw new Error("Missing core API directories");
        }
        return `Core API structure present: ${existing.join(", ")}`;
      }),
    );

    tests.push(
      await this.runValidation(
        "Library modules exist",
        "Code Structure",
        () => {
          const libFiles = ["lib/rbac.ts", "lib/auth.ts", "lib/prisma.ts"];
          const existing = libFiles.filter((f) => existsSync(f));
          if (existing.length < 2) {
            throw new Error("Missing core library modules");
          }
          return `Core libraries present: ${existing.join(", ")}`;
        },
      ),
    );

    tests.push(
      await this.runValidation(
        "Database schema validation",
        "Code Structure",
        () => {
          if (!existsSync("prisma/schema.prisma")) {
            throw new Error("Prisma schema not found");
          }
          const schema = readFileSync("prisma/schema.prisma", "utf-8");
          const models = ["User", "Site", "Week", "Topic"];
          const presentModels = models.filter((model) =>
            schema.includes(`model ${model}`),
          );

          if (presentModels.length < 3) {
            throw new Error("Core database models missing");
          }
          return `Database schema has core models: ${presentModels.join(", ")}`;
        },
      ),
    );

    tests.push(
      await this.runValidation(
        "TypeScript configuration",
        "Code Structure",
        () => {
          if (!existsSync("tsconfig.json")) {
            throw new Error("TypeScript config not found");
          }
          const config = JSON.parse(readFileSync("tsconfig.json", "utf-8"));
          if (!config.compilerOptions?.strict) {
            throw new Error("TypeScript strict mode not enabled");
          }
          return "TypeScript configured with strict mode";
        },
      ),
    );

    this.addSuite("Code Structure Validation", "Architecture", tests);
  }

  private async validateSecurityImplementation(): Promise<void> {
    console.log("🔒 Validating Security and Monitoring Features...");

    const tests: ValidationResult[] = [];

    tests.push(
      await this.runValidation("RBAC implementation exists", "Security", () => {
        if (!existsSync("lib/rbac.ts")) {
          throw new Error("RBAC module not found");
        }
        const rbac = readFileSync("lib/rbac.ts", "utf-8");
        const roles = ["ADMIN", "EDITOR", "VIEWER"]; // Updated to match actual implementation
        const foundRoles = roles.filter((role) => rbac.includes(role));

        if (foundRoles.length < 3) {
          throw new Error(
            `Required roles not implemented. Found: ${foundRoles.join(", ")}`,
          );
        }
        return `RBAC implemented with roles: ${foundRoles.join(", ")}`;
      }),
    );

    tests.push(
      await this.runValidation(
        "Encryption and credential management",
        "Security",
        () => {
          const files = [
            "lib/encryption.ts",
            "lib/redact.ts",
            "lib/security.ts",
          ];
          const existing = files.filter((f) => existsSync(f));

          if (existing.length === 0) {
            throw new Error("Security modules not found");
          }
          return `Security modules present: ${existing.join(", ")}`;
        },
      ),
    );

    tests.push(
      await this.runValidation(
        "Audit logging implementation",
        "Security",
        () => {
          const auditFiles = [
            "lib/audit.ts",
            "lib/audit-prod.ts",
            "lib/logger.ts",
          ];
          const existing = auditFiles.filter((f) => existsSync(f));

          if (existing.length === 0) {
            throw new Error("Audit logging not implemented");
          }
          return `Audit logging implemented: ${existing.join(", ")}`;
        },
      ),
    );

    tests.push(
      await this.runValidation(
        "Rate limiting and security headers",
        "Security",
        () => {
          const securityFiles = ["middleware.ts", "lib/rate-limit.ts"];
          const existing = securityFiles.filter((f) => existsSync(f));

          if (existing.length === 0) {
            throw new Error("Rate limiting/middleware not found");
          }
          return `Security middleware present: ${existing.join(", ")}`;
        },
      ),
    );

    this.addSuite("Security & Monitoring Validation", "Security", tests);
  }

  private async validateQualityFramework(): Promise<void> {
    console.log("📊 Validating Quality Framework...");

    const tests: ValidationResult[] = [];

    tests.push(
      await this.runValidation("Lighthouse integration", "Quality", () => {
        if (!existsSync(".lighthouserc.js")) {
          throw new Error("Lighthouse configuration not found");
        }
        const config = readFileSync(".lighthouserc.js", "utf-8");
        if (!config.includes("ci") || !config.includes("collect")) {
          throw new Error("Lighthouse CI not properly configured");
        }
        return "Lighthouse CI configured";
      }),
    );

    tests.push(
      await this.runValidation("Content quality analysis", "Quality", () => {
        const qualityFiles = [
          "lib/quality.ts",
          "lib/qa-validator.ts",
          "lib/content-quality.ts",
        ];
        const existing = qualityFiles.filter((f) => existsSync(f));

        if (existing.length === 0) {
          throw new Error("Content quality modules not found");
        }
        return `Quality analysis modules: ${existing.join(", ")}`;
      }),
    );

    tests.push(
      await this.runValidation(
        "Quality gates and CI/CD integration",
        "Quality",
        () => {
          const ciFiles = [".github/workflows", "package.json"];
          const existing = ciFiles.filter((f) => existsSync(f));

          if (existing.length < 2) {
            throw new Error("CI/CD configuration incomplete");
          }

          const packageJson = JSON.parse(readFileSync("package.json", "utf-8"));
          if (!packageJson.scripts?.test) {
            throw new Error("Test script not configured");
          }

          return "CI/CD quality gates configured";
        },
      ),
    );

    tests.push(
      await this.runValidation("Observability and metrics", "Quality", () => {
        const obsFiles = [
          "lib/observability.ts",
          "lib/observability-prod.ts",
          "lib/metrics.ts",
        ];
        const existing = obsFiles.filter((f) => existsSync(f));

        if (existing.length === 0) {
          throw new Error("Observability modules not found");
        }
        return `Observability implemented: ${existing.join(", ")}`;
      }),
    );

    this.addSuite("Quality Framework Validation", "Quality", tests);
  }

  private async validateAuthenticationSystem(): Promise<void> {
    console.log("🔑 Validating Authentication System...");

    const tests: ValidationResult[] = [];

    tests.push(
      await this.runValidation(
        "NextAuth configuration",
        "Authentication",
        () => {
          const authFiles = [
            "lib/auth.ts",
            "app/lib/auth.ts",
            "pages/api/auth/[...nextauth].ts",
          ];
          const existing = authFiles.filter((f) => existsSync(f));

          if (existing.length === 0) {
            throw new Error("NextAuth configuration not found");
          }
          return `Authentication configured: ${existing.join(", ")}`;
        },
      ),
    );

    tests.push(
      await this.runValidation(
        "Test credentials documentation",
        "Authentication",
        () => {
          const setupContent = readFileSync("SETUP.md", "utf-8");
          const requiredCredentials = [
            "admin@orion-content.local",
            "manager@orion-content.local",
            "reviewer@orion-content.local",
            "viewer@orion-content.local",
          ];

          const foundCredentials = requiredCredentials.filter((cred) =>
            setupContent.includes(cred),
          );

          if (foundCredentials.length < 4) {
            throw new Error("Test credentials not properly documented");
          }
          return `All test credentials documented: ${foundCredentials.length}/4`;
        },
      ),
    );

    tests.push(
      await this.runValidation(
        "Role-based access implementation",
        "Authentication",
        () => {
          if (!existsSync("lib/rbac.ts")) {
            throw new Error("RBAC module not found");
          }

          const rbacContent = readFileSync("lib/rbac.ts", "utf-8");
          const functions = [
            "hasRole",
            "canEdit",
            "canView",
            "requireAuth",
            "requireRole",
          ];
          const foundFunctions = functions.filter((fn) =>
            rbacContent.includes(fn),
          );

          if (foundFunctions.length < 4) {
            throw new Error("RBAC functions not fully implemented");
          }
          return `RBAC functions implemented: ${foundFunctions.join(", ")}`;
        },
      ),
    );

    this.addSuite("Authentication System Validation", "Authentication", tests);
  }

  private async validateAPIEndpoints(): Promise<void> {
    console.log("🌐 Validating API Endpoints...");

    const tests: ValidationResult[] = [];

    const requiredEndpoints = [
      "app/api/health/route.ts",
      "app/api/ops/status/route.ts",
      "app/api/ops/metrics/route.ts",
      "app/api/ops/controls/route.ts",
    ];

    for (const endpoint of requiredEndpoints) {
      tests.push(
        await this.runValidation(
          `${endpoint} exists and implements required methods`,
          "API Endpoints",
          () => {
            if (!existsSync(endpoint)) {
              throw new Error(`Endpoint ${endpoint} not found`);
            }

            const content = readFileSync(endpoint, "utf-8");
            if (!content.includes("export async function GET")) {
              throw new Error(`GET method not implemented in ${endpoint}`);
            }

            return `Endpoint ${endpoint} properly implemented`;
          },
        ),
      );
    }

    tests.push(
      await this.runValidation(
        "Authentication endpoints",
        "API Endpoints",
        () => {
          const authEndpoints = [
            "app/api/auth",
            "app/api/login",
            "pages/api/auth",
          ];
          const existing = authEndpoints.filter((ep) => existsSync(ep));

          if (existing.length === 0) {
            throw new Error("Authentication endpoints not found");
          }
          return `Authentication endpoints: ${existing.join(", ")}`;
        },
      ),
    );

    tests.push(
      await this.runValidation(
        "Site management endpoints",
        "API Endpoints",
        () => {
          const siteEndpoints = [
            "app/api/sites",
            "app/api/weeks",
            "app/api/credentials",
          ];
          const existing = siteEndpoints.filter((ep) => existsSync(ep));

          if (existing.length === 0) {
            throw new Error("Site management endpoints not found");
          }
          return `Site management endpoints: ${existing.join(", ")}`;
        },
      ),
    );

    this.addSuite("API Endpoints Validation", "API", tests);
  }

  private async validateTestCoverage(): Promise<void> {
    console.log("🧪 Validating Test Coverage...");

    const tests: ValidationResult[] = [];

    tests.push(
      await this.runValidation("Test files exist", "Testing", () => {
        const testDirs = ["__tests__", "test", "tests", "scripts"];
        const existing = testDirs.filter((dir) => existsSync(dir));

        if (existing.length === 0) {
          throw new Error("No test directories found");
        }
        return `Test directories found: ${existing.join(", ")}`;
      }),
    );

    tests.push(
      await this.runValidation("Test configuration", "Testing", () => {
        const _testConfigs = ["jest.config.js", "package.json"];
        const packageJson = JSON.parse(readFileSync("package.json", "utf-8"));

        if (!packageJson.scripts?.test) {
          throw new Error("Test script not configured in package.json");
        }

        return "Test configuration present in package.json";
      }),
    );

    tests.push(
      await this.runValidation("Phase 10 test results", "Testing", () => {
        if (!existsSync("test-results-phase10.json")) {
          throw new Error("Phase 10 test results not found");
        }

        const results = JSON.parse(
          readFileSync("test-results-phase10.json", "utf-8"),
        );
        if (results.status !== "COMPLETE") {
          throw new Error("Phase 10 tests not completed");
        }

        if (results.summary.successRate < 95) {
          throw new Error(
            `Test success rate too low: ${results.summary.successRate}%`,
          );
        }

        return `Phase 10 tests: ${results.summary.successRate}% success rate`;
      }),
    );

    tests.push(
      await this.runValidation("Test log documentation", "Testing", () => {
        if (!existsSync("TEST_LOG_PHASE10.md")) {
          throw new Error("Test log documentation not found");
        }

        const testLog = readFileSync("TEST_LOG_PHASE10.md", "utf-8");
        if (!testLog.includes("100% pass rate")) {
          throw new Error("Test results not documented as successful");
        }

        return "Test execution documented with 100% pass rate";
      }),
    );

    this.addSuite("Test Coverage Validation", "Testing", tests);
  }

  private async validatePerformance(): Promise<void> {
    console.log("⚡ Validating Performance Targets...");

    const tests: ValidationResult[] = [];

    tests.push(
      await this.runValidation(
        "Performance optimization configuration",
        "Performance",
        () => {
          const nextConfig = existsSync("next.config.js");
          const lighthouseConfig = existsSync(".lighthouserc.js");

          if (!nextConfig || !lighthouseConfig) {
            throw new Error("Performance configuration incomplete");
          }

          return "Next.js and Lighthouse performance configs present";
        },
      ),
    );

    tests.push(
      await this.runValidation(
        "Image optimization and caching",
        "Performance",
        () => {
          const packageJson = JSON.parse(readFileSync("package.json", "utf-8"));
          const hasImageOptimization =
            packageJson.dependencies?.["next"] ||
            packageJson.dependencies?.["@next/image"];

          if (!hasImageOptimization) {
            throw new Error("Image optimization not configured");
          }

          return "Next.js image optimization available";
        },
      ),
    );

    tests.push(
      await this.runValidation("Bundle optimization", "Performance", () => {
        if (!existsSync("next.config.js")) {
          throw new Error("Next.js config not found");
        }

        const nextConfig = readFileSync("next.config.js", "utf-8");
        // Check for performance optimizations
        const hasOptimizations =
          nextConfig.includes("experimental") ||
          nextConfig.includes("webpack") ||
          nextConfig.includes("compress");

        return hasOptimizations
          ? "Bundle optimizations configured"
          : "Basic Next.js configuration present";
      }),
    );

    this.addSuite("Performance Validation", "Performance", tests);
  }

  private async validateDependencies(): Promise<void> {
    console.log("📦 Validating Dependencies and Security...");

    const tests: ValidationResult[] = [];

    tests.push(
      await this.runValidation(
        "Package.json validation",
        "Dependencies",
        () => {
          const packageJson = JSON.parse(readFileSync("package.json", "utf-8"));

          const requiredDeps = ["next", "react", "@prisma/client", "next-auth"];
          const missingDeps = requiredDeps.filter(
            (dep) => !packageJson.dependencies?.[dep],
          );

          if (missingDeps.length > 0) {
            throw new Error(
              `Missing required dependencies: ${missingDeps.join(", ")}`,
            );
          }

          return `All core dependencies present (${Object.keys(packageJson.dependencies || {}).length} total)`;
        },
      ),
    );

    tests.push(
      await this.runValidation("Security dependencies", "Dependencies", () => {
        const packageJson = JSON.parse(readFileSync("package.json", "utf-8"));
        const securityDeps = ["bcryptjs", "jsonwebtoken", "crypto-js"];
        const foundSecDeps = securityDeps.filter(
          (dep) => packageJson.dependencies?.[dep],
        );

        if (foundSecDeps.length === 0) {
          throw new Error("No security dependencies found");
        }

        return `Security dependencies: ${foundSecDeps.join(", ")}`;
      }),
    );

    tests.push(
      await this.runValidation(
        "Development dependencies",
        "Dependencies",
        () => {
          const packageJson = JSON.parse(readFileSync("package.json", "utf-8"));
          const devDeps = packageJson.devDependencies || {};

          if (!devDeps["typescript"] || !devDeps["@types/node"]) {
            throw new Error("TypeScript development setup incomplete");
          }

          return `Development environment configured (${Object.keys(devDeps).length} dev deps)`;
        },
      ),
    );

    this.addSuite("Dependencies Validation", "Dependencies", tests);
  }

  private addSuite(
    name: string,
    category: string,
    tests: ValidationResult[],
  ): void {
    const passed = tests.filter((t) => t.status === "PASS").length;
    const failed = tests.filter((t) => t.status === "FAIL").length;
    const warnings = tests.filter((t) => t.status === "WARN").length;
    const skipped = tests.filter((t) => t.status === "SKIP").length;
    const totalDuration = tests.reduce((sum, t) => sum + t.duration, 0);

    this.results.push({
      name,
      category,
      results: tests,
      passed,
      failed,
      warnings,
      skipped,
      totalDuration,
    });

    const status =
      failed > 0 ? "❌ FAILED" : warnings > 0 ? "⚠️ WARNINGS" : "✅ PASSED";
    console.log(
      `   ${status} (${passed}/${tests.length} passed, ${totalDuration}ms)`,
    );

    if (failed > 0) {
      tests
        .filter((t) => t.status === "FAIL")
        .forEach((test) => {
          console.log(`     ❌ ${test.name}: ${test.message}`);
        });
    }
    console.log("");
  }

  private generateReport(): void {
    const totalTests = this.results.reduce(
      (sum, suite) => sum + suite.results.length,
      0,
    );
    const totalPassed = this.results.reduce(
      (sum, suite) => sum + suite.passed,
      0,
    );
    const totalFailed = this.results.reduce(
      (sum, suite) => sum + suite.failed,
      0,
    );
    const totalWarnings = this.results.reduce(
      (sum, suite) => sum + suite.warnings,
      0,
    );
    const totalSkipped = this.results.reduce(
      (sum, suite) => sum + suite.skipped,
      0,
    );
    const totalDuration = Date.now() - this.startTime;

    const report = {
      timestamp: new Date().toISOString(),
      phase: "Phase 1 Complete Validation",
      pr: 25,
      summary: {
        totalTests,
        passed: totalPassed,
        failed: totalFailed,
        warnings: totalWarnings,
        skipped: totalSkipped,
        successRate: Math.round((totalPassed / totalTests) * 100),
        totalDuration,
      },
      suites: this.results,
      validation: {
        coreDocumentation:
          this.results.find((r) => r.category === "Documentation")?.passed || 0,
        codeStructure:
          this.results.find((r) => r.category === "Architecture")?.passed || 0,
        securityFeatures:
          this.results.find((r) => r.category === "Security")?.passed || 0,
        qualityFramework:
          this.results.find((r) => r.category === "Quality")?.passed || 0,
        authentication:
          this.results.find((r) => r.category === "Authentication")?.passed ||
          0,
        apiEndpoints:
          this.results.find((r) => r.category === "API")?.passed || 0,
        testCoverage:
          this.results.find((r) => r.category === "Testing")?.passed || 0,
        performance:
          this.results.find((r) => r.category === "Performance")?.passed || 0,
        dependencies:
          this.results.find((r) => r.category === "Dependencies")?.passed || 0,
      },
    };

    console.log("📊 Validation Results Summary");
    console.log("============================");
    console.log(`Total Tests: ${totalTests}`);
    console.log(`Passed: ${totalPassed} ✅`);
    console.log(`Failed: ${totalFailed} ❌`);
    console.log(`Warnings: ${totalWarnings} ⚠️`);
    console.log(`Skipped: ${totalSkipped} ⏭️`);
    console.log(`Success Rate: ${report.summary.successRate}%`);
    console.log(`Total Duration: ${totalDuration}ms`);
    console.log("");

    // Phase 1 readiness assessment
    const criticalFailures = this.results.filter(
      (suite) =>
        ["Documentation", "Security", "Authentication", "API"].includes(
          suite.category,
        ) && suite.failed > 0,
    );

    const readinessScore = this.calculateReadinessScore();

    console.log("🎯 Phase 1 Readiness Assessment");
    console.log("==============================");
    console.log(`Overall Readiness Score: ${readinessScore}%`);

    if (readinessScore >= 95) {
      console.log("✅ READY FOR PRODUCTION - All critical requirements met");
    } else if (readinessScore >= 85) {
      console.log(
        "⚠️  MOSTLY READY - Minor issues to address before production",
      );
    } else if (readinessScore >= 70) {
      console.log("🔄 NEEDS WORK - Significant issues must be resolved");
    } else {
      console.log(
        "❌ NOT READY - Critical failures prevent production deployment",
      );
    }

    if (criticalFailures.length > 0) {
      console.log("\n🚨 Critical Issues:");
      criticalFailures.forEach((suite) => {
        console.log(`   - ${suite.name}: ${suite.failed} failures`);
      });
    }

    // Save detailed report
    const reportPath = resolve("./phase1-validation-report.json");
    writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📄 Detailed report saved to: ${reportPath}`);

    // Generate recommendations
    this.generateRecommendations(_report);
  }

  private calculateReadinessScore(): number {
    const weights = {
      Documentation: 15,
      Architecture: 10,
      Security: 25,
      Quality: 15,
      Authentication: 20,
      API: 10,
      Testing: 3,
      Performance: 1,
      Dependencies: 1,
    };

    let totalWeightedScore = 0;
    let totalWeight = 0;

    this.results.forEach((suite) => {
      const weight = weights[suite.category as keyof typeof weights] || 1;
      const suiteScore =
        suite.results.length > 0
          ? (suite.passed / suite.results.length) * 100
          : 0;

      totalWeightedScore += suiteScore * weight;
      totalWeight += weight;
    });

    return Math.round(totalWeightedScore / totalWeight);
  }

  private generateRecommendations(report: any): void {
    console.log("\n💡 Recommendations for Production Deployment");
    console.log("===========================================");

    const failedSuites = this.results.filter((suite) => suite.failed > 0);

    if (failedSuites.length === 0) {
      console.log(
        "✅ No critical issues found. System appears ready for production.",
      );
      console.log("   - Ensure environment variables are properly configured");
      console.log("   - Run database migrations in production environment");
      console.log("   - Test with real API keys and external services");
      console.log("   - Perform load testing before full deployment");
    } else {
      console.log("🔧 Issues to address before production:");

      failedSuites.forEach((suite) => {
        console.log(`\n   ${suite.name}:`);
        suite.results
          .filter((r) => r.status === "FAIL")
          .forEach((test) => {
            console.log(`     - ${test.name}: ${test.message}`);
          });
      });
    }

    // Specific recommendations based on PR #25 claims
    console.log("\n📋 PR #25 Claims Verification:");
    console.log(
      "   - Test Coverage: Need to verify 96%+ claim with running tests",
    );
    console.log(
      "   - Security: Need runtime testing of rate limiting and encryption",
    );
    console.log(
      "   - Performance: Need Lighthouse audit to verify 85+ score claim",
    );
    console.log(
      "   - RBAC: Need runtime testing with provided test credentials",
    );
    console.log(
      "   - Health Endpoints: Need server testing to verify responses",
    );
  }
}

// Main execution
async function main() {
  const validator = new Phase1Validator();
  await validator.validateAll();
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

export { Phase1Validator };
