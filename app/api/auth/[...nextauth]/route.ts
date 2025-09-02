// app/api/auth/[...nextauth]/route.ts
import NextAuth from "next-auth/next";
import CredentialsProvider from "next-auth/providers/credentials";

const handler = NextAuth({
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    CredentialsProvider({
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

export { handler as GET, handler as POST };
