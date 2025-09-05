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
      console.log('Webpack: Setting up comprehensive Prisma build-time bypass for Vercel');
      
      // Comprehensive Prisma module aliasing to prevent any loading during build
      const mockPath = path.resolve(__dirname, 'lib/prisma-mock.js');
      config.resolve.alias = {
        ...config.resolve.alias,
        '@prisma/client': mockPath,
        'prisma': mockPath,
        '.prisma/client': mockPath,
        '@prisma/engines': mockPath,
        '@prisma/engines-version': mockPath,
      };
      
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
        'process': false,
      };
      
      // Comprehensive externals to prevent bundling any Prisma-related modules
      config.externals = config.externals || [];
      if (Array.isArray(config.externals)) {
        config.externals.push(
          '@prisma/engines', 
          '@prisma/engines-version',
          '@prisma/client',
          'prisma/client',
          '.prisma/client',
          '@prisma/client/edge',
          '@prisma/client/default',
          'prisma',
          '@prisma/generator-helper',
          '@prisma/internals'
        );
      }
      
      // Module replacement to intercept require() calls
      const webpack = require('webpack');
      config.plugins = config.plugins || [];
      config.plugins.push(new webpack.NormalModuleReplacementPlugin(
        /@prisma\/client|prisma|\.prisma\/client/,
        mockPath
      ));
    }
    
    return config;
  },
};

module.exports = nextConfig;
