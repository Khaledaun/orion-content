import type { NextAuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET || "dev-secret-only",
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      name: "Code",
      credentials: {
        email: { label: "Email", type: "email" },
        code:  { label: "One-time code", type: "text" },
      },
      async authorize(creds) {
        // Phase-10: dummy auth. Any email/code works.
        const email = creds?.email?.toString().trim() || "demo@orion.local";
        return { id: email, email, role: "admin" as const };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.role = (user as any).role ?? "editor";
      return token;
    },
    async session({ session, token }) {
      if (session.user) (session.user as any).role = (token as any).role ?? "editor";
      return session;
    },
  },
};
