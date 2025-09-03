// NextAuth v4 + Next.js App Router
export const runtime = 'nodejs';

import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

const handler = NextAuth({
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      name: "Demo",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(creds) {
        if (creds?.email === "demo@example.com" && creds?.password === "demo123") {
          return { id: "demo-user", name: "Demo User", email: "demo@example.com" };
        }
        return null;
      },
    }),
  ],
});

export { handler as GET, handler as POST };
