/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  experimental: {
    optimizePackageImports: ["@radix-ui/react-icons", "lucide-react"],
  },
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Fix for module resolution issues
    config.resolve.alias = {
      ...config.resolve.alias,
      "@": require("path").resolve(__dirname, "."),
      "@/app": require("path").resolve(__dirname, "./app"),
      "@/components": require("path").resolve(__dirname, "./components"),
      "@/lib": require("path").resolve(__dirname, "./lib"),
      "@/hooks": require("path").resolve(__dirname, "./hooks"),
      "@/types": require("path").resolve(__dirname, "./types"),
      "@/utils": require("path").resolve(__dirname, "./utils"),
    };

    // Handle node modules that need to be transpiled
    config.module.rules.push({
      test: /\.m?js$/,
      type: "javascript/auto",
      resolve: {
        fullySpecified: false,
      },
    });

    // Suppress specific warnings during build
    config.infrastructureLogging = {
      level: "error",
    };

    // Handle Prisma edge runtime warnings
    if (!dev && !isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
      };
    }

    return config;
  },
  // Environment variables
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
  // Image optimization
  images: {
    domains: ["localhost", "vercel.app"],
    formats: ["image/webp", "image/avif"],
  },
  // Headers for security
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "origin-when-cross-origin",
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
