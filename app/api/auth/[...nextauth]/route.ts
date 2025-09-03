import NextAuth from "next-auth/next";
import Credentials from "next-auth/providers/credentials";

export const { GET, POST } = NextAuth({
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
