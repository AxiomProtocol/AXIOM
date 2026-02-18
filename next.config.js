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
