/** @type {import('next').NextConfig} */
const nextConfig = {
  // Minimal but effective configuration for Vercel deployment
  reactStrictMode: true,
  swcMinify: true,
  poweredByHeader: false,
  
  // Enhanced webpack configuration to prevent build analyzer hangs
  webpack: (config, { isServer, webpack }) => {
    // Prevent client-side bundling of server-only packages
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
      };
    }
    
    // Add externals for Prisma to prevent build-time issues
    config.externals = config.externals || [];
    if (isServer) {
      config.externals.push('@prisma/client', 'prisma');
    }
    
    return config;
  },
  
  // Optimize for faster builds and better module resolution
  experimental: {
    optimizePackageImports: ['@radix-ui/react-icons', 'lucide-react'],
    serverComponentsExternalPackages: ['@prisma/client', 'prisma'],
  },
  
  // Build-time optimizations
  typescript: {
    ignoreBuildErrors: false,
  },
  
  eslint: {
    ignoreDuringBuilds: false,
  }
};

module.exports = nextConfig;
