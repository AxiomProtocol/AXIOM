/**
 * Minimal Hardhat v3 config — treasury contracts only.
 * Supports both 0.8.20 (treasury/axusd/openzeppelin) and 0.8.24 (land/other).
 */
import type { HardhatUserConfig } from 'hardhat/config';
import '@nomicfoundation/hardhat-ethers';

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {
        version: '0.8.20',
        settings: {
          optimizer: { enabled: true, runs: 200 },
          viaIR: true,
          evmVersion: 'paris',
        },
      },
      {
        version: '0.8.24',
        settings: {
          optimizer: { enabled: true, runs: 50 },
          viaIR: true,
          evmVersion: 'cancun',
        },
      },
    ],
  },
  networks: {
    arbitrum: {
      type: 'http',
      url: process.env.ARBITRUM_RPC_URL
        || `https://arb-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`,
      chainId: 42161,
      accounts: process.env.DEPLOYER_PRIVATE_KEY
        ? [process.env.DEPLOYER_PRIVATE_KEY]
        : [],
    },
  },
};

export default config;
