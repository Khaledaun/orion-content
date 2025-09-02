export type WithAuthOptions = { roles?: string[] }

// No-op wrapper; replace with real RBAC when ready.
// Signature matches Next.js Route Handler export pattern.
export function withAuth<T extends (req: any) => any>(
  handler: T,
  _opts?: WithAuthOptions
) {
  return handler as any
}

// Optional legacy helper to satisfy older usages.
export async function requireApiAuth(_req: any, _opts?: WithAuthOptions) {
  return
}
