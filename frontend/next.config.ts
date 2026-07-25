import type { NextConfig } from "next";

/**
 * PERF-104: Frontend image optimisation with WebP/AVIF and lazy loading.
 */
const nextConfig: NextConfig = {
  transpilePackages: ["@dewordle/soroban-sdk"],

  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [375, 640, 768, 1024, 1280, 1536],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
    minimumCacheTTL: 86400,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "assets.dewordle.io",
      },
    ],
  },

  compress: true,
};

export default nextConfig;