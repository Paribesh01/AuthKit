import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://localhost:4000/api/:path*",
      },
      {
        source: "/v1/:path*",
        destination: "http://localhost:4000/v1/:path*",
      },
    ];
  },
};

export default nextConfig;
