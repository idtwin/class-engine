import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.18.66"],
  turbopack: {
    root: ".",
  },
};

export default nextConfig;
