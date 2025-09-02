import NextAuth from "next-auth";
import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

// If you later want Prisma adapter, uncomment these lines
// import { PrismaAdapter } from "@next-auth/prisma-adapter";
// import { prisma } from "@/lib/prisma";

const authOptions: NextAuthOptions = {
  // adapter: PrismaAdapter(prisma), // optional for DB-backed sessions
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      // You can pass authorization params here if needed
    }),
    // Add Credentials provider later if you want; keep Google-only for now
  ],
  session: { strategy: "jwt" }, // change to "database" if you enable the adapter
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NEXTAUTH_DEBUG === "true",
  callbacks: {
    async session({ session, token }) {
      // Temporary RBAC shim: read role from token if you add it during sign-in
      // @ts-expect-error - extend at your own types
      session.user = { ...(session.user ?? {}), role: (token as any)?.role ?? "viewer" };
      return session;
    },
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
