import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // produce a self-contained server build for Docker
  output: "standalone",
};

export default nextConfig;
