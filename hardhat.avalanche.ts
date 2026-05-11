/**
 * Hardhat configuration — Avalanche C-Chain.
 *
 * Dedicated config for Avalanche deployments, keeping artifacts and
 * cache isolated from the primary Arbitrum/PEAQ hardhat.config.ts.
 *
 * Networks:
 *   hardhat       — local fork of Avalanche C-Chain (uses AVALANCHE_RPC_URL)
 *   avalanche     — Avalanche C-Chain mainnet (43114)
 *   avalancheFuji — Avalanche Fuji testnet (43113)
 *
 * Env vars required for LIVE usage:
 *   AVALANCHE_RPC_URL    — C-Chain RPC endpoint (mainnet or testnet)
 *   SNOWTRACE_API_KEY    — Routescan/Snowtrace API key for verification
 *   DEPLOYER_PK          — 0x-prefixed deployer private key
 *
 * Usage:
 *   npx hardhat compile  --config hardhat.avalanche.ts
 *   npx hardhat test     --config hardhat.avalanche.ts --network hardhat
 *   npx hardhat run scripts/deploy/avalanche/deploy-phase1-fuji.ts \
 *                        --config hardhat.avalanche.ts --network avalancheFuji
 */

import { HardhatUserConfig } from 'hardhat/config';
import '@nomicfoundation/hardhat-toolbox';
import '@nomicfoundation/hardhat-verify';
import 'dotenv/config';

// Both mainnet and Fuji resolve from the same AVALANCHE_RPC_URL env var so
// operators configure a single endpoint. The public fallback differs per network
// so a missing env var still points to the correct chain's public RPC.
const AVALANCHE_RPC_URL =
  process.env.AVALANCHE_RPC_URL || 'https://api.avax.network/ext/bc/C/rpc';

const AVALANCHE_FUJI_DEFAULT = 'https://api.avax-test.network/ext/bc/C/rpc';
const AVALANCHE_FUJI_RPC_URL = process.env.AVALANCHE_RPC_URL || AVALANCHE_FUJI_DEFAULT;

const DEPLOYER_ACCOUNTS: string[] = process.env.DEPLOYER_PK
  ? [process.env.DEPLOYER_PK]
  : process.env.DEPLOYER_PRIVATE_KEY
    ? [process.env.DEPLOYER_PRIVATE_KEY]
    : [];

const config: HardhatUserConfig = {
  solidity: {
    version: '0.8.20',
    settings: {
      optimizer: { enabled: true, runs: 200 },
    },
  },

  networks: {
    hardhat: {
      forking: {
        url: AVALANCHE_RPC_URL,
        enabled: true,
      },
      chainId: 43114,
      accounts: {
        accountsBalance: '100000000000000000000000',
      },
    },

    avalanche: {
      url: AVALANCHE_RPC_URL,
      chainId: 43114,
      accounts: DEPLOYER_ACCOUNTS,
    },

    avalancheFuji: {
      url: AVALANCHE_FUJI_RPC_URL,
      chainId: 43113,
      accounts: DEPLOYER_ACCOUNTS,
    },
  },

  etherscan: {
    apiKey: {
      avalanche: process.env.SNOWTRACE_API_KEY || 'no-key',
      avalancheFuji: process.env.SNOWTRACE_API_KEY || 'no-key',
    },
    customChains: [
      {
        network: 'avalanche',
        chainId: 43114,
        urls: {
          apiURL: 'https://api.routescan.io/v2/network/mainnet/evm/43114/etherscan',
          browserURL: 'https://snowtrace.io',
        },
      },
      {
        network: 'avalancheFuji',
        chainId: 43113,
        urls: {
          apiURL: 'https://api.routescan.io/v2/network/testnet/evm/43113/etherscan',
          browserURL: 'https://testnet.snowtrace.io',
        },
      },
    ],
  },

  paths: {
    sources: './contracts',
    tests: './test',
    cache: './cache_avalanche',
    artifacts: './artifacts_avalanche',
  },

  gasReporter: {
    enabled: process.env.REPORT_GAS === 'true',
    currency: 'USD',
    token: 'AVAX',
  },
};

export default config;
