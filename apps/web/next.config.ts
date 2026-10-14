import type { NextConfig } from "next";

const apiProxyTarget =
  process.env.API_PROXY_TARGET ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:8080";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // JSON calls go through this rewrite. Files (PDF, CSV, attachments) use app/files/[...path]/route.ts instead: the
  // rewrite proxy of `next start` can cut larger bodies.
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${apiProxyTarget.replace(/\/$/, "")}/:path*`,
      },
    ];
  },
};

export default nextConfig;
