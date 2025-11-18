import bundleAnalyzer from '@next/bundle-analyzer'

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
})

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone', // Required for Docker/Railway deployment
  // Transpile workspace packages (monorepo support)
  transpilePackages: [
    '@artificer/ui',
    '@artificer/fableforge',
    '@artificer/hellbat',
    '@ai-workflow/document-converter',
  ],
  // Production-ready configuration
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
  webpack: (config, { isServer }) => {
    // Exclude lib/ directory from webpack processing
    // This prevents build errors from library test configs
    config.watchOptions = {
      ...config.watchOptions,
      ignored: ['**/node_modules/**', '**/lib/**'],
    };

    return config;
  },
};

export default withBundleAnalyzer(nextConfig);
