const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // no output:'export' — we need SSR & API routes
  webpack: (config, { isServer }) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname),
    };
    
    // Prevent Prisma from causing issues during build in restricted environments
    if (process.env.SKIP_PRISMA_GENERATE === 'true' || process.env.CI === 'true' || process.env.VERCEL === '1') {
      // Add fallback for Prisma binaries that might not be available
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
      };
    }
    
    return config;
  },
};
module.exports = nextConfig;
