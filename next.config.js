/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Build-time optimizations for Vercel
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client', 'prisma', 'bcryptjs']
  },
  // Enhanced webpack config to prevent build-time hangs
  webpack: (config, { isServer, dev }) => {
    if (isServer && !dev) {
      // Exclude scripts and other non-essential packages from server build
      config.externals = config.externals || [];
      config.externals.push({
        'scripts/': 'commonjs scripts/',
        'sharp': 'commonjs sharp'
      });
      
      // Prevent automatic imports during build
      config.resolve.alias = {
        ...config.resolve.alias,
        'prisma/client-build': false,
        'prisma/scripts': false
      };
    }
    return config;
  },
  // Skip some build steps that might cause hangs
  swcMinify: true,
  poweredByHeader: false
};

module.exports = nextConfig;

/** SAFE REWRITES APPENDED: keep API untouched **/
module.exports.rewrites = async () => ([
  { source: "/api/:path*", destination: "/api/:path*" },
]);
