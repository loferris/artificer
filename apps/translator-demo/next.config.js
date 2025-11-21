/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone', // Required for Docker/Railway deployment
  transpilePackages: [
    '@artificer/ui',
    '@artificer/translator',
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

    // Add extension resolution for ESM .js imports that should resolve to .ts files
    // This handles the document-converter library's ESM imports
    config.resolve.extensionAlias = {
      '.js': ['.js', '.ts'],
      '.jsx': ['.jsx', '.tsx'],
    };

    return config;
  },
};

export default nextConfig;
