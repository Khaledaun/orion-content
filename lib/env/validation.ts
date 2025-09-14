import { z } from "zod";

// Environment validation schema
const envSchema = z.object({
  // Core NextAuth
  NEXTAUTH_URL: z.string().url("NEXTAUTH_URL must be a valid URL"),
  NEXTAUTH_SECRET: z
    .string()
    .min(32, "NEXTAUTH_SECRET must be at least 32 characters"),

  // Database
  DATABASE_URL: z.string().url("DATABASE_URL must be a valid database URL"),
  DIRECT_URL: z.string().url().optional(),

  // Redis for sessions and rate limiting
  REDIS_URL: z.string().url("REDIS_URL must be a valid Redis URL").optional(),
  UPSTASH_REDIS_URL: z.string().url().optional(),
  UPSTASH_REDIS_TOKEN: z.string().optional(),

  // OAuth Providers
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GITHUB_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),

  // JWT and Encryption
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  ENCRYPTION_KEY: z
    .string()
    .min(32, "ENCRYPTION_KEY must be at least 32 characters"),

  // Email for 2FA and notifications
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().optional(),
  SMTP_USER: z.string().email().optional(),
  SMTP_PASS: z.string().optional(),

  // Rate Limiting
  RATE_LIMIT_REQUESTS: z.coerce.number().default(100),
  RATE_LIMIT_WINDOW: z.coerce.number().default(900000),

  // Security
  ENABLE_2FA: z
    .string()
    .transform((val) => val === "true")
    .default("true"),
  ENABLE_AUDIT_LOGGING: z
    .string()
    .transform((val) => val === "true")
    .default("true"),

  // Environment
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  VERCEL: z.string().optional(),
});

export type EnvConfig = z.infer<typeof envSchema>;

class EnvironmentValidator {
  private static instance: EnvironmentValidator;
  private config: EnvConfig | null = null;
  private errors: string[] = [];
  private warnings: string[] = [];

  private constructor() {}

  static getInstance(): EnvironmentValidator {
    if (!EnvironmentValidator.instance) {
      EnvironmentValidator.instance = new EnvironmentValidator();
    }
    return EnvironmentValidator.instance;
  }

  validate(): {
    success: boolean;
    config?: EnvConfig;
    errors: string[];
    warnings: string[];
  } {
    try {
      this.config = envSchema.parse(process.env);
      this.performAdditionalValidation();

      return {
        success: this.errors.length === 0,
        config: this.config,
        errors: this.errors,
        warnings: this.warnings,
      };
    } catch (error) {
      if (error instanceof z.ZodError) {
        this.errors = error.errors.map(
          (err) => `${err.path.join(".")}: ${err.message}`,
        );
      } else {
        this.errors = ["Unknown validation error"];
      }

      return {
        success: false,
        errors: this.errors,
        warnings: this.warnings,
      };
    }
  }

  private performAdditionalValidation() {
    if (!this.config) return;

    // Production-specific validations
    if (this.config.NODE_ENV === "production" || this.config.VERCEL) {
      if (this.config.NEXTAUTH_URL.includes("localhost")) {
        this.errors.push("NEXTAUTH_URL cannot use localhost in production");
      }

      if (!this.config.NEXTAUTH_URL.startsWith("https://")) {
        this.errors.push("NEXTAUTH_URL must use HTTPS in production");
      }

      if (
        this.config.NEXTAUTH_SECRET === "demo-secret-please-set-in-production"
      ) {
        this.errors.push("Demo NEXTAUTH_SECRET cannot be used in production");
      }
    }

    // OAuth provider validation
    const hasGoogleOAuth =
      this.config.GOOGLE_CLIENT_ID && this.config.GOOGLE_CLIENT_SECRET;
    const hasGitHubOAuth =
      this.config.GITHUB_CLIENT_ID && this.config.GITHUB_CLIENT_SECRET;

    if (this.config.GOOGLE_CLIENT_ID && !this.config.GOOGLE_CLIENT_SECRET) {
      this.errors.push(
        "GOOGLE_CLIENT_SECRET is required when GOOGLE_CLIENT_ID is set",
      );
    }

    if (this.config.GITHUB_CLIENT_ID && !this.config.GITHUB_CLIENT_SECRET) {
      this.errors.push(
        "GITHUB_CLIENT_SECRET is required when GITHUB_CLIENT_ID is set",
      );
    }

    // Redis validation for session management
    const hasRedis =
      this.config.REDIS_URL ||
      (this.config.UPSTASH_REDIS_URL && this.config.UPSTASH_REDIS_TOKEN);
    if (!hasRedis) {
      this.warnings.push(
        "No Redis configuration found - sessions will use JWT only",
      );
    }

    // SMTP validation for 2FA
    if (this.config.ENABLE_2FA) {
      const hasSmtp =
        this.config.SMTP_HOST && this.config.SMTP_USER && this.config.SMTP_PASS;
      if (!hasSmtp) {
        this.warnings.push(
          "2FA is enabled but SMTP is not configured - email-based 2FA will not work",
        );
      }
    }

    // Rate limiting validation
    if (this.config.RATE_LIMIT_REQUESTS > 1000) {
      this.warnings.push(
        "Rate limit is set very high - consider lowering for better security",
      );
    }
  }

  getConfig(): EnvConfig | null {
    return this.config;
  }

  isValid(): boolean {
    return this.errors.length === 0;
  }

  getErrors(): string[] {
    return this.errors;
  }

  getWarnings(): string[] {
    return this.warnings;
  }
}

// Export singleton instance
export const envValidator = EnvironmentValidator.getInstance();

// Check if we're in a build environment
const isBuildTime =
  process.env.NODE_ENV === undefined ||
  process.env.CI === "true" ||
  process.env.VERCEL === "1";

// Validate on module load
const validation = envValidator.validate();

if (!validation.success) {
  console.error("❌ Environment Validation Errors:");
  validation.errors.forEach((error) => console.error(`  - ${error}`));

  // Only throw error if not in build environment
  if (!isBuildTime) {
    throw new Error(
      `Environment configuration invalid: ${validation.errors.join(", ")}`,
    );
  } else {
    console.warn(
      "⚠️ Build environment detected - continuing despite validation errors",
    );
  }
}

if (validation.warnings.length > 0) {
  console.warn("⚠️ Environment Validation Warnings:");
  validation.warnings.forEach((warning) => console.warn(`  - ${warning}`));
}

// Use empty defaults for build time if validation fails
export const env =
  validation.config ||
  ({
    NEXTAUTH_URL: "https://localhost:3000",
    NEXTAUTH_SECRET: "build-time-secret-not-for-production-use",
    DATABASE_URL: "postgresql://localhost:5432/placeholder",
    JWT_SECRET: "build-time-jwt-secret-not-for-production",
    ENCRYPTION_KEY: "build-time-encryption-key-32-chars",
    NODE_ENV: "development",
    RATE_LIMIT_REQUESTS: 100,
    RATE_LIMIT_WINDOW: 900000,
    ENABLE_2FA: false,
    ENABLE_AUDIT_LOGGING: false,
  } as EnvConfig);
