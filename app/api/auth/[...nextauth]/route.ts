// app/api/auth/[...nextauth]/route.ts
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

export const { GET, POST } = NextAuth({
  providers: [
    Credentials({
      name: "Demo",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        if (credentials?.email && credentials?.password) {
          return {
            id: "user-1",
            name: "Orion Demo",
            email: credentials.email,
          };
        }
        return null;
      },
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
});
