// app/api/auth/[...nextauth]/route.ts
import NextAuth, { type NextAuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";

export const runtime = "nodejs";         // ensure Node (not Edge)
export const dynamic = "force-dynamic";  // never prerender
export const revalidate = 0;             // no caching

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET || "dev-secret-only",
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      name: "Demo",
      credentials: {
        email: { label: "Email", type: "email" },
        code: { label: "Code", type: "text" },
      },
      async authorize(creds) {
        if (!creds?.email) return null;
        // Phase-10: dummy auth, role=admin so RBAC is testable
        return { id: "demo-user", name: "Demo User", email: creds.email, role: "admin" as const };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      // carry role through in JWT
      if (user && (user as any).role) (token as any).role = (user as any).role;
      return token;
    },
    async session({ session, token }) {
      // expose role on session object
      (session as any).role = (token as any).role ?? "editor";
      return session;
    },
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
