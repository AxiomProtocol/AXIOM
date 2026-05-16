/**
 * Hardhat 3 ESM configuration — Polygon PoS.
 *
 * Isolated from the root Arbitrum config and the hardhat-avalanche workspace.
 * hardhat-polygon/package.json carries "type":"module" so H3 runs in ESM.
 *
 * Directory layout (symlinks keep source-of-truth in workspace root):
 *   hardhat-polygon/contracts  -> ../contracts/polygon
 *   hardhat-polygon/test       -> ../test/polygon
 *
 * Networks:
 *   hardhat       — in-process EDR-simulated network (default for tests)
 *   polygonAmoy   — Polygon Amoy testnet (chainId 80002) — active testnet
 *   polygon       — Polygon PoS mainnet (chainId 137)
 *
 * Env vars:
 *   POLYGON_RPC_URL              — optional override for mainnet RPC
 *   POLYGON_AMOY_RPC_URL         — optional override for Amoy testnet RPC
 *   DEPLOYER_PRIVATE_KEY         — deployer key (shared with Arbitrum/Avalanche)
 *   POLYGONSCAN_API_KEY          — Polygonscan API key for contract verification
 *
 * npm scripts (run from workspace root):
 *   npm run compile:polygon
 *   npm run test:polygon
 *   npm run deploy:polygon:amoy      (requires POLYGON_AMOY_REAL_DEPLOY=true)
 *   npm run deploy:polygon:mainnet   (requires POLYGON_MAINNET_REAL_DEPLOY=true)
 */

import hardhatToolboxMochaEthers from '@nomicfoundation/hardhat-toolbox-mocha-ethers';
import { defineConfig } from 'hardhat/config';
import 'dotenv/config';

const AMOY_RPC =
  process.env.POLYGON_AMOY_RPC_URL ??
  process.env.POLYGON_RPC_URL ??
  'https://rpc-amoy.polygon.technology';

const MAINNET_RPC =
  process.env.POLYGON_RPC_URL ??
  'https://polygon-rpc.com';

const DEPLOYER_ACCOUNTS: string[] =
  process.env.DEPLOYER_PRIVATE_KEY
    ? [process.env.DEPLOYER_PRIVATE_KEY]
    : [];

export default defineConfig({
  plugins: [hardhatToolboxMochaEthers],

  solidity: {
    profiles: {
      default: {
        version: '0.8.24',
        settings: {
          optimizer: { enabled: true, runs: 200 },
          evmVersion: 'paris',
        },
      },
    },
  },

  paths: {
    sources:   { solidity: 'contracts' },
    tests:     'test',
    cache:     'cache',
    artifacts: 'artifacts',
  },

  networks: {
    hardhat: {
      type: 'edr-simulated',
      chainId: 80002,
      accounts: {
        accountsBalance: '10000000000000000000000',
      },
    },

    polygonAmoy: {
      type: 'http',
      chainId:  80002,
      url:      AMOY_RPC,
      accounts: DEPLOYER_ACCOUNTS,
    },

    polygon: {
      type: 'http',
      chainId:  137,
      url:      MAINNET_RPC,
      accounts: DEPLOYER_ACCOUNTS,
    },
  },

  etherscan: {
    apiKey: {
      polygonAmoy: process.env.POLYGONSCAN_API_KEY ?? '',
      polygon:     process.env.POLYGONSCAN_API_KEY ?? '',
    },
    customChains: [
      {
        network:  'polygonAmoy',
        chainId:  80002,
        urls: {
          apiURL:     'https://api-amoy.polygonscan.com/api',
          browserURL: 'https://amoy.polygonscan.com',
        },
      },
      {
        network:  'polygon',
        chainId:  137,
        urls: {
          apiURL:     'https://api.polygonscan.com/api',
          browserURL: 'https://polygonscan.com',
        },
      },
    ],
  },
});
