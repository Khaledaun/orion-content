export type WithAuthOptions = { roles?: string[] }

// No-op wrapper to unblock build; your real RBAC can replace this.
export function withAuth<T extends (req: any) => any>(
  handler: T,
  _opts?: WithAuthOptions
) {
  return handler as any
}

// Optional legacy helper (no-op) to satisfy older imports if any remain.
export async function requireApiAuth(_req: any, _opts?: WithAuthOptions) {
  return
}
