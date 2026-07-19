import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    proxyClientMaxBodySize: "2gb",
  },
  allowedDevOrigins: ["127.0.0.1", "172.20.10.2"],
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
