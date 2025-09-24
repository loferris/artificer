/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Production-ready configuration
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
};

export default nextConfig;
