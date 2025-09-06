
import { type NextAuthOptions } from "next-auth"
import Google from "next-auth/providers/google"
import Credentials from "next-auth/providers/credentials"
import { PrismaAdapter } from "@next-auth/prisma-adapter"
import { getPrismaClient } from "@/lib/prisma";
import bcrypt from "bcrypt"

// Legacy auth config - not used but kept for compatibility
// Note: This config cannot use PrismaAdapter directly due to build-time evaluation
export const authOptions: NextAuthOptions = {
  // adapter: PrismaAdapter(prisma), // Commented out to prevent build issues
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      allowDangerousEmailAccountLinking: true,
    }),
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null
        const prisma = await getPrismaClient();
        if (!prisma) return null;
        
        const user = await prisma.user.findUnique({ where: { email: credentials.email } })
        if (!user || !(user as any).passwordHash) return null
        const ok = await bcrypt.compare(credentials.password, (user as any).passwordHash)
        if (!ok) return null
        return { id: user.id, email: (user as any).email, name: (user as any).name ?? null, image: (user as any).image ?? null }
      },
    }),
  ],
  callbacks: {
    async session({ session, token }) {
      if (session.user && token.sub) (session.user as any).id = token.sub
      return session
    },
  },
}
