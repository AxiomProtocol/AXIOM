import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@nomicfoundation/hardhat-verify";
import * as dotenv from "dotenv";

dotenv.config();

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      viaIR: true,
      evmVersion: "paris",
    },
  },
  networks: {
    hardhat: {
      forking: {
        url: process.env.ARBITRUM_RPC_URL || `https://arb-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`,
        enabled: true,
      },
      chainId: 31337,
    },
    arbitrum: {
      url: process.env.ARBITRUM_RPC_URL || `https://arb-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`,
      chainId: 42161,
      accounts: process.env.DEPLOYER_PK ? [process.env.DEPLOYER_PK] : (process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : []),
    },
  },
  etherscan: {
    apiKey: {
      arbitrumOne: process.env.ARBISCAN_API_KEY || "no-api-key-needed",
    },
    customChains: [
      {
        network: "arbitrumOne",
        chainId: 42161,
        urls: {
          apiURL: "https://arbitrum.blockscout.com/api",
          browserURL: "https://arbitrum.blockscout.com",
        },
      },
    ],
  },
  paths: {
    sources: "./contracts-capital-bridge",
    tests: "./test",
    cache: "./cache-capital-bridge",
    artifacts: "./artifacts-capital-bridge",
  },
  mocha: {
    timeout: 120000,
  },
};

export default config;
