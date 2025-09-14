
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import GitHubProvider from "next-auth/providers/github";
import { UpstashRedisAdapter } from "@auth/upstash-redis-adapter";
import { Redis } from "@upstash/redis";
import { prisma } from "@/app/lib/prisma";
import { PasswordManager } from "./password";
import { TwoFactorAuth } from "./2fa";
import { TokenManager } from "./token";
import { env } from "@/lib/env/validation";

// Initialize Redis for session management if available
let redis: Redis | null = null;
if (env.UPSTASH_REDIS_URL && env.UPSTASH_REDIS_TOKEN) {
  redis = new Redis({
    url: env.UPSTASH_REDIS_URL,
    token: env.UPSTASH_REDIS_TOKEN,
  });
}

export const authOptions: NextAuthOptions = {
  secret: env.NEXTAUTH_SECRET,
  
  // Use Redis adapter if available, otherwise fall back to JWT
  ...(redis && {
    adapter: UpstashRedisAdapter(redis, {
      baseKeyPrefix: "orion:auth:",
    }),
  }),
  
  session: {
    strategy: redis ? "database" : "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60, // 24 hours
  },

  providers: [
    // Enhanced Credentials Provider with 2FA support
    CredentialsProvider({
      id: "credentials",
      name: "Email and Password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        totpCode: { label: "2FA Code", type: "text", optional: true },
        rememberMe: { label: "Remember Me", type: "checkbox", optional: true }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password are required");
        }

        const email = credentials.email.toLowerCase().trim();
        const password = credentials.password;

        try {
          // Database authentication
          if (prisma) {
            const user = await prisma.user.findUnique({
              where: { email },
              include: {
                twoFactorAuth: true,
                userRoles: true
              }
            });

            if (!user) {
              throw new Error("Invalid credentials");
            }

            // Verify password
            const passwordHash = (user as any).passwordHash || (user as any).hashedPassword;
            if (!passwordHash || !await PasswordManager.verifyPassword(password, passwordHash)) {
              throw new Error("Invalid credentials");
            }

            // Check if account is locked or disabled
            if ((user as any).isLocked) {
              throw new Error("Account is locked. Please contact support.");
            }

            if (!(user as any).isActive) {
              throw new Error("Account is disabled. Please contact support.");
            }

            // Check 2FA if enabled
            if (user.twoFactorAuth?.isEnabled) {
              if (!credentials.totpCode) {
                throw new Error("2FA_REQUIRED");
              }

              const isValidTotp = TwoFactorAuth.verifyTokenOrBackupCode(
                credentials.totpCode,
                user.twoFactorAuth.secret,
                user.twoFactorAuth.backupCodes || []
              );

              if (!isValidTotp.isValid) {
                throw new Error("Invalid 2FA code");
              }

              // If backup code was used, mark it as used
              if (isValidTotp.usedBackupCode) {
                await prisma.twoFactorAuth.update({
                  where: { userId: user.id },
                  data: {
                    backupCodes: user.twoFactorAuth.backupCodes?.filter(
                      (code: string) => code !== isValidTotp.usedBackupCode
                    ) || []
                  }
                });
              }
            }

            // Update last login
            await prisma.user.update({
              where: { id: user.id },
              data: {
                lastLoginAt: new Date(),
                loginCount: { increment: 1 }
              }
            });

            // Extract roles
            const roles = user.userRoles.map((ur: any) => ur.role);

            return {
              id: user.id,
              email: user.email,
              name: (user as any).name || null,
              image: (user as any).image || null,
              roles,
              emailVerified: (user as any).emailVerified,
              twoFactorEnabled: user.twoFactorAuth?.isEnabled || false
            };
          }

          // Fallback demo authentication
          if (email === "demo@example.com" && password === "demo123") {
            return {
              id: "demo-user",
              email: email,
              name: "Demo User",
              roles: ["VIEWER"],
              emailVerified: new Date(),
              twoFactorEnabled: false
            };
          }

          throw new Error("Invalid credentials");
        } catch (error) {
          console.error("Authentication error:", error);
          throw error;
        }
      }
    }),

    // Google OAuth Provider
    ...(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET ? [
      GoogleProvider({
        clientId: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
        authorization: {
          params: {
            prompt: "consent",
            access_type: "offline",
            response_type: "code",
            scope: "openid email profile"
          }
        }
      })
    ] : []),

    // GitHub OAuth Provider
    ...(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET ? [
      GitHubProvider({
        clientId: env.GITHUB_CLIENT_ID,
        clientSecret: env.GITHUB_CLIENT_SECRET,
        authorization: {
          params: {
            scope: "read:user user:email"
          }
        }
      })
    ] : []),
  ],

  pages: {
    signIn: "/login",
    signOut: "/logout",
    error: "/auth/error",
    verifyRequest: "/auth/verify-request",
    newUser: "/auth/new-user"
  },

  callbacks: {
    async signIn({ user, account, profile, email, credentials }) {
      try {
        // Handle OAuth sign-ins
        if (account?.provider !== "credentials" && prisma) {
          const existingUser = await prisma.user.findUnique({
            where: { email: user.email! }
          });

          // Create user if doesn't exist
          if (!existingUser && account) {
            const newUser = await prisma.user.create({
              data: {
                email: user.email!,
                name: user.name,
                image: user.image,
                emailVerified: new Date(),
                provider: account.provider,
                providerId: account.providerAccountId,
                isActive: true
              }
            });

            // Assign default role
            const viewerRole = await prisma.role.findUnique({
              where: { name: "VIEWER" }
            });

            if (viewerRole) {
              await prisma.userRole.create({
                data: {
                  userId: newUser.id,
                  roleId: viewerRole.id
                }
              });
            }

            user.id = newUser.id;
          } else {
            // Update existing user
            await prisma.user.update({
              where: { id: existingUser.id },
              data: {
                name: user.name || existingUser.name,
                image: user.image || (existingUser as any).image,
                lastLoginAt: new Date(),
                loginCount: { increment: 1 }
              }
            });

            user.id = existingUser.id;
          }
        }

        return true;
      } catch (error) {
        console.error("Sign-in callback error:", error);
        return false;
      }
    },

    async jwt({ token, user, account, trigger, session }) {
      // Initial sign in
      if (user) {
        token.sub = user.id;
        token.email = user.email;
        token.name = user.name;
        token.roles = (user as any).roles || ["VIEWER"];
        token.emailVerified = (user as any).emailVerified;
        token.twoFactorEnabled = (user as any).twoFactorEnabled || false;
        token.sessionId = TokenManager.generateSessionId();
      }

      // Handle session updates
      if (trigger === "update" && session) {
        token.name = session.name || token.name;
        token.roles = session.roles || token.roles;
      }

      // Refresh user data periodically
      if (token.sub && prisma && Date.now() - ((token.iat as number) || 0) * 1000 > 60 * 60 * 1000) { // 1 hour
        try {
          const user = await prisma.user.findUnique({
            where: { id: token.sub as string },
            include: {
              userRoles: true
            }
          });

          if (user) {
            token.roles = user.userRoles.map((ur: any) => ur.role);
            token.name = (user as any).name;
            token.emailVerified = (user as any).emailVerified;
          }
        } catch (error) {
          console.error("Token refresh error:", error);
        }
      }

      return token;
    },

    async session({ session, token, user }) {
      if (token && session.user) {
        session.user.id = token.sub as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string;
        (session.user as any).roles = token.roles || ["VIEWER"];
        (session.user as any).emailVerified = token.emailVerified;
        (session.user as any).twoFactorEnabled = token.twoFactorEnabled || false;
        (session.user as any).sessionId = token.sessionId;
      }

      // Database session
      if (user && session.user) {
        session.user.id = user.id;
        (session.user as any).roles = (user as any).roles || ["VIEWER"];
      }

      return session;
    },

    async redirect({ url, baseUrl }) {
      // Allows relative callback URLs
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      
      // Allows callback URLs on the same origin
      if (new URL(url).origin === baseUrl) return url;
      
      return baseUrl;
    }
  },

  events: {
    async signIn({ user, account, profile, isNewUser }) {
      console.log(`User signed in: ${user.email} via ${account?.provider}`);
      
      // Log audit event
      if (prisma) {
        try {
          await prisma.auditLog.create({
            data: {
              userId: user.id,
              action: "SIGN_IN",
              resource: "AUTH",
              details: {
                provider: account?.provider,
                isNewUser,
                userAgent: "unknown", // Would need to pass from request
                ip: "unknown" // Would need to pass from request
              }
            }
          });
        } catch (error) {
          console.error("Failed to log sign-in event:", error);
        }
      }
    },

    async signOut({ session, token }) {
      console.log(`User signed out: ${session?.user?.email || token?.email}`);
      
      // Log audit event
      if (prisma && (session?.user?.id || token?.sub)) {
        try {
          await prisma.auditLog.create({
            data: {
              userId: (session?.user?.id || token?.sub) as string,
              action: "SIGN_OUT",
              resource: "AUTH",
              details: {}
            }
          });
        } catch (error) {
          console.error("Failed to log sign-out event:", error);
        }
      }
    },

    async createUser({ user }) {
      console.log(`New user created: ${user.email}`);
    },

    async updateUser({ user }) {
      console.log(`User updated: ${user.email}`);
    },

    async linkAccount({ user, account, profile }) {
      console.log(`Account linked: ${user.email} with ${account.provider}`);
    },

    async session({ session, token }) {
      // Session accessed - could be used for activity tracking
    }
  },

  debug: env.NODE_ENV === "development",
  
  logger: {
    error(code, metadata) {
      console.error(`NextAuth Error [${code}]:`, metadata);
    },
    warn(code) {
      console.warn(`NextAuth Warning [${code}]`);
    },
    debug(code, metadata) {
      if (env.NODE_ENV === "development") {
        console.debug(`NextAuth Debug [${code}]:`, metadata);
      }
    }
  }
};
