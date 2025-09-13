/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Build-time optimizations
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client', 'prisma']
  },
  // Prevent build-time execution of dynamic imports
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Exclude scripts from server build to prevent execution during build
      config.externals = config.externals || [];
      config.externals.push({
        'scripts/': 'commonjs scripts/'
      });
    }
    return config;
  }
};
module.exports = nextConfig;

/** SAFE REWRITES APPENDED: keep API untouched **/
module.exports.rewrites = async () => ([
  { source: "/api/:path*", destination: "/api/:path*" },
]);
