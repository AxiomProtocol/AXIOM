/**
 * Hardhat 3 ESM configuration — Avalanche C-Chain.
 *
 * This config lives in hardhat-avalanche/ so that Avalanche artifacts are
 * isolated from the root Arbitrum/Peaq configuration.
 * hardhat-avalanche/package.json carries "type":"module" so H3 runs in ESM
 * without touching the workspace-root package.json.
 *
 * Directory layout (symlinks keep source-of-truth in workspace root):
 *   hardhat-avalanche/contracts  -> ../contracts/avalanche
 *   hardhat-avalanche/test       -> ../test/avalanche
 *
 * Plugin stack (Hardhat 3 plugin API):
 *   @nomicfoundation/hardhat-toolbox-mocha-ethers  — ethers + chai-matchers + mocha + typechain
 *
 * Networks:
 *   hardhat        — in-process EDR-simulated network (default for tests)
 *   avalancheFuji  — Avalanche Fuji testnet (43113)
 *   avalanche      — Avalanche C-Chain mainnet (43114) [guarded — not for Phase 2]
 *
 * Env vars:
 *   AVALANCHE_RPC_URL              — optional override for mainnet RPC
 *   AVALANCHE_FUJI_RPC_URL         — optional override for Fuji RPC
 *   AVALANCHE_DEPLOYER_PRIVATE_KEY — Fuji-only deployer key
 *   SNOWTRACE_API_KEY              — Routescan API key for verification
 *
 * npm scripts (all run from workspace root):
 *   npm run compile:avalanche
 *   npm run test:avalanche
 *   npm run deploy:avalanche:fuji   (requires AVALANCHE_PHASE2_REAL_DEPLOY=true)
 */

import hardhatToolboxMochaEthers from '@nomicfoundation/hardhat-toolbox-mocha-ethers';
import { defineConfig } from 'hardhat/config';
import 'dotenv/config';

const FUJI_RPC =
  process.env.AVALANCHE_FUJI_RPC_URL ??
  process.env.AVALANCHE_RPC_URL ??
  'https://api.avax-test.network/ext/bc/C/rpc';

const MAINNET_RPC =
  process.env.AVALANCHE_RPC_URL ??
  'https://api.avax.network/ext/bc/C/rpc';

const DEPLOYER_ACCOUNTS: string[] =
  process.env.AVALANCHE_DEPLOYER_PRIVATE_KEY
    ? [process.env.AVALANCHE_DEPLOYER_PRIVATE_KEY]
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
      chainId: 43113,
      accounts: {
        accountsBalance: '10000000000000000000000',
      },
    },

    avalancheFuji: {
      type: 'http',
      chainId:  43113,
      url:      FUJI_RPC,
      accounts: DEPLOYER_ACCOUNTS,
    },

    avalanche: {
      type: 'http',
      chainId:  43114,
      url:      MAINNET_RPC,
      accounts: DEPLOYER_ACCOUNTS,
    },
  },
});
