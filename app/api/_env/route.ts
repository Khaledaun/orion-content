export const runtime = 'nodejs';

function redact(v?: string | null) {
  if (!v) return null;
  const s = String(v);
  return s.replace(/:\/\/([^:@/]+):([^@/]+)@/, '://***:***@');
}

export async function GET() {
  const data = {
    node: process.version,
    env: {
      NEXTAUTH_URL: process.env.NEXTAUTH_URL || null,
      DATABASE_URL: redact(process.env.DATABASE_URL),
      DIRECT_URL: redact(process.env.DIRECT_URL),
      SHADOW_DATABASE_URL: redact(process.env.SHADOW_DATABASE_URL),
    },
  };
  return new Response(JSON.stringify(data, null, 2), {
    headers: { 'content-type': 'application/json' },
  });
}
