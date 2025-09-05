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
    
    // Completely prevent Prisma from loading during build in restricted environments
    if (process.env.SKIP_PRISMA_GENERATE === 'true' || process.env.CI === 'true' || process.env.VERCEL === '1' || process.env.VERCEL_ENV) {
      console.log('Webpack: Setting up Prisma build-time bypass');
      
      // Replace @prisma/client with a mock during build
      config.resolve.alias['@prisma/client'] = path.resolve(__dirname, 'lib/prisma-mock.js');
      
      // Add fallback for node modules that might not be available
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        'child_process': false,
      };
      
      // Exclude Prisma binaries from bundling
      config.externals = config.externals || [];
      if (Array.isArray(config.externals)) {
        config.externals.push('@prisma/engines', '@prisma/engines-version');
      }
    }
    
    return config;
  },
};
module.exports = nextConfig;
