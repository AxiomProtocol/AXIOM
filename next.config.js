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

    // Replace @metamask/sdk with a stub module so webpack never bundles the real SDK.
    // The real SDK has a broken uuid/dist/esm-browser import that can't be resolved.
    // Our code and wagmi's MetaMask connector both try to import it, but we use
    // window.ethereum directly instead. The stub returns an empty object/constructor.
    config.resolve.alias = {
      ...config.resolve.alias,
      '@metamask/sdk': path.resolve(__dirname, 'lib/stubs/metamask-sdk-stub.js'),
    };

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
