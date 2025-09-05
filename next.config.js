const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config, { isServer }) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname),
    };
    
    // Enhanced Vercel detection and Prisma bypass
    const isVercelBuild = (
      process.env.SKIP_PRISMA_GENERATE === 'true' || 
      process.env.CI === 'true' || 
      process.env.VERCEL === '1' || 
      process.env.VERCEL_ENV ||
      process.env.VERCEL_URL ||
      process.env.NOW_REGION ||
      process.env.GITHUB_ACTIONS
    );
    
    if (isVercelBuild) {
      console.log('Webpack: Setting up Prisma build-time bypass for Vercel');
      
      // Replace @prisma/client with mock during build
      config.resolve.alias['@prisma/client'] = path.resolve(__dirname, 'lib/prisma-mock.js');
      
      // Enhanced fallbacks for Vercel environment
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        'child_process': false,
        path: false,
        os: false,
        stream: false,
        util: false,
      };
      
      // Exclude Prisma binaries and engines from bundling
      config.externals = config.externals || [];
      if (Array.isArray(config.externals)) {
        config.externals.push(
          '@prisma/engines', 
          '@prisma/engines-version',
          'prisma/client',
          '@prisma/client/edge',
          '@prisma/client/default'
        );
      }
    }
    
    return config;
  },
};

module.exports = nextConfig;
