import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth/options";

export const runtime = "nodejs";         // ensure Node runtime
export const dynamic = "force-dynamic";  // no prerender caching

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
