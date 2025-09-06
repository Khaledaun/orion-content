import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";

import * as bcryptjs from "bcryptjs";
import { getPrismaClient } from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  // Provide fallback secret for demo/testing environments
  secret: process.env.NEXTAUTH_SECRET || "demo-secret-please-set-in-production",
  session: { strategy: "jwt" },

  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        const email = credentials?.email?.toString().trim().toLowerCase();
        const password = credentials?.password?.toString() ?? "";
        if (!email || !password) return null;

        // Get Prisma client safely - only at runtime
        const prisma = await getPrismaClient();
        
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
              name:  (user as any).name  ?? null
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
            name: "Demo User"
          };
        }
        
        return null;
      }
    }),

    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [GoogleProvider({
          clientId: process.env.GOOGLE_CLIENT_ID!,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET!
        })]
      : [])
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
    }
  }
};
