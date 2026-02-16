import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["http://100.120.109.78:3333", "100.120.109.78"],
  turbopack: {},
};

export default nextConfig;
