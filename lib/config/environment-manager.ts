/**
 * Enterprise Environment Manager
 * Phase 1 Enhancement: Comprehensive environment configuration and validation
 */

import { logger } from "@/lib/logger";
import * as crypto from "crypto";

interface EnvironmentConfig {
  environment: "development" | "staging" | "production" | "test";
  database: {
    url: string;
    directUrl?: string;
    maxConnections: number;
    connectionTimeout: number;
    queryTimeout: number;
  };
  auth: {
    secret: string;
    url: string;
    providers: string[];
    sessionTimeout: number;
  };
  api: {
    keys: Record<string, string>;
    rateLimits: Record<string, number>;
    timeouts: Record<string, number>;
  };
  security: {
    encryptionKey: string;
    jwtSecret: string;
    corsOrigins: string[];
    trustedProxies: string[];
  };
  features: {
    flags: Record<string, boolean>;
    experiments: Record<string, any>;
  };
  monitoring: {
    logLevel: string;
    metricsEnabled: boolean;
    tracingEnabled: boolean;
    healthCheckInterval: number;
  };
  cache: {
    redis?: {
      url: string;
      maxRetries: number;
      retryDelay: number;
    };
    memory: {
      maxSize: number;
      ttl: number;
    };
  };
}

interface ValidationRule {
  key: string;
  required: boolean;
  type: "string" | "number" | "boolean" | "url" | "email" | "json";
  validator?: (value: any) => boolean;
  transformer?: (value: string) => any;
  sensitive?: boolean;
}

export class EnvironmentManager {
  private static instance: EnvironmentManager;
  private config: EnvironmentConfig;
  private validationRules: ValidationRule[] = [];
  private secrets: Map<string, string> = new Map();

  private constructor() {
    this.setupValidationRules();
    this.config = this.loadAndValidateConfig();
    this.setupSecretManagement();
  }

  public static getInstance(): EnvironmentManager {
    if (!EnvironmentManager.instance) {
      EnvironmentManager.instance = new EnvironmentManager();
    }
    return EnvironmentManager.instance;
  }

  public getConfig(): EnvironmentConfig {
    return { ...this.config };
  }

  public get<T = any>(key: string, defaultValue?: T): T {
    const keys = key.split(".");
    let value: any = this.config;

    for (const k of keys) {
      value = value?.[k];
    }

    return value !== undefined ? value : (defaultValue as T);
  }

  public isProduction(): boolean {
    return this.config.environment === "production";
  }

  public isDevelopment(): boolean {
    return this.config.environment === "development";
  }

  public isTest(): boolean {
    return this.config.environment === "test";
  }

  public getSecret(key: string): string | undefined {
    return this.secrets.get(key);
  }

  public validateConfiguration(): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate all rules
    for (const rule of this.validationRules) {
      const value = process.env[rule.key];

      if (rule.required && !value) {
        errors.push(`Required environment variable ${rule.key} is missing`);
        continue;
      }

      if (value && rule.validator && !rule.validator(value)) {
        errors.push(`Environment variable ${rule.key} failed validation`);
      }
    }

    // Environment-specific validations
    if (this.isProduction()) {
      if (
        !this.config.security.encryptionKey ||
        this.config.security.encryptionKey.length < 32
      ) {
        errors.push(
          "Production requires strong encryption key (32+ characters)",
        );
      }

      if (this.config.monitoring.logLevel === "debug") {
        warnings.push("Debug logging enabled in production");
      }

      if (
        !this.config.auth.secret ||
        this.config.auth.secret === "development-secret"
      ) {
        errors.push("Production requires secure auth secret");
      }
    }

    // Database validation
    if (
      !this.config.database.url.includes("sslmode=require") &&
      this.isProduction()
    ) {
      warnings.push("SSL not enforced for database connection in production");
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  public generateConfigReport(): string {
    const validation = this.validateConfiguration();
    const _sensitiveKeys = this.validationRules
      .filter((rule) => rule.sensitive)
      .map((rule) => rule.key);

    let report = "# Environment Configuration Report\n\n";
    report += `Environment: ${this.config.environment}\n`;
    report += `Generated: ${new Date().toISOString()}\n\n`;

    // Configuration status
    report += "## Configuration Status\n";
    report += `- Valid: ${validation.isValid ? "✅" : "❌"}\n`;
    report += `- Errors: ${validation.errors.length}\n`;
    report += `- Warnings: ${validation.warnings.length}\n\n`;

    // Errors and warnings
    if (validation.errors.length > 0) {
      report += "## Errors\n";
      validation.errors.forEach((error) => {
        report += `- ❌ ${error}\n`;
      });
      report += "\n";
    }

    if (validation.warnings.length > 0) {
      report += "## Warnings\n";
      validation.warnings.forEach((warning) => {
        report += `- ⚠️ ${warning}\n`;
      });
      report += "\n";
    }

    // Environment variables summary
    report += "## Environment Variables\n";
    for (const rule of this.validationRules) {
      const value = process.env[rule.key];
      const status = value ? "✅" : "❌";
      const displayValue =
        rule.sensitive && value ? "[REDACTED]" : value || "[NOT SET]";

      report += `- ${status} ${rule.key}: ${displayValue}\n`;
    }

    return report;
  }

  public async refreshConfig(): Promise<void> {
    logger.info("Refreshing environment configuration");

    try {
      const newConfig = this.loadAndValidateConfig();
      const validation = this.validateConfiguration();

      if (!validation.isValid) {
        logger.error("Configuration refresh failed validation", {
          errors: validation.errors,
          warnings: validation.warnings,
        });
        throw new Error(
          `Configuration validation failed: ${validation.errors.join(", ")}`,
        );
      }

      this.config = newConfig;
      logger.info("Environment configuration refreshed successfully");
    } catch (error) {
      logger.error("Failed to refresh configuration", {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  private loadAndValidateConfig(): EnvironmentConfig {
    const _env = process.env;

    // Transform and validate environment variables
    const config: EnvironmentConfig = {
      environment: (env.NODE_ENV as any) || "development",

      database: {
        url: env.DATABASE_URL || "",
        directUrl: env.DIRECT_URL,
        maxConnections: parseInt(env.DATABASE_MAX_CONNECTIONS || "20"),
        connectionTimeout: parseInt(env.DATABASE_CONNECTION_TIMEOUT || "10000"),
        queryTimeout: parseInt(env.DATABASE_QUERY_TIMEOUT || "5000"),
      },

      auth: {
        secret: env.NEXTAUTH_SECRET || "",
        url: env.NEXTAUTH_URL || "http://localhost:3000",
        providers: (env.AUTH_PROVIDERS || "credentials").split(","),
        sessionTimeout: parseInt(env.SESSION_TIMEOUT || "86400"),
      },

      api: {
        keys: {
          openai: env.OPENAI_API_KEY || "",
          google: env.GOOGLE_API_KEY || "",
          perplexity: env.PERPLEXITY_API_KEY || "",
        },
        rateLimits: {
          default: parseInt(env.RATE_LIMIT_DEFAULT || "100"),
          auth: parseInt(env.RATE_LIMIT_AUTH || "10"),
          api: parseInt(env.RATE_LIMIT_API || "1000"),
        },
        timeouts: {
          default: parseInt(env.API_TIMEOUT_DEFAULT || "30000"),
          upload: parseInt(env.API_TIMEOUT_UPLOAD || "60000"),
        },
      },

      security: {
        encryptionKey: env.ENCRYPTION_KEY || "",
        jwtSecret: env.JWT_SECRET || "",
        corsOrigins: (env.CORS_ORIGINS || "*").split(","),
        trustedProxies: (env.TRUSTED_PROXIES || "").split(",").filter(Boolean),
      },

      features: {
        flags: {
          analytics: env.ENABLE_ANALYTICS === "true",
          automation: env.ENABLE_AUTOMATION === "true",
          seoTools: env.ENABLE_SEO_TOOLS === "true",
          competitiveAnalysis: env.ENABLE_COMPETITIVE_ANALYSIS === "true",
        },
        experiments: {},
      },

      monitoring: {
        logLevel: env.LOG_LEVEL || "info",
        metricsEnabled: env.ENABLE_METRICS !== "false",
        tracingEnabled: env.ENABLE_TRACING === "true",
        healthCheckInterval: parseInt(env.HEALTH_CHECK_INTERVAL || "30000"),
      },

      cache: {
        redis: env.REDIS_URL
          ? {
              url: env.REDIS_URL,
              maxRetries: parseInt(env.REDIS_MAX_RETRIES || "3"),
              retryDelay: parseInt(env.REDIS_RETRY_DELAY || "1000"),
            }
          : undefined,
        memory: {
          maxSize: parseInt(env.MEMORY_CACHE_SIZE || "100"),
          ttl: parseInt(env.MEMORY_CACHE_TTL || "300000"),
        },
      },
    };

    return config;
  }

  private setupValidationRules(): void {
    this.validationRules = [
      // Core environment
      { key: "NODE_ENV", required: true, type: "string" },

      // Database
      { key: "DATABASE_URL", required: true, type: "url", sensitive: true },
      { key: "DIRECT_URL", required: false, type: "url", sensitive: true },

      // Authentication
      {
        key: "NEXTAUTH_SECRET",
        required: true,
        type: "string",
        sensitive: true,
      },
      { key: "NEXTAUTH_URL", required: true, type: "url" },

      // Security
      {
        key: "ENCRYPTION_KEY",
        required: true,
        type: "string",
        sensitive: true,
      },
      { key: "JWT_SECRET", required: false, type: "string", sensitive: true },

      // API Keys
      {
        key: "OPENAI_API_KEY",
        required: false,
        type: "string",
        sensitive: true,
      },
      {
        key: "GOOGLE_API_KEY",
        required: false,
        type: "string",
        sensitive: true,
      },

      // Optional services
      { key: "REDIS_URL", required: false, type: "url", sensitive: true },

      // Monitoring
      {
        key: "LOG_LEVEL",
        required: false,
        type: "string",
        validator: (value) =>
          ["error", "warn", "info", "debug"].includes(value),
      },
    ];
  }

  private setupSecretManagement(): void {
    // Load sensitive values into secure storage
    for (const rule of this.validationRules) {
      if (rule.sensitive) {
        const value = process.env[rule.key];
        if (value) {
          this.secrets.set(rule.key, value);
        }
      }
    }
  }
}

// Export singleton instance
export const envManager = EnvironmentManager.getInstance();

// Utility functions
export const requireEnv = (key: string): string => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Required environment variable ${key} is not set`);
  }
  return value;
};

export const getEnv = (key: string, defaultValue: string): string => {
  return process.env[key] || defaultValue;
};

export const getBoolEnv = (
  key: string,
  defaultValue: boolean = false,
): boolean => {
  const value = process.env[key];
  if (value === undefined) return defaultValue;
  return value.toLowerCase() === "true";
};

export const getIntEnv = (key: string, defaultValue: number): number => {
  const value = process.env[key];
  if (value === undefined) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
};
