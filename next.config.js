const webpack = require('webpack');

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Compression handled by reverse proxy (nginx/Cloudflare) in production
  compress: false,
  allowedDevOrigins: ['*'],

  async redirects() {
    return [
      {
        source: '/axau-access',
        destination: '/axau-early-access',
        permanent: true,
      },
    ];
  },

  async rewrites() {
    return [
      {
        source: '/.well-known/stellar.toml',
        destination: '/api/stellar-toml',
      },
    ];
  },

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
      {
        source: '/.well-known/stellar.toml',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Content-Type', value: 'text/plain; charset=utf-8' },
        ],
      },
    ];
  },
  eslint: {
    ignoreDuringBuilds: true,
  },

  typescript: {
    ignoreBuildErrors: true,
  },

  swcMinify: true,

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'plus.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 's.gravatar.com',
      },
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
      },
    ],
  },

  transpilePackages: ['@mysten/sui', '@mysten/bcs'],

  experimental: {
    instrumentationHook: true,
    serverComponentsExternalPackages: [
      'pg',
      'hardhat',
      '@nomiclabs/hardhat-ethers',
      '@nomicfoundation/hardhat-toolbox',
      '@stellar/stellar-sdk',
      '@stellar/stellar-base',
      '@stellar/js-xdr',
      'eventsource',
      'stripe',
      'resend',
    ],
  },

  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        '@react-native-async-storage/async-storage': false,
        fs: false,
        net: false,
        tls: false,
        child_process: false,
        readline: false,
      };
    }

    config.plugins.push(
      new webpack.IgnorePlugin({
        resourceRegExp: /^\.[\\/]_archive/,
      })
    );

    config.plugins.push(
      new webpack.IgnorePlugin({
        resourceRegExp: /^(hardhat|@nomiclabs\/hardhat|@nomicfoundation\/hardhat|slither)/,
      })
    );

    if (!isServer) {
      config.externals = config.externals || [];
      if (Array.isArray(config.externals)) {
        config.externals.push('pino-pretty', 'lokijs', 'encoding');
      }
    }

    return config;
  },
};

module.exports = nextConfig;
