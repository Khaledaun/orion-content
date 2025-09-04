export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    const u = await prisma.user.findUnique({ where: { email: "khaled.aun@gmail.com" }});
    return NextResponse.json({ ok: true, hasUser: !!u, email: u?.email ?? null });
  } catch (e:any) {
    return NextResponse.json({ ok: false, error: e?.message ?? String(e) }, { status: 500 });
  }
}
