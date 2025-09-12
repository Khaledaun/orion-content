import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { prisma } from "@/lib/prisma";
import * as bcryptjs from "bcryptjs";

// Build-time safety check - skip database operations during build
const isBuildTime = process.env.NODE_ENV === 'production' && !process.env.DATABASE_URL;

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET || 'dev-fallback-secret',
  session: { strategy: "jwt" },

  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        // Skip database operations during build time
        if (isBuildTime) {
          return null;
        }

        const email = credentials?.email?.toString().trim().toLowerCase();
        const password = credentials?.password?.toString() ?? "";
        if (!email || !password) return null;

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
          console.error('Auth error:', error);
          return null;
        }
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
