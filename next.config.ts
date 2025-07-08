import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable static exports for better Netlify compatibility
  output: 'export',

  // Disable image optimization for static export
  images: {
    unoptimized: true
  },

  // Ensure trailing slashes are handled consistently
  trailingSlash: true,

  // Disable server-side features that don't work with static export
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
