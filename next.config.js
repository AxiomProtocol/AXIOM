/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  productionBrowserSourceMaps: false,
  swcMinify: false,
  images: {
    unoptimized: true
  },
  generateBuildId: async () => 'build-' + Date.now(),
  experimental: {
    serverComponentsExternalPackages: [
      'canvas',
      '@napi-rs/canvas',
      'bcrypt',
      'chartjs-node-canvas',
      'pdfkit',
      'pg',
      '@neondatabase/serverless',
      'drizzle-orm',
    ],
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        child_process: false,
        '@react-native-async-storage/async-storage': false,
      };
    }
    
    config.resolve.alias = {
      ...config.resolve.alias,
      '@react-native-async-storage/async-storage': false,
    };
    
    config.externals = config.externals || [];
    if (isServer) {
      config.externals.push({
        'canvas': 'commonjs canvas',
        '@napi-rs/canvas': 'commonjs @napi-rs/canvas',
        'puppeteer': 'commonjs puppeteer',
        'puppeteer-core': 'commonjs puppeteer-core',
        'bcrypt': 'commonjs bcrypt',
        'hardhat': 'commonjs hardhat',
        'solc': 'commonjs solc',
        'telegraf': 'commonjs telegraf',
        '@safe-global/protocol-kit': 'commonjs @safe-global/protocol-kit',
        '@safe-global/api-kit': 'commonjs @safe-global/api-kit',
        'ethers': 'commonjs ethers',
        'viem': 'commonjs viem',
        'wagmi': 'commonjs wagmi',
        '@google-cloud/storage': 'commonjs @google-cloud/storage',
        'googleapis': 'commonjs googleapis',
        'google-auth-library': 'commonjs google-auth-library',
        'openai': 'commonjs openai',
        '@anthropic-ai/sdk': 'commonjs @anthropic-ai/sdk',
        '@google/genai': 'commonjs @google/genai',
        'nodemailer': 'commonjs nodemailer',
        '@sendgrid/mail': 'commonjs @sendgrid/mail',
        'resend': 'commonjs resend',
        'stripe': 'commonjs stripe',
        'web3': 'commonjs web3',
        '@coinbase/cdp-sdk': 'commonjs @coinbase/cdp-sdk',
        '@metamask/sdk': 'commonjs @metamask/sdk',
        '@metamask/delegation-toolkit': 'commonjs @metamask/delegation-toolkit',
        'ioredis': 'commonjs ioredis',
      });
    }
    
    return config;
  },
}

module.exports = nextConfig
