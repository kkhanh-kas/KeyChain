import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow IPFS gateway images
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "gateway.pinata.cloud",
      },
      {
        protocol: "https",
        hostname: "ipfs.io",
      },
    ],
  },
};

export default nextConfig;
