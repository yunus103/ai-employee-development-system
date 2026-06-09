import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'https://bitirme-backend-8r3q.onrender.com/api/:path*',
      },
      {
        source: '/ml/:path*',
        destination: 'https://bitirme-ml.onrender.com/:path*',
      },
    ];
  },
};

export default nextConfig;
