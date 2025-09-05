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
    
    // Always set up the prisma client alias to point to our safe client
    const safeClientPath = path.resolve(__dirname, 'lib/prisma-client.js');
    
    config.resolve.alias = {
      ...config.resolve.alias,
      '@/lib/prisma': safeClientPath,
    };
    
    if (isVercelBuild) {
      console.log('Webpack: Setting up comprehensive Prisma build-time bypass for Vercel');
      
      // Point all prisma imports to our safe client  
      const mockPath = path.resolve(__dirname, 'lib/prisma-mock.js');
      
      // Comprehensive Prisma module aliasing
      config.resolve.alias = {
        ...config.resolve.alias,
        '@prisma/client': mockPath,
        'prisma': mockPath,
        '.prisma/client': mockPath,
        '@prisma/engines': mockPath,
        '@prisma/engines-version': mockPath,
        // Ensure our lib/prisma points to safe client
        '@/lib/prisma': safeClientPath,
        '@/lib/prisma-client': safeClientPath,
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
        '@prisma/client': false,
        'prisma': false,
        '.prisma/client': false,
      };
      
      // Multiple layers of module replacement and ignoring
      const webpack = require('webpack');
      config.plugins = config.plugins || [];
      config.plugins.push(
        // Replace any Prisma imports with our mock
        new webpack.NormalModuleReplacementPlugin(
          /@prisma\/client|prisma|\.prisma\/client|@prisma\/engines/,
          mockPath
        ),
        // Ignore Prisma modules completely
        new webpack.IgnorePlugin({
          resourceRegExp: /@prisma\/client|prisma|\.prisma\/client|@prisma\/engines/,
        }),
        // Define global to prevent Prisma from trying to load
        new webpack.DefinePlugin({
          'process.env.PRISMA_SKIP_POSTINSTALL_GENERATE': JSON.stringify('true'),
          'process.env.PRISMA_GENERATE_SKIP_AUTOINSTALL': JSON.stringify('true'),
        })
      );
    }
    
    return config;
  },
};

module.exports = nextConfig;
