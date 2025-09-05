/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // no output:'export' — we need SSR & API routes
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': '.',
    }
    return config
  },
};
module.exports = nextConfig;
