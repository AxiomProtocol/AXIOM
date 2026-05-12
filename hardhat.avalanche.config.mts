/**
 * Hardhat 3 ESM configuration — Avalanche C-Chain.
 *
 * Must live in the workspace root so H3 sets project root = workspace root,
 * allowing source files in contracts/avalanche/ to be inside the project.
 * (When --config points to a subdir, H3 uses the subdir as project root
 * and rejects files outside it with HHE900.)
 *
 * Root package.json has "type":"module" (required by Hardhat 3).
 *
 * Plugin stack (Hardhat 3 plugin API):
 *   @nomicfoundation/hardhat-toolbox-mocha-ethers  — ethers v6, chai-matchers, mocha, typechain
 *
 * Networks:
 *   hardhat        — in-process EDR-simulated network (default for tests, chainId 43113)
 *   avalancheFuji  — Avalanche Fuji testnet (43113)
 *   avalanche      — Avalanche C-Chain mainnet (43114) [guarded — NOT for Phase 2]
 *
 * Env vars:
 *   AVALANCHE_RPC_URL              — optional override for mainnet RPC
 *   AVALANCHE_FUJI_RPC_URL         — optional override for Fuji RPC
 *   AVALANCHE_DEPLOYER_PRIVATE_KEY — Fuji-only deployer private key
 *   SNOWTRACE_API_KEY              — Routescan API key for contract verification
 *
 * Usage:
 *   npm run compile:avalanche                         — compile all 8 ERC-3643 contracts
 *   npm run test:avalanche                            — run Mocha/ethers test suite
 *   AVALANCHE_PHASE2_REAL_DEPLOY=true npm run deploy:avalanche:fuji
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
    sources:   { solidity: 'contracts/avalanche' },
    tests:     'test/avalanche',
    cache:     'cache/avalanche',
    artifacts: 'artifacts/avalanche',
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
