const path = require('path');
const webpack = require('webpack');

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  // Compression handled by reverse proxy (nginx/Cloudflare) in production
  compress: false,
  allowedDevOrigins: ['*'],
  eslint: {
    ignoreDuringBuilds: true,
  },

  typescript: {
    ignoreBuildErrors: true,
  },

  swcMinify: true,

  experimental: {
    instrumentationHook: true,
    serverComponentsExternalPackages: ['pg', 'hardhat', '@nomiclabs/hardhat-ethers', '@nomicfoundation/hardhat-toolbox'],
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
