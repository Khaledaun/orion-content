const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config, { isServer }) => {
    // Always set up the @ alias
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname),
    };
    
    // Detect build environment (including Vercel)
    const isBuildEnvironment = (
      process.env.SKIP_PRISMA_GENERATE === 'true' || 
      process.env.CI === 'true' || 
      process.env.VERCEL === '1' || 
      process.env.VERCEL_ENV ||
      process.env.VERCEL_URL ||
      process.env.NOW_REGION ||
      process.env.GITHUB_ACTIONS
    );
    
    if (isBuildEnvironment) {
      console.log('Next.js: Build environment detected - excluding Prisma from bundle');
      
      // Completely exclude Prisma modules from webpack bundling
      config.externals = config.externals || {};
      if (typeof config.externals === 'object' && !Array.isArray(config.externals)) {
        config.externals = {
          ...config.externals,
          '@prisma/client': 'commonjs @prisma/client',
          'prisma': 'commonjs prisma',
          '.prisma/client': 'commonjs .prisma/client',
        };
      }
    }
    
    return config;
  },
};

module.exports = nextConfig;
