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
      console.log('Next.js: Build environment detected - completely excluding Prisma');
      
      // Completely exclude Prisma from the bundle
      config.externals = config.externals || {};
      if (typeof config.externals === 'object' && !Array.isArray(config.externals)) {
        config.externals = {
          ...config.externals,
          '@prisma/client': 'commonjs @prisma/client',
          'prisma': 'commonjs prisma',
          '.prisma/client': 'commonjs .prisma/client',
        };
      }
      
      // Set up aliases to point to safe-prisma for any @/lib/prisma imports
      config.resolve.alias = {
        ...config.resolve.alias,
        '@/lib/prisma': path.resolve(__dirname, 'lib/safe-prisma'),
      };
      
      // Ignore Prisma completely during build
      const webpack = require('webpack');
      config.plugins = config.plugins || [];
      config.plugins.push(
        new webpack.IgnorePlugin({
          resourceRegExp: /@prisma\/client|prisma\/.*|\.prisma\/client/,
          contextRegExp: /.*$/,
        })
      );
    } else {
      // In non-build environments, use normal Prisma client
      config.resolve.alias = {
        ...config.resolve.alias,
        '@/lib/prisma': path.resolve(__dirname, 'lib/prisma'),
      };
    }
    
    return config;
  },
};

module.exports = nextConfig;
