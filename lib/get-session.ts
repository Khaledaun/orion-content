import { getServerSession } from "next-auth";

// If you keep your NextAuth options central in app/lib/nextauth (recommended)
let authOptions: any = undefined;
try {
  // Adjust the import path if your config lives elsewhere
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  authOptions = require("../app/lib/nextauth").authOptions;
} catch {
  // Fallback: some projects export default; ignore if not present
}

export async function getSession() {
  try {
    if (authOptions) return await getServerSession(authOptions);
    // getServerSession can be called without options if using the new default export;
    // but for v4 config, options are typically required. Handle null gracefully.
    return await getServerSession();
  } catch (e) {
    console.error("[getSession]", e);
    return null;
  }
}
