import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    proxyClientMaxBodySize: "5gb",
  },
  allowedDevOrigins: ["127.0.0.1", "172.20.10.2"],
  typescript: {
    ignoreBuildErrors: true,
  },
  // Compress text assets (HTML, JS, CSS) with gzip on the fly.
  // Media files bypass this — they're served by the /api/media route
  // with their own caching headers instead.
  compress: true,
};

export default nextConfig;
