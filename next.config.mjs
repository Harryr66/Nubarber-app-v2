/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  experimental: {},
  // This is required to allow the Next.js dev server to be proxied in the cloud development environment.
  allowedDevOrigins: [
    'https://*.cloudworkstations.dev',
    'https://*.firebase.studio',
  ],
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = {
        poll: 1000, // Check for changes every second
        aggregateTimeout: 200, // Delay before rebuilding
      };
    }
    return config;
  },
};

export default nextConfig;
