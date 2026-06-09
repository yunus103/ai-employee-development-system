import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'https://bitirme-backend-8r3q.onrender.com/api/:path*',
      },
    ];
  },
};

export default nextConfig;
