import type { NextAuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      name: "Demo",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const email = String(credentials.email).toLowerCase().trim();
        const role = email.endsWith("@admin.test") ? "admin" : "editor";
        return { id: `demo-${role}`, name: email.split("@")[0], email, /* @ts-ignore */ role };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      // @ts-ignore (augment types later)
      if (user?.role) token.role = user.role;
      return token;
    },
    async session({ session, token }) {
      // @ts-ignore (augment types later)
      session.role = (token as any).role ?? "editor";
      return session;
    },
  },
};
