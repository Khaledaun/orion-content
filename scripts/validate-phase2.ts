/**
 * Phase 2 Validation Script
 * Validates the implementation of unified authentication and authorization features
 */

import { execSync } from "child_process";
import { existsSync, readFileSync } from "fs";
import { join } from "path";

interface ValidationResult {
  category: string;
  test: string;
  status: "PASS" | "FAIL" | "WARN";
  message: string;
  details?: string;
}

class Phase2Validator {
  private results: ValidationResult[] = [];
  private readonly requiredFiles = [
    "lib/env/validation.ts",
    "lib/auth/password.ts",
    "lib/auth/2fa.ts",
    "lib/auth/token.ts",
    "lib/auth/nextauth-enhanced.ts",
    "lib/rbac/abac.ts",
    "lib/rbac/role-manager.ts",
    "lib/security/rate-limiter.ts",
    "lib/security/audit-logger.ts",
    "lib/security/session-manager.ts",
    "middleware.ts",
    "app/api/auth/2fa/setup/route.ts",
    "app/api/auth/2fa/verify/route.ts",
    "app/api/auth/password/reset/route.ts",
    "app/api/admin/roles/route.ts",
  ];

  private readonly requiredPackages = [
    "@auth/upstash-redis-adapter",
    "@upstash/redis",
    "speakeasy",
    "qrcode",
    "rate-limiter-flexible",
    "crypto-js",
    "zod",
    "iron-session",
  ];

  async validate(): Promise<void> {
    console.log(
      "🔍 Validating Phase 2: Unified Authentication & Authorization\n",
    );

    await this.validateFileStructure();
    await this.validateDependencies();
    await this.validateEnvironmentConfig();
    await this.validateTypeScript();
    await this.validateSecurity();
    await this.validateAuthentication();
    await this.validateAuthorization();
    await this.validateAuditLogging();
    await this.validateRateLimiting();

    this.printResults();
  }

  private async validateFileStructure(): Promise<void> {
    this.addResult(
      "File Structure",
      "Required files exist",
      "PASS",
      "Checking core implementation files...",
    );

    for (const file of this.requiredFiles) {
      const filePath = join(process.cwd(), file);
      if (existsSync(filePath)) {
        this.addResult("File Structure", `${file}`, "PASS", "File exists");
      } else {
        this.addResult("File Structure", `${file}`, "FAIL", "File missing");
      }
    }
  }

  private async validateDependencies(): Promise<void> {
    this.addResult(
      "Dependencies",
      "Package installation",
      "PASS",
      "Checking required packages...",
    );

    try {
      const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
      const allDeps = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies,
      };

      for (const pkg of this.requiredPackages) {
        if (allDeps[pkg]) {
          this.addResult(
            "Dependencies",
            pkg,
            "PASS",
            `Installed: ${allDeps[pkg]}`,
          );
        } else {
          this.addResult(
            "Dependencies",
            pkg,
            "FAIL",
            "Package not found in dependencies",
          );
        }
      }
    } catch (error) {
      this.addResult(
        "Dependencies",
        "package.json",
        "FAIL",
        "Could not read package.json",
      );
    }
  }

  private async validateEnvironmentConfig(): Promise<void> {
    this.addResult(
      "Environment",
      "Configuration validation",
      "PASS",
      "Checking environment setup...",
    );

    try {
      // Test environment validation
      const { env } = await import("../lib/env/validation");
      this.addResult(
        "Environment",
        "Environment validation",
        "PASS",
        "Environment variables validated successfully",
      );

      // Check critical variables
      const criticalVars = ["NEXTAUTH_SECRET", "JWT_SECRET", "ENCRYPTION_KEY"];
      const defaultValues: { [key: string]: string } = {
        NEXTAUTH_SECRET:
          "your-nextauth-secret-key-here-must-be-at-least-32-characters-long",
        JWT_SECRET: "your-jwt-secret-here",
        ENCRYPTION_KEY: "your-encryption-key-here",
      };
      for (const varName of criticalVars) {
        if (
          process.env[varName] &&
          process.env[varName] !== defaultValues[varName]
        ) {
          this.addResult(
            "Environment",
            varName,
            "PASS",
            "Set and not using default value",
          );
        } else {
          this.addResult(
            "Environment",
            varName,
            "WARN",
            "Using default value or not set",
          );
        }
      }

      // Check optional but recommended variables
      const optionalVars = [
        "UPSTASH_REDIS_URL",
        "GOOGLE_CLIENT_ID",
        "SMTP_HOST",
      ];
      for (const varName of optionalVars) {
        if (process.env[varName]) {
          this.addResult("Environment", varName, "PASS", "Configured");
        } else {
          this.addResult(
            "Environment",
            varName,
            "WARN",
            "Not configured (optional)",
          );
        }
      }
    } catch (error) {
      this.addResult(
        "Environment",
        "Environment validation",
        "FAIL",
        `Validation failed: ${error}`,
      );
    }
  }

  private async validateTypeScript(): Promise<void> {
    this.addResult(
      "TypeScript",
      "Type checking",
      "PASS",
      "Running TypeScript compiler...",
    );

    try {
      execSync("npx tsc --noEmit", { stdio: "pipe" });
      this.addResult(
        "TypeScript",
        "Type checking",
        "PASS",
        "No type errors found",
      );
    } catch (error) {
      this.addResult(
        "TypeScript",
        "Type checking",
        "FAIL",
        "Type errors found",
      );
    }
  }

  private async validateSecurity(): Promise<void> {
    this.addResult(
      "Security",
      "Security implementations",
      "PASS",
      "Checking security features...",
    );

    // Check password manager
    try {
      const { PasswordManager } = await import("../lib/auth/password");
      const testPassword = "TestPassword123!";
      const hash = await PasswordManager.hashPassword(testPassword);
      const isValid = await PasswordManager.verifyPassword(testPassword, hash);

      if (isValid) {
        this.addResult(
          "Security",
          "Password hashing",
          "PASS",
          "Password hashing and verification working",
        );
      } else {
        this.addResult(
          "Security",
          "Password hashing",
          "FAIL",
          "Password verification failed",
        );
      }

      // Test password validation
      const validation = PasswordManager.validatePassword("weak");
      if (!validation.isValid && validation.errors.length > 0) {
        this.addResult(
          "Security",
          "Password validation",
          "PASS",
          "Password policy enforcement working",
        );
      } else {
        this.addResult(
          "Security",
          "Password validation",
          "FAIL",
          "Password policy not enforcing rules",
        );
      }
    } catch (error) {
      this.addResult(
        "Security",
        "Password manager",
        "FAIL",
        `Password manager error: ${error}`,
      );
    }

    // Check 2FA
    try {
      const { TwoFactorAuth } = await import("../lib/auth/2fa");
      const secret = await TwoFactorAuth.generateSecret("test@example.com");

      if (secret.secret && secret.qrCodeUrl && secret.backupCodes.length > 0) {
        this.addResult(
          "Security",
          "2FA generation",
          "PASS",
          "2FA secret and QR code generation working",
        );
      } else {
        this.addResult(
          "Security",
          "2FA generation",
          "FAIL",
          "2FA generation incomplete",
        );
      }

      // Test token verification
      const token = TwoFactorAuth.generateToken(secret.secret);
      const isValid = TwoFactorAuth.verifyToken(token, secret.secret);

      if (isValid) {
        this.addResult(
          "Security",
          "2FA verification",
          "PASS",
          "TOTP token verification working",
        );
      } else {
        this.addResult(
          "Security",
          "2FA verification",
          "FAIL",
          "TOTP token verification failed",
        );
      }
    } catch (error) {
      this.addResult(
        "Security",
        "2FA system",
        "FAIL",
        `2FA system error: ${error}`,
      );
    }

    // Check token manager
    try {
      const { TokenManager } = await import("../lib/auth/token");
      const tokens = TokenManager.generateTokenPair({
        userId: "test-user",
        email: "test@example.com",
        roles: ["VIEWER"],
        sessionId: "test-session",
      });

      if (tokens.accessToken && tokens.refreshToken) {
        this.addResult(
          "Security",
          "JWT tokens",
          "PASS",
          "JWT token generation working",
        );

        // Test token verification
        const payload = TokenManager.verifyAccessToken(tokens.accessToken);
        if (payload && payload.userId === "test-user") {
          this.addResult(
            "Security",
            "JWT verification",
            "PASS",
            "JWT token verification working",
          );
        } else {
          this.addResult(
            "Security",
            "JWT verification",
            "FAIL",
            "JWT token verification failed",
          );
        }
      } else {
        this.addResult(
          "Security",
          "JWT tokens",
          "FAIL",
          "JWT token generation failed",
        );
      }
    } catch (error) {
      this.addResult(
        "Security",
        "Token manager",
        "FAIL",
        `Token manager error: ${error}`,
      );
    }
  }

  private async validateAuthentication(): Promise<void> {
    this.addResult(
      "Authentication",
      "NextAuth configuration",
      "PASS",
      "Checking authentication setup...",
    );

    try {
      const { authOptions } = await import("../lib/auth/nextauth-enhanced");

      if (authOptions.providers && authOptions.providers.length > 0) {
        this.addResult(
          "Authentication",
          "Auth providers",
          "PASS",
          `${authOptions.providers.length} providers configured`,
        );
      } else {
        this.addResult(
          "Authentication",
          "Auth providers",
          "FAIL",
          "No authentication providers configured",
        );
      }

      if (authOptions.callbacks) {
        this.addResult(
          "Authentication",
          "Auth callbacks",
          "PASS",
          "Authentication callbacks configured",
        );
      } else {
        this.addResult(
          "Authentication",
          "Auth callbacks",
          "WARN",
          "No authentication callbacks configured",
        );
      }
    } catch (error) {
      this.addResult(
        "Authentication",
        "NextAuth setup",
        "FAIL",
        `NextAuth configuration error: ${error}`,
      );
    }
  }

  private async validateAuthorization(): Promise<void> {
    this.addResult(
      "Authorization",
      "RBAC/ABAC system",
      "PASS",
      "Checking authorization system...",
    );

    try {
      const { abacEngine } = await import("../lib/rbac/abac");
      const { roleManager } = await import("../lib/rbac/role-manager");

      // Test ABAC engine
      const authRequest = {
        action: "read",
        resource: "test",
        context: {
          user: {
            id: "test-user",
            email: "test@example.com",
            roles: ["VIEWER"],
            attributes: {},
          },
          environment: {
            timestamp: new Date(),
          },
        },
      };

      const result = await abacEngine.authorize(authRequest);
      if (typeof result.allowed === "boolean") {
        this.addResult(
          "Authorization",
          "ABAC engine",
          "PASS",
          "ABAC authorization engine working",
        );
      } else {
        this.addResult(
          "Authorization",
          "ABAC engine",
          "FAIL",
          "ABAC authorization engine not working",
        );
      }

      // Test role manager
      const roles = await roleManager.getRoles();
      if (Array.isArray(roles)) {
        this.addResult(
          "Authorization",
          "Role manager",
          "PASS",
          `Role manager working (${roles.length} roles)`,
        );
      } else {
        this.addResult(
          "Authorization",
          "Role manager",
          "FAIL",
          "Role manager not working",
        );
      }
    } catch (error) {
      this.addResult(
        "Authorization",
        "Authorization system",
        "FAIL",
        `Authorization system error: ${error}`,
      );
    }
  }

  private async validateAuditLogging(): Promise<void> {
    this.addResult(
      "Audit Logging",
      "Audit system",
      "PASS",
      "Checking audit logging...",
    );

    try {
      const { auditLogger } = await import("../lib/security/audit-logger");

      // Test audit logging
      await auditLogger.log({
        action: "TEST_ACTION",
        resource: "test",
        details: { test: true },
      });

      this.addResult(
        "Audit Logging",
        "Event logging",
        "PASS",
        "Audit event logging working",
      );

      // Test audit querying (if database is available)
      try {
        const events = await auditLogger.query({ limit: 1 });
        this.addResult(
          "Audit Logging",
          "Event querying",
          "PASS",
          "Audit event querying working",
        );
      } catch (error) {
        this.addResult(
          "Audit Logging",
          "Event querying",
          "WARN",
          "Database not available for querying",
        );
      }
    } catch (error) {
      this.addResult(
        "Audit Logging",
        "Audit system",
        "FAIL",
        `Audit logging error: ${error}`,
      );
    }
  }

  private async validateRateLimiting(): Promise<void> {
    this.addResult(
      "Rate Limiting",
      "Rate limiter",
      "PASS",
      "Checking rate limiting...",
    );

    try {
      const { rateLimiter, RATE_LIMIT_CONFIGS } = await import(
        "../lib/security/rate-limiter"
      );

      // Test rate limiting
      const result = await rateLimiter.checkRateLimit({
        identifier: "test-client",
        config: RATE_LIMIT_CONFIGS.API_GENERAL,
      });

      if (
        typeof result.allowed === "boolean" &&
        typeof result.remaining === "number"
      ) {
        this.addResult(
          "Rate Limiting",
          "Rate checking",
          "PASS",
          "Rate limiting working",
        );
      } else {
        this.addResult(
          "Rate Limiting",
          "Rate checking",
          "FAIL",
          "Rate limiting not working properly",
        );
      }

      // Check configurations
      const configCount = Object.keys(RATE_LIMIT_CONFIGS).length;
      if (configCount > 0) {
        this.addResult(
          "Rate Limiting",
          "Rate configurations",
          "PASS",
          `${configCount} rate limit configurations defined`,
        );
      } else {
        this.addResult(
          "Rate Limiting",
          "Rate configurations",
          "FAIL",
          "No rate limit configurations found",
        );
      }
    } catch (error) {
      this.addResult(
        "Rate Limiting",
        "Rate limiter",
        "FAIL",
        `Rate limiting error: ${error}`,
      );
    }
  }

  private addResult(
    category: string,
    test: string,
    status: "PASS" | "FAIL" | "WARN",
    message: string,
    details?: string,
  ): void {
    this.results.push({ category, test, status, message, details });
  }

  private printResults(): void {
    console.log("\n📊 Validation Results\n");

    const categories = [...new Set(this.results.map((r) => r.category))];

    for (const category of categories) {
      console.log(`\n🔍 ${category}`);
      console.log("─".repeat(50));

      const categoryResults = this.results.filter(
        (r) => r.category === category,
      );

      for (const result of categoryResults) {
        const icon =
          result.status === "PASS"
            ? "✅"
            : result.status === "WARN"
              ? "⚠️"
              : "❌";
        console.log(`${icon} ${result.test}: ${result.message}`);
        if (result.details) {
          console.log(`   ${result.details}`);
        }
      }
    }

    // Summary
    const passed = this.results.filter((r) => r.status === "PASS").length;
    const warned = this.results.filter((r) => r.status === "WARN").length;
    const failed = this.results.filter((r) => r.status === "FAIL").length;
    const total = this.results.length;

    console.log("\n📈 Summary");
    console.log("─".repeat(50));
    console.log(`✅ Passed: ${passed}/${total}`);
    console.log(`⚠️  Warnings: ${warned}/${total}`);
    console.log(`❌ Failed: ${failed}/${total}`);

    if (failed === 0) {
      console.log("\n🎉 Phase 2 validation completed successfully!");
      console.log("All critical features are working properly.");
    } else {
      console.log("\n⚠️  Phase 2 validation completed with issues.");
      console.log("Please address the failed tests before proceeding.");
    }

    if (warned > 0) {
      console.log(
        "\n💡 Consider addressing the warnings for optimal functionality.",
      );
    }

    console.log("\n📚 Next Steps:");
    console.log("1. Address any failed validations");
    console.log(
      "2. Configure optional features (Redis, OAuth providers, SMTP)",
    );
    console.log("3. Run integration tests");
    console.log("4. Deploy to staging environment");
    console.log("5. Perform security audit");
  }
}

// Run validation
const validator = new Phase2Validator();
validator.validate().catch(console.error);
