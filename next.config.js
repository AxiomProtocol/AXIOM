const path = require('path');
const webpack = require('webpack');

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  allowedDevOrigins: ['*'],
  eslint: {
    ignoreDuringBuilds: true,
  },

  typescript: {
    ignoreBuildErrors: true,
  },

  swcMinify: true,

  experimental: {
    serverComponentsExternalPackages: ['pg'],
  },

  webpack: (config, { isServer }) => {
    // Fix @metamask/sdk uuid ESM browser module resolution issue.
    // Must apply to BOTH client and server builds since webpack analyzes
    // dynamic imports on both sides. Forces all uuid imports (including
    // nested ones inside @metamask/sdk/node_modules/) to resolve to
    // the top-level uuid package which has the correct files.
    config.resolve.alias = {
      ...config.resolve.alias,
      'uuid': path.resolve(__dirname, 'node_modules/uuid'),
    };

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

    return config;
  },
};

module.exports = nextConfig;
