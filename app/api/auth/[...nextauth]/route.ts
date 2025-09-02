import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth/options"; // point to your existing options
const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
