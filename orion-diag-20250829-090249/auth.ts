import crypto from "crypto"
import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"

// Simple bearer for API routes (dev/staging)
const BEARER = process.env.ORION_BEARER_TOKEN || ""

// ---- Guards ----
/** Returns 401 response if unauthorized; null if OK. */
export async function requireAuth(req: NextRequest) {
  const auth = req.headers.get("authorization") || ""
  if (!auth.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const token = auth.slice("Bearer ".length)
  if (!BEARER || token !== BEARER) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 })
  }
  return null
}

// ---- Session shims (typed, optional args accepted) ----
export type SessionUser = { id: string; email: string }

export async function getSession(_req?: NextRequest): Promise<{ user: SessionUser } | null> {
  return null
}
export async function getSessionUser(_req?: NextRequest): Promise<SessionUser | null> {
  return null
}
export async function createSession(_user?: SessionUser): Promise<{ ok: true }> {
  return { ok: true }
}
export async function destroySession(_req?: NextRequest): Promise<{ ok: true }> {
  return { ok: true }
}

// ---- Password shim (deterministic false until real auth wired) ----
export async function verifyPassword(_password: string, _hash: string): Promise<boolean> {
  return false
}

// ---- Actor hash for audit logging (don’t log tokens raw) ----
export function hashActor(token: string) {
  const key = process.env.AUDIT_HMAC_KEY || "dev"
  return crypto.createHmac("sha256", key).update(token).digest("hex")
}

// Page-safe shim: use in server components/pages (placeholder until NextAuth/iron-session wired)
export async function ensurePageAuth(): Promise<void> {
  // TODO: implement real session/redirect logic.
  // For now, we just no-op so pages compile and can be visited in dev.
  return;
}
