import type { NextAuthOptions } from "next-auth";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import GoogleProvider from "next-auth/providers/google";
import { getPrismaClient } from "@/lib/prisma";

// Load from env (don’t crash build if not set — providers are conditional)
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

export const authOptions: NextAuthOptions = {
  // adapter: PrismaAdapter(prisma), // Disabled to prevent build-time Prisma loading
  session: { strategy: "jwt" }, // Changed to JWT since no adapter
  providers: [
    ...(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
            clientId: GOOGLE_CLIENT_ID,
            clientSecret: GOOGLE_CLIENT_SECRET,
          }),
        ]
      : []),
    // You can add Credentials or others later if needed
  ],
  callbacks: {
    async session({ session, user, token }) {
      // Ensure we always have user.id on session
      if (session?.user) {
        // when database sessions:
        (session.user as any).id = user?.id ?? (token as any)?.sub ?? (session.user as any).id;
      }
      return session;
    },
  },
  // Optional: pages: { signIn: "/signin" },
  // Optional: debug: process.env.NODE_ENV === "development",
};
