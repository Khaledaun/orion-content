import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";

// Environment validation helper
function validateEnvironment() {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate NEXTAUTH_URL
  const nextAuthUrl = process.env.NEXTAUTH_URL;
  if (!nextAuthUrl) {
    errors.push("NEXTAUTH_URL is required but not set");
  } else {
    try {
      const url = new URL(nextAuthUrl);
      if (!["http:", "https:"].includes(url.protocol)) {
        errors.push("NEXTAUTH_URL must be a valid HTTP or HTTPS URL");
      }
      if (url.pathname !== "/") {
        warnings.push("NEXTAUTH_URL should not include a path component");
      }
    } catch (e) {
      errors.push("NEXTAUTH_URL is not a valid URL format");
    }
  }

  // Validate NEXTAUTH_SECRET
  const nextAuthSecret = process.env.NEXTAUTH_SECRET;
  if (!nextAuthSecret) {
    errors.push("NEXTAUTH_SECRET is required but not set");
  } else if (nextAuthSecret.length < 32) {
    errors.push("NEXTAUTH_SECRET must be at least 32 characters long");
  } else if (nextAuthSecret === "demo-secret-please-set-in-production") {
    warnings.push(
      "Using demo NEXTAUTH_SECRET - please set a secure secret in production",
    );
  }

  // Validate DATABASE_URL
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    warnings.push("DATABASE_URL not set - auth will fall back to demo mode");
  } else {
    try {
      const url = new URL(databaseUrl);
      if (
        !["postgresql:", "postgres:", "mysql:", "sqlite:"].includes(
          url.protocol,
        )
      ) {
        warnings.push("DATABASE_URL protocol may not be supported");
      }
    } catch (e) {
      warnings.push("DATABASE_URL is not a valid URL format");
    }
  }

  // Check for production-specific requirements
  if (process.env.NODE_ENV === "production" || process.env.VERCEL === "1") {
    if (nextAuthUrl?.includes("localhost")) {
      errors.push("NEXTAUTH_URL must not use localhost in production");
    }
    if (!nextAuthUrl?.startsWith("https://")) {
      errors.push("NEXTAUTH_URL must use HTTPS in production");
    }
  }

  return { errors, warnings };
}

// Validate environment on module load
const envValidation = validateEnvironment();

// Check if we're in a build environment
const isBuildTime =
  process.env.NODE_ENV === undefined ||
  process.env.CI === "true" ||
  process.env.VERCEL === "1";

if (envValidation.errors.length > 0) {
  console.error("❌ NextAuth Environment Validation Errors:");
  envValidation.errors.forEach((error) => console.error(`  - ${error}`));

  // Only throw error if not in build environment
  if (!isBuildTime) {
    throw new Error(
      `NextAuth configuration invalid: ${envValidation.errors.join(", ")}`,
    );
  } else {
    console.warn(
      "⚠️ Build environment detected - continuing despite NextAuth validation errors",
    );
  }
}

if (envValidation.warnings.length > 0) {
  console.warn("⚠️ NextAuth Environment Validation Warnings:");
  envValidation.warnings.forEach((warning) => console.warn(`  - ${warning}`));
}

// Safe prisma import that handles cases where Prisma client is not generated yet
let prisma: any = null;
try {
  const prismaModule = require("@/app/lib/prisma");
  prisma = prismaModule.prisma;
  if (!prisma) {
    console.warn("Prisma client is null, falling back to demo auth only");
  }
} catch (error) {
  console.warn(
    "Prisma client not available, falling back to demo auth only:",
    error instanceof Error ? error.message : String(error),
  );
}

import * as bcryptjs from "bcryptjs";

export const authOptions: NextAuthOptions = {
  secret:
    process.env.NEXTAUTH_SECRET || "build-time-secret-not-for-production-use",
  session: { strategy: "jwt" },

  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email?.toString().trim().toLowerCase();
        const password = credentials?.password?.toString() ?? "";
        if (!email || !password) return null;

        // If Prisma is available, use database auth
        if (prisma) {
          try {
            const user = await prisma.user.findUnique({ where: { email } });
            if (!user) return null;

            // Pick the available password field in your schema
            const hash =
              (user as any).passwordHash ??
              (user as any).hashedPassword ??
              null;
            if (!hash) return null;

            const ok = await bcryptjs.compare(password, hash);
            if (!ok) return null;

            return {
              id: user.id,
              email: (user as any).email ?? email,
              name: (user as any).name ?? null,
            };
          } catch (error) {
            console.error("Database auth error:", error);
            return null;
          }
        }

        // Fallback demo auth when Prisma is not available
        if (email === "demo@example.com" && password === "demo123") {
          return {
            id: "demo-user",
            email: email,
            name: "Demo User",
          };
        }

        return null;
      },
    }),

    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
          }),
        ]
      : []),
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) token.sub = (user as any).id;
      return token;
    },
    async session({ session, token }) {
      if (session.user && token?.sub) {
        (session.user as any).id = token.sub as string;
      }
      return session;
    },
  },
};
