import { z } from "zod";

const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().url().optional(),

  // Redis
  REDIS_URL: z.string().url().optional(),

  // Authentication
  NEXTAUTH_SECRET: z.string().min(1).optional(),
  NEXTAUTH_URL: z.string().url().optional(),

  // API Keys
  OPENAI_API_KEY: z.string().optional(),
  PERPLEXITY_API_KEY: z.string().optional(),

  // Encryption
  ENCRYPTION_KEY: z.string().min(1).optional(),

  // Session
  SESSION_SECRET: z.string().min(1).optional(),

  // Environment
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),

  // Optional integrations
  GOOGLE_ANALYTICS_PROPERTY_ID: z.string().optional(),
  GOOGLE_SERVICE_ACCOUNT_KEY: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

const env = envSchema.parse(process.env);

export { env };
