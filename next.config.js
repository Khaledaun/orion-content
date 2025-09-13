/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Simplified configuration for reliable Vercel builds
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client', 'prisma']
  },
  // Simplified webpack config
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Only externalize packages that need it
      config.externals = config.externals || [];
      config.externals.push('sharp');
    }
    return config;
  },
  swcMinify: true,
  poweredByHeader: false
};

module.exports = nextConfig;
