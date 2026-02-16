import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["http://100.120.109.78:3333", "100.120.109.78", "https://ghostodds.com", "ghostodds.com", "https://www.ghostodds.com", "www.ghostodds.com"],
  turbopack: {},
};

export default nextConfig;
