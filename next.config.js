/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // DO NOT set output:'export' – we need SSR & API routes on Vercel.
};
module.exports = nextConfig;
