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
  swcMinify: true,
  poweredByHeader: false,
  compress: true,
  images: {
    unoptimized: true,
    minimumCacheTTL: 60,
  },
  generateBuildId: async () => 'build-' + Date.now(),
  modularizeImports: {
    'lucide-react': {
      transform: 'lucide-react/dist/esm/icons/{{kebabCase member}}',
    },
    '@heroicons/react/24/outline': {
      transform: '@heroicons/react/24/outline/{{member}}',
    },
    '@heroicons/react/24/solid': {
      transform: '@heroicons/react/24/solid/{{member}}',
    },
  },
  experimental: {
    optimizePackageImports: ['recharts', 'framer-motion', 'lucide-react'],
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
  webpack: (config, { isServer, webpack }) => {
    // Ignore large Hardhat/Solidity artifact directories to speed up build
    config.plugins.push(
      new webpack.IgnorePlugin({
        resourceRegExp: /^\.\/artifacts(-axusd)?|^\.\/typechain-types|^\.\/stablecoin-deploy|^\.\/cache/,
      })
    );
    
    // Exclude artifact directories from module resolution
    config.watchOptions = {
      ...config.watchOptions,
      ignored: ['**/node_modules', '**/artifacts*', '**/typechain-types', '**/cache', '**/stablecoin-deploy'],
    };
    
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
