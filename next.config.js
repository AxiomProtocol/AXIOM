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
  experimental: {
    workerThreads: false,
    cpus: 1,
    serverComponentsExternalPackages: [
      'canvas',
      '@napi-rs/canvas',
      'puppeteer',
      'puppeteer-core',
      'bcrypt',
      'chartjs-node-canvas',
      'pdfkit',
      '@safe-global/protocol-kit',
      '@safe-global/api-kit',
    ],
    outputFileTracingIncludes: {
      '/*': [
        'node_modules/ethers/**/*',
        'node_modules/react-hot-toast/**/*',
        'node_modules/viem/**/*',
        'node_modules/wagmi/**/*',
        'node_modules/@metamask/**/*',
      ],
    },
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
        'bcrypt': 'commonjs bcrypt',
      });
    }
    
    return config;
  },
}

module.exports = nextConfig
