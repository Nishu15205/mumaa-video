import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["bcryptjs", "jsonwebtoken", "nodemailer", "stripe", "web-push", "sharp"],
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  images: {
    unoptimized: true,
  },
  // Proxy Socket.IO to the standalone socket-service on port 3003
  // This handles both HTTP polling and WebSocket upgrade
  async rewrites() {
    return [
      {
        source: "/socket.io/:path*",
        destination: "http://localhost:3003/socket.io/:path*",
      },
    ];
  },
};

export default nextConfig;
