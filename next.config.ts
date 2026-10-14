import type { NextConfig } from "next";
import path from "path";
import os from "os";

// Dynamically collect all host network interfaces so mobile devices on LAN can connect seamlessly
const networkInterfaces = os.networkInterfaces();
const dynamicOrigins: string[] = [
  "localhost",
  "localhost:3000",
  "127.0.0.1",
  "127.0.0.1:3000",
];

for (const name of Object.keys(networkInterfaces)) {
  for (const net of networkInterfaces[name] || []) {
    if (net.family === "IPv4" && !net.internal) {
      dynamicOrigins.push(net.address);
      dynamicOrigins.push(`${net.address}:3000`);
    }
  }
}

const nextConfig: NextConfig = {
  allowedDevOrigins: dynamicOrigins,
  turbopack: {
    root: path.resolve(__dirname),
  },
  headers: async () => [
    {
      source: "/:path*",
      headers: [
        { key: "Cache-Control", value: "no-store, no-cache, must-revalidate" },
        { key: "Pragma", value: "no-cache" },
      ],
    },
  ],
};

export default nextConfig;

