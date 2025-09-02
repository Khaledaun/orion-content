/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Do NOT set `output: 'export'` — we need SSR & API routes on Vercel.
  // If you previously had `images: { unoptimized: true }` purely for export, remove it.
};
module.exports = nextConfig;
