// app/api/auth/[...nextauth]/route.ts
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

export const dynamic = "force-dynamic"; // ensure not statically rendered
export const runtime = "nodejs";

export const { GET, POST } = NextAuth({
  trustHost: true,
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    Credentials({
      name: "Demo",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(c) {
        if (c?.email && c?.password) {
          return { id: "user-1", name: "Orion Demo", email: c.email };
        }
        return null;
      },
    }),
  ],
});
