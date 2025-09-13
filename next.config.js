/** @type {import('next').NextConfig} */
const nextConfig = {
  // Minimal configuration for reliable Vercel builds
  reactStrictMode: true,
  swcMinify: true,
  poweredByHeader: false,
  
  // Add build logging for debugging Vercel hangs
  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  },
  
  // Optimize for Vercel deployment
  experimental: {
    optimizePackageImports: ['@radix-ui/react-icons', 'lucide-react'],
  },
  
  // Ensure proper module resolution
  typescript: {
    ignoreBuildErrors: false,
  },
  
  eslint: {
    ignoreDuringBuilds: false,
  }
};

module.exports = nextConfig;
